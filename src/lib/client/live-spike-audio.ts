/**
 * Audio capture and playback utilities for the Gemini Live WebSocket integration.
 * Handles 16kHz PCM microphone input streaming and 24kHz PCM Gemini Live audio scheduling.
 *
 * Implements conversational turn synchronization:
 * - Generation ID tracking to eliminate stale audio playback across reconnects and interruptions.
 * - Queue backlog monitoring and Web Audio drift prevention.
 * - Isolated silent gain loopback to prevent microphone acoustic feedback to speakers.
 * - Reduced capture buffer size (2048 samples, ~42ms) for lower turnaround latency.
 */

export function downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const s = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }

  return result;
}

export function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface LiveAudioPlayerOptions {
  onLevelChange?: (level: number) => void;
  onPlaybackEnd?: () => void;
  onFirstBufferPlayed?: () => void;
}

export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onLevelChange?: (level: number) => void;
  private onPlaybackEnd?: () => void;
  private onFirstBufferPlayed?: () => void;

  private currentConnectionGen = 0;
  private currentTurnGen = 0;
  private isInterrupted = false;
  private hasReportedFirstBuffer = false;

  constructor(
    optionsOrLevelChange?: ((level: number) => void) | LiveAudioPlayerOptions,
    maybePlaybackEnd?: () => void
  ) {
    if (typeof optionsOrLevelChange === "function") {
      this.onLevelChange = optionsOrLevelChange;
      this.onPlaybackEnd = maybePlaybackEnd;
    } else if (optionsOrLevelChange) {
      this.onLevelChange = optionsOrLevelChange.onLevelChange;
      this.onPlaybackEnd = optionsOrLevelChange.onPlaybackEnd;
      this.onFirstBufferPlayed = optionsOrLevelChange.onFirstBufferPlayed;
    }
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.nextPlayTime = 0;
    }
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Begins a new turn for model responses.
   * Clears the interrupted flag and resets the first-buffer timing flag.
   */
  public beginNewTurn(turnGen?: number): void {
    if (turnGen !== undefined) {
      this.currentTurnGen = turnGen;
    }
    this.isInterrupted = false;
    this.hasReportedFirstBuffer = false;
  }

  /**
   * Sets the connection generation to tie playback strictly to the active session attempt.
   */
  public setConnectionGeneration(gen: number): void {
    this.currentConnectionGen = gen;
    this.currentTurnGen = 0;
    this.isInterrupted = false;
    this.hasReportedFirstBuffer = false;
  }

  /**
   * Schedules a 24kHz PCM chunk for sequential gapless playback.
   * If connectionGen or turnGen do not match, the chunk is dropped to prevent stale audio.
   */
  public playPcmChunk(
    base64Pcm24k: string,
    connectionGen?: number,
    turnGen?: number
  ): void {
    // Drop chunks from older connections
    if (connectionGen !== undefined && connectionGen !== this.currentConnectionGen) {
      return;
    }

    // Drop chunks if currently in interrupted state or from older turns
    if (this.isInterrupted) {
      return;
    }
    if (turnGen !== undefined && turnGen < this.currentTurnGen) {
      return;
    }
    if (turnGen !== undefined && turnGen > this.currentTurnGen) {
      this.currentTurnGen = turnGen;
    }

    try {
      const ctx = this.ensureContext();
      const rawBuffer = base64ToArrayBuffer(base64Pcm24k);
      const int16Array = new Int16Array(rawBuffer);

      if (int16Array.length === 0) return;

      const float32Data = new Float32Array(int16Array.length);
      let sumSquares = 0;
      for (let i = 0; i < int16Array.length; i++) {
        const normalized = int16Array[i] / 32768.0;
        float32Data[i] = normalized;
        sumSquares += normalized * normalized;
      }

      if (this.onLevelChange) {
        const rms = Math.sqrt(sumSquares / int16Array.length);
        this.onLevelChange(Math.min(1, rms * 4));
      }

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      // If nextPlayTime has fallen into the past (e.g. after pause), snap to currentTime
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      if (!this.hasReportedFirstBuffer) {
        this.hasReportedFirstBuffer = true;
        this.onFirstBufferPlayed?.();
      }

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          if (this.onLevelChange) {
            this.onLevelChange(0);
          }
          if (this.onPlaybackEnd) {
            this.onPlaybackEnd();
          }
        }
      };
    } catch (err) {
      console.error("[LiveAudioPlayer] Playback error:", err);
    }
  }

  /**
   * Immediately halts playback of all currently playing and scheduled buffers.
   * Increments turn generation so in-flight chunks are dropped.
   */
  public interrupt(): void {
    this.isInterrupted = true;
    this.currentTurnGen += 1;

    for (const source of this.activeSources) {
      try {
        source.onended = null; // Detach callback before stopping to avoid spurious events
        source.stop(0);
        source.disconnect();
      } catch {}
    }
    this.activeSources.clear();

    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
    if (this.onLevelChange) {
      this.onLevelChange(0);
    }
    if (this.onPlaybackEnd) {
      this.onPlaybackEnd();
    }
  }

  /**
   * Returns milliseconds of audio scheduled into the future (playback queue backlog).
   */
  public getQueueDurationMs(): number {
    if (!this.audioCtx) return 0;
    return Math.max(0, Math.round((this.nextPlayTime - this.audioCtx.currentTime) * 1000));
  }

  /**
   * Returns true if audio is actively playing or queued to play.
   */
  public isPlaying(): boolean {
    if (!this.audioCtx) return false;
    return this.activeSources.size > 0 && this.nextPlayTime > this.audioCtx.currentTime;
  }

  /**
   * Closes audio context and invalidates all generation tokens.
   */
  public close(): void {
    this.currentConnectionGen += 1;
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export interface LiveMicRecorderOptions {
  onAudioChunk: (base64Pcm16k: string) => void;
  onLevelChange?: (level: number) => void;
  onChunkSent?: (intervalMs: number) => void;
  onSpeechEnd?: () => void;
}

export class LiveMicRecorder {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private muteNode: GainNode | null = null;
  private isMuted = false;
  private onAudioChunk: (base64Pcm16k: string) => void;
  private onLevelChange?: (level: number) => void;
  private onChunkSent?: (intervalMs: number) => void;
  private onSpeechEnd?: () => void;

  private lastChunkTime = 0;
  private isUserSpeaking = false;
  private silenceStartTime = 0;

  constructor(
    optionsOrChunk: ((base64Pcm16k: string) => void) | LiveMicRecorderOptions,
    maybeLevelChange?: (level: number) => void
  ) {
    if (typeof optionsOrChunk === "function") {
      this.onAudioChunk = optionsOrChunk;
      this.onLevelChange = maybeLevelChange;
    } else {
      this.onAudioChunk = optionsOrChunk.onAudioChunk;
      this.onLevelChange = optionsOrChunk.onLevelChange;
      this.onChunkSent = optionsOrChunk.onChunkSent;
      this.onSpeechEnd = optionsOrChunk.onSpeechEnd;
    }
  }

  public async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

    // Buffer size 2048 gives approx 42.7ms at 48kHz (or 46.4ms at 44.1kHz).
    // Cuts capture latency in half compared to 4096 (~85ms) while remaining rock-solid across browsers.
    this.processor = this.audioCtx.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isMuted) {
        if (this.onLevelChange) this.onLevelChange(0);
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate RMS for level meter & speech activity estimation
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);
      const level = Math.min(1, rms * 5);
      if (this.onLevelChange) {
        this.onLevelChange(level);
      }

      // Track speech end estimation for latency diagnostics
      const now = performance.now();
      if (level > 0.05) {
        this.isUserSpeaking = true;
        this.silenceStartTime = 0;
      } else if (this.isUserSpeaking) {
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime > 350) {
          // Detected user speech end (350ms of quiet after speaking)
          this.isUserSpeaking = false;
          this.silenceStartTime = 0;
          this.onSpeechEnd?.();
        }
      }

      // Record chunk send interval for diagnostics
      if (this.lastChunkTime > 0 && this.onChunkSent) {
        this.onChunkSent(Math.round(now - this.lastChunkTime));
      }
      this.lastChunkTime = now;

      // Downsample to 16kHz PCM
      const pcm16 = downsampleTo16k(inputData, this.audioCtx!.sampleRate);
      const base64 = arrayBufferToBase64(pcm16.buffer);
      this.onAudioChunk(base64);
    };

    this.sourceNode.connect(this.processor);

    // CRITICAL: Connect processor to a silent GainNode (gain = 0), NOT directly to audioCtx.destination!
    // This keeps the ScriptProcessorNode active in Chrome/Safari Web Audio graph without ever
    // leaking microphone audio to the speakers or creating acoustic feedback!
    this.muteNode = this.audioCtx.createGain();
    this.muteNode.gain.value = 0;
    this.processor.connect(this.muteNode);
    this.muteNode.connect(this.audioCtx.destination);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted && this.onLevelChange) {
      this.onLevelChange(0);
    }
  }

  public stop(): void {
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.muteNode) {
      this.muteNode.disconnect();
      this.muteNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    if (this.onLevelChange) {
      this.onLevelChange(0);
    }
  }
}

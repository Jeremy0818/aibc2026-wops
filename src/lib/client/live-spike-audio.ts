/**
 * Audio capture and playback utilities for the Gemini Live WebSocket spike.
 * Handles 16kHz PCM input streaming and 24kHz PCM output scheduling.
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

export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onLevelChange?: (level: number) => void;

  constructor(onLevelChange?: (level: number) => void) {
    this.onLevelChange = onLevelChange;
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.nextPlayTime = 0;
    }
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playPcmChunk(base64Pcm24k: string): void {
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
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && this.onLevelChange) {
          this.onLevelChange(0);
        }
      };
    } catch (err) {
      console.error("[LiveAudioPlayer] Playback error:", err);
    }
  }

  public interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
    if (this.onLevelChange) {
      this.onLevelChange(0);
    }
  }

  public close(): void {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export class LiveMicRecorder {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isMuted = false;
  private onAudioChunk: (base64Pcm16k: string) => void;
  private onLevelChange?: (level: number) => void;

  constructor(
    onAudioChunk: (base64Pcm16k: string) => void,
    onLevelChange?: (level: number) => void
  ) {
    this.onAudioChunk = onAudioChunk;
    this.onLevelChange = onLevelChange;
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

    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
    // Buffer size 4096 gives approx 85ms buffer at 48kHz
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isMuted) {
        if (this.onLevelChange) this.onLevelChange(0);
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate RMS for visual feedback
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);
      if (this.onLevelChange) {
        this.onLevelChange(Math.min(1, rms * 5));
      }

      // Convert to 16kHz PCM
      const pcm16 = downsampleTo16k(inputData, this.audioCtx!.sampleRate);
      const base64 = arrayBufferToBase64(pcm16.buffer);
      this.onAudioChunk(base64);
    };

    this.sourceNode.connect(this.processor);
    // Connect to destination to keep script processor alive in Chrome/Safari
    this.processor.connect(this.audioCtx.destination);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
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

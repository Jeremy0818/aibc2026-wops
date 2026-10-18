"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { GoogleGenAI, Modality } from "@google/genai";
import { LiveAudioPlayer, LiveMicRecorder } from "@/lib/client/live-spike-audio";

type ConnectionStatus =
  | "disconnected"
  | "requesting_token"
  | "connecting"
  | "connected"
  | "error";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "gemini";
  message: string;
}

const SYSTEM_INSTRUCTION = `You are WOPS!, a friendly and concise pre-meeting thinking partner.
For this experiment, talk with a Creative Campaign Planner preparing for a fictional KOVA coffee campaign meeting.
Ask short, relevant questions about campaign objectives, audience, channel choices, and KPIs.
Do not claim client facts that have not been provided.
Keep responses conversational and suitable for voice.`;

const MODEL_ID = "models/gemini-2.5-flash-native-audio-latest";

export default function GeminiLiveSpikePage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [geminiSpeaking, setGeminiSpeaking] = useState(false);
  const [userLevel, setUserLevel] = useState(0);
  const [geminiLevel, setGeminiLevel] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tokenMeta, setTokenMeta] = useState<{
    tokenPrefix?: string;
    model?: string;
    expireTime?: string;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveMicRecorder | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
    setLogs((prev) => [
      ...prev.slice(-150),
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: time,
        type,
        message,
      },
    ]);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDisconnect = useCallback(() => {
    addLog("Disconnecting session and releasing audio devices...", "warning");
    isConnectedRef.current = false;

    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.close();
      audioPlayerRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn("Error closing session:", e);
      }
      sessionRef.current = null;
    }

    setStatus("disconnected");
    setMicActive(false);
    setGeminiSpeaking(false);
    setUserLevel(0);
    setGeminiLevel(0);
    addLog("Disconnected clean.", "info");
  }, [addLog]);

  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  const handleConnect = async () => {
    setErrorMessage(null);
    setStatus("requesting_token");
    addLog("1. Minting ephemeral token from server /api/dev/live-token...", "info");

    try {
      const tokenRes = await fetch("/api/dev/live-token", {
        method: "POST",
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || `HTTP ${tokenRes.status} token mint failed`
        );
      }

      const { token, model, expireTime } = await tokenRes.json();
      setTokenMeta({
        tokenPrefix: token ? `${token.substring(0, 16)}...` : undefined,
        model,
        expireTime,
      });

      addLog(`2. Ephemeral token granted: ${token.substring(0, 18)}...`, "success");
      addLog(`Model: ${model}`, "info");

      setStatus("connecting");
      addLog("3. Initializing Live Audio Player and Recorder...", "info");

      // Initialize audio player
      audioPlayerRef.current = new LiveAudioPlayer((lvl) => {
        setGeminiLevel(lvl);
      });

      // Initialize mic recorder
      recorderRef.current = new LiveMicRecorder(
        (base64Chunk) => {
          if (isConnectedRef.current && sessionRef.current) {
            try {
              sessionRef.current.sendRealtimeInput({
                media: {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Chunk,
                },
              });
            } catch (err) {
              console.error("sendRealtimeInput error:", err);
            }
          }
        },
        (lvl) => {
          setUserLevel(lvl);
        }
      );

      addLog("4. Requesting microphone permission from browser...", "info");
      await recorderRef.current.start();
      setMicActive(true);
      addLog("Microphone streaming active (16kHz PCM downsampler).", "success");

      addLog("5. Connecting client WebSocket to Gemini Live via @google/genai...", "info");
      const client = new GoogleGenAI({
        apiKey: token,
        apiVersion: "v1alpha",
      });

      const session = await client.live.connect({
        model: MODEL_ID,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
        },
        callbacks: {
          onopen: () => {
            addLog("⚡ [WebSocket onopen] Gemini Live WebSocket connection established!", "success");
            isConnectedRef.current = true;
            setStatus("connected");
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onmessage: (msg: any) => {
            const serverContent = msg?.serverContent;
            if (!serverContent) {
              if (msg?.setupComplete) {
                addLog("✓ [setupComplete received] Gemini is ready for audio.", "success");
              }
              return;
            }

            if (serverContent.interrupted) {
              addLog("⚡ [Barge-in / Interrupted] Gemini speech halted by client input.", "warning");
              audioPlayerRef.current?.interrupt();
              setGeminiSpeaking(false);
              setGeminiLevel(0);
            }

            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
                  setGeminiSpeaking(true);
                  audioPlayerRef.current?.playPcmChunk(part.inlineData.data);
                }
                if (part.text) {
                  addLog(`Gemini: ${part.text}`, "gemini");
                }
              }
            }

            if (serverContent.turnComplete) {
              addLog("✓ [Gemini turn complete]", "info");
              setGeminiSpeaking(false);
              setTurnCount((c) => c + 1);
            }
          },
          onerror: (err: unknown) => {
            const errStr = err instanceof Error ? err.message : JSON.stringify(err);
            addLog(`WebSocket error: ${errStr}`, "error");
            setErrorMessage(errStr);
            setStatus("error");
          },
          onclose: (closeEvent: unknown) => {
            addLog(`WebSocket closed: ${JSON.stringify(closeEvent)}`, "warning");
            handleDisconnect();
          },
        },
      });

      sessionRef.current = session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Connection failed: ${msg}`, "error");
      setErrorMessage(msg);
      setStatus("error");
      handleDisconnect();
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    recorderRef.current?.setMuted(next);
    addLog(`Microphone ${next ? "MUTED" : "UNMUTED"}.`, next ? "warning" : "info");
  };

  const sendKickoffPrompt = () => {
    if (!sessionRef.current || !isConnectedRef.current) return;
    addLog("Sending kickoff text prompt to start conversation...", "info");
    try {
      sessionRef.current.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: "Hi WOPS!, I am Nadia, Creative Campaign Planner for the KOVA coffee campaign. Let's start preparing for the meeting.",
              },
            ],
          },
        ],
        turnComplete: true,
      });
      addLog("Kickoff sent! Waiting for Gemini audio response...", "success");
    } catch (err) {
      addLog(`Failed to send kickoff: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PROTOTYPE SPIKE
              </span>
              <h1 className="text-xl font-bold tracking-tight">Gemini Live Real-Time Voice</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Direct bidirectional audio over WebSocket via ephemeral tokens. Isolated proof of concept.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/meetings"
              className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
            >
              Back to WOPS! App
            </Link>
          </div>
        </div>

        {/* Security / Architecture Card */}
        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/60 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            Security & Token Architecture
          </div>
          <p>
            Primary <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">GEMINI_API_KEY</code> is kept strictly on the server.
            When connecting, the client requests a single-use ephemeral token from <code className="bg-slate-950 px-1 py-0.5 rounded text-blue-300">/api/dev/live-token</code>,
            which constrains connections to <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300">{MODEL_ID}</code> with audio output only.
          </p>
          {tokenMeta && (
            <div className="mt-2 pt-2 border-t border-slate-700/40 grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px] text-slate-400">
              <div>Token: <span className="text-emerald-400">{tokenMeta.tokenPrefix}</span></div>
              <div>Model: <span className="text-indigo-300">{tokenMeta.model}</span></div>
              <div>Expires: <span className="text-amber-300">{new Date(tokenMeta.expireTime || "").toLocaleTimeString()}</span></div>
            </div>
          )}
        </div>

        {/* Status Indicators & Control Center */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status Card */}
          <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Connection Status
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    status === "connected"
                      ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse"
                      : status === "connecting" || status === "requesting_token"
                      ? "bg-amber-500 animate-ping"
                      : status === "error"
                      ? "bg-rose-500"
                      : "bg-slate-600"
                  }`}
                />
                <div className="text-base font-bold capitalize">
                  {status === "requesting_token"
                    ? "Minting Token..."
                    : status === "connecting"
                    ? "Connecting..."
                    : status}
                </div>
              </div>
              {errorMessage && (
                <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/50">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-col gap-2">
              {status === "disconnected" || status === "error" ? (
                <button
                  onClick={handleConnect}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-semibold text-sm rounded-lg shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 11.5v-7l5 3.5-5 3.5z" />
                  </svg>
                  Connect to Gemini Live
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 font-semibold text-sm rounded-lg transition-all"
                >
                  Disconnect Session
                </button>
              )}
            </div>
          </div>

          {/* User Mic Card */}
          <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  User Microphone
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isMuted
                      ? "bg-amber-500/20 text-amber-300"
                      : micActive
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {isMuted ? "MUTED" : micActive ? "16kHz PCM" : "IDLE"}
                </span>
              </div>

              {/* Mic volume bar */}
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Input Level</span>
                  <span>{Math.round(userLevel * 100)}%</span>
                </div>
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      isMuted ? "bg-slate-600" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, userLevel * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/60 flex gap-2">
              <button
                onClick={toggleMute}
                disabled={status !== "connected"}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  isMuted
                    ? "bg-amber-600/30 border-amber-500 text-amber-200 hover:bg-amber-600/40"
                    : "bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isMuted ? "Unmute Mic" : "Mute Mic"}
              </button>
              <button
                onClick={sendKickoffPrompt}
                disabled={status !== "connected"}
                className="py-2 px-3 text-xs font-medium rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500 text-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Send a text trigger to kick off conversation"
              >
                Say Hello
              </button>
            </div>
          </div>

          {/* Gemini Speaker Card */}
          <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Gemini Audio Output
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    geminiSpeaking
                      ? "bg-indigo-500/20 text-indigo-300 animate-pulse"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {geminiSpeaking ? "SPEAKING" : "LISTENING"}
                </span>
              </div>

              {/* Gemini volume bar */}
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Output Level (24kHz)</span>
                  <span>{Math.round(geminiLevel * 100)}%</span>
                </div>
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, geminiLevel * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
              <span>Completed Turns:</span>
              <span className="font-mono text-base font-bold text-slate-200">{turnCount}</span>
            </div>
          </div>
        </div>

        {/* Live Event Log */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[340px]">
          <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-xs font-semibold text-slate-300">Live Diagnostic Event Stream</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear Log
            </button>
          </div>

          <div
            ref={logContainerRef}
            className="flex-1 p-3 overflow-y-auto font-mono text-[12px] space-y-1 select-text"
          >
            {logs.length === 0 ? (
              <div className="text-slate-600 italic py-8 text-center">
                Click &quot;Connect to Gemini Live&quot; to begin stream.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-relaxed flex items-start gap-2 ${
                    log.type === "error"
                      ? "text-rose-400 bg-rose-950/20 px-1 py-0.5 rounded"
                      : log.type === "success"
                      ? "text-emerald-400"
                      : log.type === "warning"
                      ? "text-amber-300"
                      : log.type === "gemini"
                      ? "text-indigo-300"
                      : "text-slate-300"
                  }`}
                >
                  <span className="text-slate-600 text-[10px] shrink-0">{log.timestamp}</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions / Test Walkthrough */}
        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-slate-200">How to test bidirectional conversation:</div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Click <strong className="text-slate-200">Connect to Gemini Live</strong> and grant microphone permission when prompted.</li>
            <li>Speak directly into your microphone (e.g. <em>&quot;Hello, I&apos;m preparing the campaign strategy for KOVA coffee.&quot;</em>).</li>
            <li>Listen as Gemini responds naturally in real time with native 24kHz voice.</li>
            <li>While Gemini is speaking, speak over it — notice the barge-in/interruption event immediately halting Gemini audio output.</li>
            <li>Test the <strong className="text-slate-200">Mute Mic</strong> button and verify audio stops transmitting.</li>
            <li>Test <strong className="text-slate-200">Disconnect Session</strong> and verify all audio devices and sockets are released cleanly.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

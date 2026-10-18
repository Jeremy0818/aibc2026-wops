/**
 * Audio Hardware & Microphone Permission Utility
 *
 * Explicitly separates real browser media streams from simulated dialogue.
 * Acquired media tracks are tracked and cleanly stopped upon cancellation or unmount.
 */

export type MicPermissionStatus =
  | "untested"
  | "checking"
  | "granted"
  | "denied"
  | "missing_device"
  | "unsupported";

export interface MicTestResult {
  status: MicPermissionStatus;
  stream: MediaStream | null;
  errorMessage?: string;
  hasAudioInput: boolean;
}

/**
 * Checks whether the browser supports media devices.
 */
export function isMediaDevicesSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    navigator?.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/**
 * Requests actual microphone access from the browser.
 * Only invoked when the user explicitly triggers a hardware test or live input.
 */
export async function testMicrophoneHardware(): Promise<MicTestResult> {
  if (!isMediaDevicesSupported()) {
    return {
      status: "unsupported",
      stream: null,
      hasAudioInput: false,
      errorMessage: "Browser media devices API is not supported in this environment.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });

    return {
      status: "granted",
      stream,
      hasAudioInput: true,
    };
  } catch (err: unknown) {
    const error = err as Error & { name?: string };

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return {
        status: "denied",
        stream: null,
        hasAudioInput: false,
        errorMessage:
          "Microphone permission was denied. Please allow microphone access in your browser settings to test audio hardware.",
      };
    }

    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return {
        status: "missing_device",
        stream: null,
        hasAudioInput: false,
        errorMessage:
          "No microphone input device was detected on your system.",
      };
    }

    return {
      status: "denied",
      stream: null,
      hasAudioInput: false,
      errorMessage:
        error.message || "Unable to acquire microphone access.",
    };
  }
}

/**
 * Safely stops all active tracks in a MediaStream to release hardware.
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
  } catch {
    // Ignore teardown errors
  }
}

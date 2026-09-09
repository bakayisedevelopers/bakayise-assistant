/**
 * Dual-Mode Audio Capture Engine
 * Mode 1: Microphone (External / Ambient Sound) for sermons, classrooms, or reading out loud.
 * Mode 2: System / Device Audio for audiobooks, podcasts, or videos playing on the device.
 *
 * Privacy & Security: Audio data is processed in-memory and NEVER uploaded to cloud storage.
 */

export type AudioSourceType = 'mic' | 'system';

export interface AudioCaptureController {
  stop: () => Promise<Blob | null>;
  cancel: () => void;
  getVolume: () => number; // 0 to 100 for live visualizer
}

export interface SpeechRecognitionResultHandler {
  onTranscript: (interim: string, final: string) => void;
  onError?: (err: any) => void;
}

export interface AudioCaptureResult {
  controller: AudioCaptureController;
  stream: MediaStream;
  fallbackToMic?: boolean;
}

/**
 * Checks if getDisplayMedia is available in the current browser & frame context
 */
export function isSystemAudioSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator?.mediaDevices) {
    return false;
  }
  if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
    return false;
  }

  // Check Permissions Policy if available
  try {
    const policy = (document as any)?.permissionsPolicy || (document as any)?.featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      if (!policy.allowsFeature('display-capture')) {
        return false;
      }
    }
  } catch {}

  return true;
}

/**
 * Checks if getUserMedia (microphone) is available in the current context
 */
export function isMicSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator?.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Starts audio recording with live waveform frequency analysis.
 */
export async function startAudioCapture(
  source: AudioSourceType,
  onVisualizerTick?: (volume: number) => void
): Promise<AudioCaptureResult> {
  let stream!: MediaStream;
  let fallbackToMic = false;

  if (source === 'system') {
    if (isSystemAudioSupported()) {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Check if user shared audio
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          // User didn't check "Share tab audio" or system audio
          stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });

          if (isMicSupported()) {
            fallbackToMic = true;
          } else {
            throw new Error(
              'No audio track detected in screen capture. Please check "Share tab audio" or use microphone.'
            );
          }
        } else {
          // Stop video tracks immediately so we only capture audio
          stream.getVideoTracks().forEach((vt) => {
            try {
              vt.stop();
            } catch {}
          });
        }
      } catch (err: any) {
        // When user cancels screen picker, or browser permissions-policy denies display-capture:
        if (isMicSupported()) {
          console.info('Display audio not available or cancelled; continuing seamlessly via microphone.');
          fallbackToMic = true;
        } else {
          throw new Error('Screen or tab audio sharing was cancelled or denied, and microphone is not available.');
        }
      }
    } else {
      // getDisplayMedia is not available in this frame/browser
      if (isMicSupported()) {
        fallbackToMic = true;
      } else {
        throw new Error(
          'Audio capture is not available in this embedded window or browser. Please ensure microphone permissions are granted.'
        );
      }
    }

    if (fallbackToMic) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (micErr: any) {
        if (micErr?.name === 'NotAllowedError' || micErr?.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission was denied. Please allow microphone access in your browser.');
        }
        throw new Error(micErr?.message || 'Could not access audio device.');
      }
    }
  } else {
    // Mode: mic
    if (!isMicSupported()) {
      throw new Error(
        'Microphone recording is not supported in this browser or security context. Please check your browser permissions.'
      );
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser.');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No microphone device found on this system.');
      }
      throw new Error(err.message || 'Could not access microphone.');
    }
  }

  // Set up Web Audio API Analyser for live visualizer
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animFrameId: number | null = null;
  let currentVolume = 0;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
      const sourceNode = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize roughly to 0 - 100
        currentVolume = Math.min(100, Math.round((average / 128) * 100));
        if (onVisualizerTick) {
          onVisualizerTick(currentVolume);
        }
        animFrameId = requestAnimationFrame(tick);
      };

      animFrameId = requestAnimationFrame(tick);
    }
  } catch (err) {
    console.warn('AudioContext visualizer setup failed, continuing without visualizer:', err);
  }

  // Setup MediaRecorder
  let mediaRecorder: MediaRecorder | null = null;
  const chunks: BlobPart[] = [];

  let mimeType = '';
  if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }
  }

  try {
    if (typeof MediaRecorder !== 'undefined') {
      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      mediaRecorder.start(1000); // chunk every 1s
    }
  } catch (err) {
    console.warn('MediaRecorder init failed, continuing streaming only:', err);
  }

  const cleanup = () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  };

  const controller: AudioCaptureController = {
    getVolume: () => currentVolume,
    stop: async () => {
      return new Promise<Blob | null>((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          cleanup();
          resolve(null);
          return;
        }

        mediaRecorder.onstop = () => {
          cleanup();
          const recordedBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          resolve(recordedBlob);
        };

        try {
          mediaRecorder.stop();
        } catch {
          cleanup();
          resolve(null);
        }
      });
    },
    cancel: () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch {}
      }
      cleanup();
    },
  };

  return { controller, stream, fallbackToMic };
}

/**
 * Initializes browser Web Speech Recognition for live speech-to-text transcript.
 */
export function startLiveSpeechRecognition(
  handler: SpeechRecognitionResultHandler
): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.info('Web Speech Recognition API is not supported in this browser.');
    return null;
  }

  let recognition: any;
  try {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-ZA'; // default to South African English, fallbacks to en-US

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      handler.onTranscript(interimTranscript.trim(), finalTranscript.trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && handler.onError) {
        handler.onError(event.error);
      }
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
    };
  } catch (err) {
    if (handler.onError) handler.onError(err);
    return null;
  }
}

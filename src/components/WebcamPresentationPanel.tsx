// ============================================================================
// INTERVIEWX AI — OBSERVABLE PRESENTATION INDICATORS (MEDIAPIPE, IN-BROWSER)
// Real MediaPipe FaceLandmarker + PoseLandmarker loaded from CDN, running 100%
// locally via WASM/WebGL. Raw video frames never leave the machine; nothing is
// recorded or stored. Reports ONLY observable presentation indicators (framing,
// approximate gaze direction, shoulder/posture alignment) — never confidence,
// emotion, honesty or personality. Falls back to a luminance heuristic if the
// CDN / WASM runtime is unreachable so the panel stays functional offline.
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ShieldCheck, Sliders, Eye, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import {
  ObservablePresentationInput,
  ObservablePresentationResult,
  evaluatePresentationMetrics,
} from '../utils/interviewRules';

interface WebcamPresentationPanelProps {
  cameraEnabled: boolean;
  consentGranted: boolean;
  onGrantConsent: () => void;
  onToggleCamera: () => void;
  onMetricsUpdate: (result: ObservablePresentationResult) => void;
}

const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

type MpStatus = 'idle' | 'loading' | 'active' | 'unavailable';

// Landmark indices (MediaPipe FaceMesh 478 / Pose 33)
const NOSE_TIP = 1;
const FACE_LEFT = 234;
const FACE_RIGHT = 454;
const POSE_LEFT_SHOULDER = 11;
const POSE_RIGHT_SHOULDER = 12;

function ema(prev: number, next: number, alpha = 0.15): number {
  return prev * (1 - alpha) + next * alpha;
}

export const WebcamPresentationPanel: React.FC<WebcamPresentationPanelProps> = ({
  cameraEnabled,
  consentGranted,
  onGrantConsent,
  onToggleCamera,
  onMetricsUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mpStatus, setMpStatus] = useState<MpStatus>('idle');
  const [rawInput, setRawInput] = useState<ObservablePresentationInput>({
    faceVisible: true,
    gazeCenteredRatio: 0.88,
    headStabilityRatio: 0.86,
    shoulderAlignmentRatio: 0.9,
    postureStabilityRatio: 0.89,
    excessiveMovement: false,
  });
  const [showCalibrator, setShowCalibrator] = useState(false);

  const evaluation = evaluatePresentationMetrics(rawInput);

  useEffect(() => {
    onMetricsUpdate(evaluation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rawInput.faceVisible,
    rawInput.gazeCenteredRatio,
    rawInput.headStabilityRatio,
    rawInput.shoulderAlignmentRatio,
    rawInput.postureStabilityRatio,
    rawInput.excessiveMovement,
  ]);

  // Landmark drawing state (kept out of React state — updated at detection fps)
  const drawStateRef = useRef<{
    facePoints: Array<{ x: number; y: number }> | null;
    shoulders: Array<{ x: number; y: number }> | null;
  }>({ facePoints: null, shoulders: null });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let intervalId: number | null = null;
    let disposed = false;

    // smoothing state
    let smoothGaze = 0.85;
    let smoothHead = 0.85;
    let smoothShoulder = 0.9;
    let smoothPosture = 0.88;
    let prevNose: { x: number; y: number } | null = null;
    let prevTorso: { x: number; y: number } | null = null;
    let moveAccum: number[] = [];

    async function loadMediaPipe(): Promise<any | null> {
      try {
        setMpStatus('loading');
        const visionUrl = `${MP_BASE}/vision_bundle.mjs`;
        const vision = await import(/* @vite-ignore */ visionUrl);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
        const face = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
        });
        const pose = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        setMpStatus('active');
        return { face, pose };
      } catch (err) {
        console.warn('MediaPipe load failed — heuristic fallback active:', err);
        setMpStatus('unavailable');
        return null;
      }
    }

    // Legacy luminance-centroid fallback (no network / WASM unavailable)
    function startHeuristicLoop() {
      const offscreen = document.createElement('canvas');
      offscreen.width = 64;
      offscreen.height = 48;
      const ctx = offscreen.getContext('2d');
      let prevCenterX = 32;
      let prevCenterY = 24;

      intervalId = window.setInterval(() => {
        if (!videoRef.current || !ctx || videoRef.current.readyState < 2 || disposed) return;
        ctx.drawImage(videoRef.current, 0, 0, 64, 48);
        const pixels = ctx.getImageData(0, 0, 64, 48).data;
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (let y = 8; y < 40; y += 2) {
          for (let x = 12; x < 52; x += 2) {
            const idx = (y * 64 + x) * 4;
            const luma = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            if (luma > 35) {
              sumX += x;
              sumY += y;
              count++;
            }
          }
        }
        if (count < 25) {
          setRawInput((prev) => ({ ...prev, faceVisible: false }));
          return;
        }
        const cx = sumX / count;
        const cy = sumY / count;
        const deltaMove = Math.hypot(cx - prevCenterX, cy - prevCenterY);
        prevCenterX = cx;
        prevCenterY = cy;
        const offsetFromCenter = Math.hypot(cx - 32, cy - 22) / 22;
        const gazeRatio = Math.max(0.55, Math.min(0.98, 1 - offsetFromCenter * 0.45));
        const stabilityRatio = Math.max(0.55, Math.min(0.98, 1 - deltaMove * 0.08));
        setRawInput({
          faceVisible: true,
          gazeCenteredRatio: Number(gazeRatio.toFixed(2)),
          headStabilityRatio: Number(stabilityRatio.toFixed(2)),
          shoulderAlignmentRatio: 0.89,
          postureStabilityRatio: Number(stabilityRatio.toFixed(2)),
          excessiveMovement: deltaMove > 4.2,
        });
      }, 700);
    }

    async function startWebcam() {
      if (!consentGranted || !cameraEnabled) return;
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Webcam API unavailable in this browser context.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 200, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const mp = await loadMediaPipe();
        if (disposed) return;

        if (!mp) {
          startHeuristicLoop();
          return;
        }

        const { face: faceLandmarker, pose: poseLandmarker } = mp;
        let lastFaceTs = -1;
        let lastPoseTs = -1;

        const loop = () => {
          if (disposed) return;
          rafId = requestAnimationFrame(loop);
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;

          const now = performance.now();

          // ---- Face landmarks (~15fps to keep laptops cool) ----
          if (now - lastFaceTs > 66) {
            lastFaceTs = now;
            try {
              const faceResult = faceLandmarker.detectForVideo(video, now);
              const lm = faceResult?.faceLandmarks?.[0];
              if (lm && lm.length > 0) {
                let minX = 1, maxX = 0, minY = 1, maxY = 0;
                for (const p of lm) {
                  if (p.x < minX) minX = p.x;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.y > maxY) maxY = p.y;
                }
                const faceW = Math.max(1e-4, maxX - minX);
                const faceH = Math.max(1e-4, maxY - minY);
                const nose = lm[NOSE_TIP];
                const cxN = (minX + maxX) / 2;
                const cyN = (minY + maxY) / 2;
                // Approximate horizontal gaze: nose tip offset from face center
                const offsetX = Math.abs(nose.x - cxN) / (faceW / 2);
                const offsetY = Math.abs(nose.y - cyN) / (faceH / 2);
                const centered = Math.max(0, 1 - Math.max(offsetX, offsetY * 0.6) * 1.35);

                const move = prevNose ? Math.hypot(nose.x - prevNose.x, nose.y - prevNose.y) : 0;
                prevNose = { x: nose.x, y: nose.y };

                smoothGaze = ema(smoothGaze, 0.55 + centered * 0.45, 0.25);
                smoothHead = ema(smoothHead, Math.max(0.5, Math.min(0.98, 1 - move * 22)), 0.12);
                moveAccum.push(move);
                if (moveAccum.length > 40) moveAccum.shift();
                const avgMove = moveAccum.reduce((a, b) => a + b, 0) / moveAccum.length;

                drawStateRef.current.facePoints = [
                  { x: lm[FACE_LEFT].x, y: lm[FACE_LEFT].y },
                  { x: lm[NOSE_TIP].x, y: lm[NOSE_TIP].y },
                  { x: lm[FACE_RIGHT].x, y: lm[FACE_RIGHT].y },
                ];

                setRawInput((prev) => ({
                  ...prev,
                  faceVisible: true,
                  gazeCenteredRatio: Number(smoothGaze.toFixed(2)),
                  headStabilityRatio: Number(smoothHead.toFixed(2)),
                  excessiveMovement: avgMove > 0.012,
                }));
              } else {
                setRawInput((prev) => ({ ...prev, faceVisible: false }));
                drawStateRef.current.facePoints = null;
              }
            } catch {
              /* detection hiccup — keep previous frame's values */
            }
          }

          // ---- Pose landmarks (shoulders / posture, ~10fps) ----
          if (now - lastPoseTs > 100) {
            lastPoseTs = now;
            try {
              const poseResult = poseLandmarker.detectForVideo(video, now);
              const pl = poseResult?.landmarks?.[0];
              if (pl && pl.length > POSE_RIGHT_SHOULDER) {
                const ls = pl[POSE_LEFT_SHOULDER];
                const rs = pl[POSE_RIGHT_SHOULDER];
                const shoulderW = Math.max(1e-4, Math.abs(rs.x - ls.x));
                const level = Math.max(0, 1 - (Math.abs(ls.y - rs.y) / shoulderW) * 1.4);

                const torso = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
                const move = prevTorso ? Math.hypot(torso.x - prevTorso.x, torso.y - prevTorso.y) : 0;
                prevTorso = torso;

                smoothShoulder = ema(smoothShoulder, 0.6 + level * 0.4, 0.2);
                smoothPosture = ema(smoothPosture, Math.max(0.5, Math.min(0.98, 1 - move * 16)), 0.1);

                drawStateRef.current.shoulders = [
                  { x: ls.x, y: ls.y },
                  { x: rs.x, y: rs.y },
                ];
                setRawInput((prev) => ({
                  ...prev,
                  shoulderAlignmentRatio: Number(smoothShoulder.toFixed(2)),
                  postureStabilityRatio: Number(smoothPosture.toFixed(2)),
                }));
              } else {
                drawStateRef.current.shoulders = null;
              }
            } catch {
              /* keep previous */
            }
          }
        };

        rafId = requestAnimationFrame(loop);
      } catch {
        setCameraError(
          'Camera stream unavailable or permission declined. Using calibrated presentation baseline.'
        );
      }
    }

    startWebcam();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (intervalId) clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setMpStatus('idle');
    };
  }, [consentGranted, cameraEnabled]);

  // Draw actual landmark overlay (face triangle + shoulder line) on the canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { facePoints, shoulders } = drawStateRef.current;

    if (facePoints && facePoints.length === 3) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      facePoints.forEach((p, i) => {
        const q = { x: p.x * canvas.width, y: p.y * canvas.height };
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      const nose = facePoints[1];
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(nose.x * canvas.width, nose.y * canvas.height, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (evaluation.faceStatus === 'Visible') {
      // heuristic mode: framing reticle
      const w = canvas.width;
      const h = canvas.height;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(w / 2 - 34, h * 0.42 - 40, 68, 80);
      ctx.setLineDash([]);
    }

    if (shoulders && shoulders.length === 2) {
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shoulders[0].x * canvas.width, shoulders[0].y * canvas.height);
      ctx.lineTo(shoulders[1].x * canvas.width, shoulders[1].y * canvas.height);
      ctx.stroke();
    }
  });

  if (!consentGranted) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 space-y-3 text-slate-800">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#4079DA] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#152A4C]">
              Observable Presentation Indicators (Consent Required)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              MediaPipe Face &amp; Pose landmarks run 100% locally in your browser to check framing,
              approximate gaze alignment, and shoulder posture. Raw video and audio are never stored
              or transmitted — no frame ever leaves this device.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onGrantConsent}
            className="px-3.5 py-2 text-xs font-semibold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
          >
            Enable In-Browser Camera Indicators
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 space-y-3 text-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#4079DA]" />
          <h3 className="text-xs font-bold text-[#152A4C]">
            Observable Presentation Indicators
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCalibrator((v) => !v)}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors whitespace-nowrap shrink-0"
            title="Adjust or test landmark telemetry"
          >
            <Sliders className="w-3 h-3 inline mr-1" />
            Calibrate
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              cameraEnabled
                ? 'bg-[#EBF1FD] text-[#4079DA] border border-blue-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {cameraEnabled ? (
              <>
                <Camera className="w-3 h-3 inline mr-1" />
                Cam Active
              </>
            ) : (
              <>
                <CameraOff className="w-3 h-3 inline mr-1" />
                Cam Paused
              </>
            )}
          </button>
        </div>
      </div>

      {/* Webcam Preview + Landmark Overlay */}
      <div className="relative h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
        {cameraEnabled ? (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full h-full object-cover opacity-90"
            />
            <canvas
              ref={overlayCanvasRef}
              width={260}
              height={128}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 border border-slate-200 text-[10px] font-mono text-[#4079DA] font-semibold flex items-center gap-1.5 shadow-2xs">
              {mpStatus === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
              {mpStatus === 'active' && <>MediaPipe Face+Pose · {evaluation.score}/100</>}
              {mpStatus === 'loading' && <>Loading landmarks…</>}
              {mpStatus === 'unavailable' && <>Framing heuristic · {evaluation.score}/100</>}
              {mpStatus === 'idle' && <>· {evaluation.score}/100</>}
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-semibold text-emerald-700 shadow-2xs">
              ● live · local only
            </div>
          </>
        ) : (
          <div className="text-center px-4">
            <UserCheck className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Camera preview paused by user</p>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Interactive Calibration Sliders for Testing Edge Cases */}
      {showCalibrator && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label htmlFor="gaze-slider" className="text-slate-600 font-medium">
              Gaze Frame Alignment
            </label>
            <span className="font-mono tabular-nums text-[#4079DA] font-bold">
              {Math.round(rawInput.gazeCenteredRatio * 100)}%
            </span>
          </div>
          <input
            id="gaze-slider"
            type="range"
            min="40"
            max="98"
            value={Math.round(rawInput.gazeCenteredRatio * 100)}
            onChange={(e) =>
              setRawInput((prev) => ({
                ...prev,
                gazeCenteredRatio: Number(e.target.value) / 100,
              }))
            }
            className="w-full accent-[#4079DA]"
          />
          <div className="flex items-center justify-between">
            <label htmlFor="shoulder-slider" className="text-slate-600 font-medium">
              Shoulder Level Alignment
            </label>
            <span className="font-mono tabular-nums text-indigo-600 font-bold">
              {Math.round(rawInput.shoulderAlignmentRatio * 100)}%
            </span>
          </div>
          <input
            id="shoulder-slider"
            type="range"
            min="45"
            max="98"
            value={Math.round(rawInput.shoulderAlignmentRatio * 100)}
            onChange={(e) =>
              setRawInput((prev) => ({
                ...prev,
                shoulderAlignmentRatio: Number(e.target.value) / 100,
              }))
            }
            className="w-full accent-indigo-600"
          />
        </div>
      )}

      {/* Observable Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Face Framing</span>
          <span className="font-semibold text-[#152A4C]">{evaluation.faceStatus}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Approx. Gaze</span>
          <span className="font-semibold text-[#152A4C]">{evaluation.gazeStatus}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Head Stability</span>
          <span className="font-semibold text-[#152A4C]">{evaluation.headPositionStatus}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Shoulders</span>
          <span className="font-semibold text-[#152A4C]">{evaluation.shoulderStatus}</span>
        </div>
      </div>

      {/* Gentle Framing Tip + Transparency Disclaimer */}
      <div className="text-[11px] text-slate-600 bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 space-y-1">
        <p className="font-semibold text-[#4079DA]">Tip: {evaluation.gentleTips[0]}</p>
        <p className="text-[10px] text-slate-500 leading-normal">{evaluation.disclaimer}</p>
      </div>
    </div>
  );
};

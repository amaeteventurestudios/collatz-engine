"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Vector3, type Camera } from "three";
import {
  Crosshair,
  Maximize,
  MousePointer2,
  Move3D,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CameraCommand } from "./visualStudioTypes";

interface ThreeSceneShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  legend?: ReactNode;
  hud?: ReactNode;
  tooltip?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: string | null;
  errorTitle?: string;
  onRetry?: () => void;
  resetSignal: number;
  cameraCommand?: CameraCommand | null;
  onCameraCommand?: (command: CameraCommand) => void;
}

const DEFAULT_POSITION = new Vector3(26, 16, 31);
const DEFAULT_TARGET = new Vector3(0, 5.5, 0);

export function ThreeSceneShell({
  title,
  subtitle,
  children,
  legend,
  hud,
  tooltip,
  loading = false,
  empty = false,
  error = null,
  errorTitle,
  onRetry,
  resetSignal,
  cameraCommand = null,
  onCameraCommand,
}: ThreeSceneShellProps) {
  const [localCameraCommand, setLocalCameraCommand] = useState<CameraCommand | null>(
    null,
  );

  function issueCameraCommand(action: CameraCommand["action"]) {
    const command = { action, key: Date.now() };
    setLocalCameraCommand(command);
    onCameraCommand?.(command);
  }

  const effectiveCameraCommand = cameraCommand ?? localCameraCommand;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-700/70 bg-black/45 shadow-2xl shadow-cyan-950/10 ring-1 ring-white/[0.025]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <MousePointer2 className="h-3.5 w-3.5" aria-hidden />
          <span>Rotate, pan, zoom</span>
        </div>
      </div>

      <div className="relative h-[420px] overflow-hidden bg-slate-950 sm:h-[560px] xl:h-[660px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_72%_38%,rgba(124,58,237,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.98))]"
        />
        <Canvas
          camera={{ position: DEFAULT_POSITION.toArray(), fov: 46, near: 0.1, far: 140 }}
          dpr={[1, 1.7]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={["#02040b"]} />
          <fog attach="fog" args={["#02040b", 36, 88]} />
          <Suspense fallback={null}>
            {children}
            <SceneCameraControls
              resetSignal={resetSignal}
              cameraCommand={effectiveCameraCommand}
            />
          </Suspense>
        </Canvas>

        {hud}
        {legend}
        {tooltip}

        <div className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-md border border-slate-700/80 bg-slate-950/78 p-1 shadow-2xl shadow-black/40 backdrop-blur sm:block">
          <ToolButton
            label="Reset camera"
            onClick={() => issueCameraCommand("reset")}
            Icon={RotateCcw}
          />
          <ToolButton
            label="Zoom in"
            onClick={() => issueCameraCommand("zoom-in")}
            Icon={ZoomIn}
          />
          <ToolButton
            label="Zoom out"
            onClick={() => issueCameraCommand("zoom-out")}
            Icon={ZoomOut}
          />
          <ToolButton
            label="Top view"
            onClick={() => issueCameraCommand("top")}
            Icon={Maximize}
          />
          <div className="my-1 h-px bg-slate-800" />
          <div className="flex h-9 w-9 items-center justify-center text-slate-500">
            <Move3D className="h-4 w-4" aria-hidden />
          </div>
        </div>

        {(loading || empty || error) && (
          <SceneStateOverlay
            loading={loading}
            empty={empty}
            error={error}
            errorTitle={errorTitle}
            onRetry={onRetry}
          />
        )}
      </div>
    </section>
  );
}

function ToolButton({
  label,
  onClick,
  Icon,
}: {
  label: string;
  onClick: () => void;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded text-slate-400 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function SceneStateOverlay({
  loading,
  empty,
  error,
  errorTitle,
  onRetry,
}: {
  loading: boolean;
  empty: boolean;
  error: string | null;
  errorTitle?: string;
  onRetry?: () => void;
}) {
  const message = error
    ? errorTitle ?? "Unable to load Visual Studio data right now."
    : loading
      ? "Loading computed trajectories."
      : empty
      ? "Waiting for analyzed trajectory data from the engine."
      : "Preparing trajectory view.";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55 px-6 backdrop-blur-[2px]">
      <div className="max-w-md rounded-lg border border-cyan-300/15 bg-slate-950/88 p-5 text-center shadow-2xl shadow-black/40">
        <Crosshair className="mx-auto h-7 w-7 text-cyan-300" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-slate-100">{message}</p>
        {error && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{error}</p>
        )}
        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function SceneCameraControls({
  resetSignal,
  cameraCommand,
}: {
  resetSignal: number;
  cameraCommand: CameraCommand | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    resetCamera(camera, controlsRef.current);
  }, [camera, resetSignal]);

  useEffect(() => {
    if (!cameraCommand) return;
    const controls = controlsRef.current;
    const target = controls?.target ?? DEFAULT_TARGET;

    if (cameraCommand.action === "reset") {
      resetCamera(camera, controls);
      return;
    }

    if (cameraCommand.action === "top") {
      camera.position.set(0, 34, 0.01);
      controls?.target.copy(new Vector3(0, 0, 0));
      controls?.update();
      return;
    }

    const direction = camera.position.clone().sub(target);
    const factor = cameraCommand.action === "zoom-in" ? 0.78 : 1.22;
    camera.position.copy(target.clone().add(direction.multiplyScalar(factor)));
    controls?.update();
  }, [camera, cameraCommand]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableRotate
      enableZoom
      maxDistance={76}
      minDistance={12}
      target={DEFAULT_TARGET}
    />
  );
}

function resetCamera(camera: Camera, controls: OrbitControlsImpl | null) {
  camera.position.copy(DEFAULT_POSITION);
  controls?.target.copy(DEFAULT_TARGET);
  controls?.update();
}

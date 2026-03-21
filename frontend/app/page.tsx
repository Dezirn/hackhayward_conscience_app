"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import type { Group } from "three";

function BatteryMesh() {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.55;
      groupRef.current.rotation.x = Math.sin(performance.now() * 0.0004) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.6, 48]} />
        <meshStandardMaterial
          color="#16a34a"
          metalness={0.55}
          roughness={0.35}
          emissive="#052e16"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.12, 48]} />
        <meshStandardMaterial
          color="#14532d"
          metalness={0.65}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.22, 24]} />
        <meshStandardMaterial
          color="#86efac"
          metalness={0.5}
          roughness={0.25}
          emissive="#22c55e"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color="#4ade80" />
      <BatteryMesh />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

function extractResponseText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const pick =
      o.message ??
      o.response ??
      o.text ??
      o.result ??
      o.score ??
      o.output;
    if (typeof pick === "string" || typeof pick === "number") {
      return String(pick);
    }
  }
  return JSON.stringify(data, null, 2);
}

export default function Home() {
  const [task, setTask] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = task.trim();
    if (!trimmed) {
      setError("Describe an activity first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/calculate-energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: trimmed,
          personality_type: "Introvert",
          triggers: "Loud noises",
          current_battery: 80,
        }),
      });

      const raw = await res.text();
      let parsed: unknown;
      try {
        parsed = raw ? JSON.parse(raw) : raw;
      } catch {
        parsed = raw;
      }

      if (!res.ok) {
        setError(
          typeof parsed === "object" && parsed && "detail" in parsed
            ? String((parsed as { detail: unknown }).detail)
            : `Request failed (${res.status})`,
        );
        return;
      }

      setResult(extractResponseText(parsed));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-1 flex-col bg-gradient-to-b from-slate-950 via-zinc-950 to-black text-zinc-100">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10 sm:py-14">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400/90">
            Social Energy
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Energy Calculator
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Estimate how much an activity might drain your social battery.
          </p>
        </header>

        <section
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-md"
          style={{ minHeight: "min(42vh, 320px)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,197,94,0.12),transparent_55%)]" />
          <Canvas
            shadows
            className="h-full min-h-[260px] w-full"
            camera={{ position: [0, 0.2, 3.4], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
          >
            <Scene />
          </Canvas>
        </section>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/30 p-5 shadow-xl backdrop-blur"
        >
          <label htmlFor="activity" className="text-sm font-medium text-zinc-200">
            What activity are you planning?
          </label>
          <input
            id="activity"
            name="activity"
            type="text"
            autoComplete="off"
            placeholder="e.g. Team dinner, conference talk, family visit…"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 outline-none ring-emerald-500/0 transition placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Calculating…" : "Calculate Drain"}
          </button>
        </form>

        <section className="flex min-h-[120px] flex-col gap-2 rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Result
          </h2>
          {error && (
            <p className="text-sm leading-relaxed text-red-400">{error}</p>
          )}
          {!error && !result && !loading && (
            <p className="text-sm leading-relaxed text-zinc-500">
              Your estimate will show here after you calculate.
            </p>
          )}
          {loading && (
            <p className="text-sm text-zinc-400">Talking to the server…</p>
          )}
          {result && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {result}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  getGuestId,
  getGuestName,
  setGuestName,
  hasSeenIntro,
  setSeenIntro,
} from "@/lib/guest";

const SHOT_LIMIT = Number(process.env.NEXT_PUBLIC_SHOT_LIMIT || 50);
const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Our Wedding";
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "wedding";

type Status = "idle" | "uploading" | "error";
type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported";

export default function GuestCameraPage() {
  // null = not yet determined (avoids a hydration mismatch and any flash
  // of the wrong screen — both the server render and the very first
  // client render agree on "unknown" before the mount effect resolves it
  // from localStorage).
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [guestName, setGuestNameState] = useState<string | null>(null);
  const [guestId, setGuestIdState] = useState<string>("");
  const [shotsTaken, setShotsTaken] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingUploadsRef = useRef(0);

  useEffect(() => {
    function init() {
      const id = getGuestId();
      setGuestIdState(id);
      const existingName = getGuestName();
      if (existingName) {
        setGuestNameState(existingName);
        void refreshCount(id);
      }
      setShowIntro(!hasSeenIntro());
    }
    init();
  }, []);

  function handleIntroContinue() {
    setSeenIntro();
    setShowIntro(false);
  }

  const remaining =
    shotsTaken === null ? null : Math.max(SHOT_LIMIT - shotsTaken, 0);
  const rollDone = remaining === 0;

  // Start the live camera preview once a guest has entered their name,
  // and keep it running across shots — this is what lets someone shoot
  // rapid successive photos with no OS "Use Photo?" confirmation step
  // between each one, unlike a native <input capture> flow.
  useEffect(() => {
    if (!guestName || rollDone) return;

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unsupported");
        return;
      }
      setCameraStatus("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraStatus("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) setCameraStatus("denied");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [guestName, rollDone]);

  async function refreshCount(id: string) {
    const { count, error } = await supabase
      .from("wedcam_photos")
      .select("id", { count: "exact", head: true })
      .eq("guest_id", id);
    if (!error && count !== null) setShotsTaken(count);
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setGuestName(trimmed);
    setGuestNameState(trimmed);
    void refreshCount(guestId);
  }

  async function takeShot() {
    // Only the guestName/limit/camera-readiness checks gate a new capture —
    // an in-flight upload does NOT block the next tap, otherwise rapid
    // shooting silently drops every tap that lands before the previous
    // upload's network round-trip finishes. canvas.toBlob() snapshots the
    // bitmap synchronously at call time, so overlapping captures on the
    // shared canvas can't corrupt each other even while uploads race.
    if (!guestName) return;
    if (shotsTaken !== null && shotsTaken >= SHOT_LIMIT) {
      setErrorMsg("Your roll is finished — no shots left.");
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || cameraStatus !== "ready") return;

    // Quick visual "shutter" flash for feedback, independent of upload speed
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        pendingUploadsRef.current += 1;
        setStatus("uploading");
        setErrorMsg(null);
        try {
          const file = new File([blob], `${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          const result = await uploadToCloudinary(file, FOLDER);
          const { error } = await supabase.from("wedcam_photos").insert({
            guest_id: guestId,
            guest_name: guestName,
            image_url: result.secure_url,
            cloudinary_public_id: result.public_id,
          });
          if (error) throw error;
          setLastThumb(result.secure_url);
          setShotsTaken((prev) => (prev === null ? 1 : prev + 1));
        } catch (err) {
          console.error(err);
          setErrorMsg(
            "That shot didn't save. Check your connection and try again."
          );
        } finally {
          pendingUploadsRef.current -= 1;
          // Only clear the "uploading" indicator once every in-flight
          // upload from this burst of taps has settled.
          if (pendingUploadsRef.current === 0) setStatus("idle");
        }
      },
      "image/jpeg",
      0.85
    );
  }

  // Not yet determined whether this device has seen the intro — render an
  // empty ivory shell rather than guessing, so returning guests never see
  // a flash of the welcome screen.
  if (showIntro === null) {
    return <main className="min-h-dvh bg-ivory" />;
  }

  // Screen 0 — first-visit welcome, shown once per device
  if (showIntro) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-ivory text-ink">
        <div className="w-full max-w-sm text-center">
          <p className="font-body text-xs tracking-[0.25em] uppercase text-maroon/70 mb-3">
            {EVENT_NAME}
          </p>
          <h1 className="font-display text-4xl font-semibold text-maroon-deep mb-2">
            Welcome to Ek Roll
          </h1>
          <p className="font-body text-sm text-ink/70 mb-8">
            Ek Roll is a shared disposable camera for {EVENT_NAME}. Everyone
            shoots their own roll — up to {SHOT_LIMIT} shots — and no one,
            not even you, sees a single photo until the whole roll is
            revealed together, after the day.
          </p>
          <button
            onClick={handleIntroContinue}
            className="w-full rounded-full bg-maroon px-5 py-3 font-body text-base font-medium text-ivory transition active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  // Screen 1 — name entry
  if (!guestName) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-ivory text-ink">
        <div className="w-full max-w-sm text-center">
          <p className="font-body text-xs tracking-[0.25em] uppercase text-maroon/70 mb-3">
            {EVENT_NAME}
          </p>
          <h1 className="font-display text-4xl font-semibold text-maroon-deep mb-2">
            Ek Roll
          </h1>
          <p className="font-body text-sm text-ink/70 mb-8">
            One roll of film, your eyes only for today. Everyone sees it
            together, after.
          </p>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-full border border-maroon/25 bg-white/60 px-5 py-3 text-center font-body text-base text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-maroon/40"
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full rounded-full bg-maroon px-5 py-3 font-body text-base font-medium text-ivory disabled:opacity-40 transition active:scale-[0.98]"
            >
              Start shooting
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Screen 2 — live viewfinder / rapid capture
  return (
    <main className="relative min-h-dvh flex flex-col bg-viewfinder text-ivory overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Shutter flash feedback */}
      <div
        className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-150 ${
          flash ? "opacity-70" : "opacity-0"
        }`}
      />

      {/* Dark scrim so text stays legible over any live camera feed */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div>
          <p className="font-body text-[11px] tracking-[0.2em] uppercase text-rose-dust/80">
            {EVENT_NAME}
          </p>
          <p className="font-display text-lg text-ivory">{guestName}</p>
        </div>
        <div className="text-right">
          <p className="frame-counter font-body text-xs text-brass">
            {shotsTaken === null ? "··" : String(shotsTaken).padStart(2, "0")}
            {" / "}
            {SHOT_LIMIT}
          </p>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {rollDone ? (
          <div className="text-center max-w-xs">
            <p className="font-display text-3xl mb-2">Roll&apos;s finished.</p>
            <p className="font-body text-sm text-ivory/70">
              That&apos;s every shot on your film. Thank you for capturing the
              day — we can&apos;t wait to see it through your eyes.
            </p>
          </div>
        ) : cameraStatus === "denied" ? (
          <div className="text-center max-w-xs">
            <p className="font-display text-2xl mb-2">Camera access needed</p>
            <p className="font-body text-sm text-ivory/70">
              Ek Roll needs camera permission to shoot. Check your browser
              settings and allow camera access for this site, then reload.
            </p>
          </div>
        ) : cameraStatus === "unsupported" ? (
          <div className="text-center max-w-xs">
            <p className="font-display text-2xl mb-2">Browser not supported</p>
            <p className="font-body text-sm text-ivory/70">
              Try opening this link in Safari or Chrome instead.
            </p>
          </div>
        ) : (
          <button
            onClick={takeShot}
            disabled={cameraStatus !== "ready"}
            aria-label="Take a photo"
            className="relative h-24 w-24 rounded-full border-4 border-ivory/90 bg-transparent flex items-center justify-center transition active:scale-95 disabled:opacity-40"
          >
            <span className="h-[4.5rem] w-[4.5rem] rounded-full bg-ivory" />
            {status === "uploading" && (
              <span className="absolute -bottom-8 font-body text-[10px] tracking-wide uppercase text-ivory/70">
                Saving…
              </span>
            )}
          </button>
        )}

        {errorMsg && (
          <p className="mt-6 font-body text-sm text-rose-dust text-center max-w-xs">
            {errorMsg}
          </p>
        )}
      </div>

      <footer className="relative z-10 flex items-center justify-between px-6 pb-8">
        <div className="h-14 w-14 rounded-md overflow-hidden border border-ivory/30 bg-ivory/10">
          {lastThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lastThumb}
              alt="Last shot"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <p className="font-body text-[11px] text-ivory/60 text-right max-w-[10rem]">
          {rollDone
            ? "Photos reveal together, after the day."
            : "Tap the shutter for as many shots as you like."}
        </p>
      </footer>
    </main>
  );
}

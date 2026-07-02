"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getGuestId, getGuestName, setGuestName } from "@/lib/guest";

const SHOT_LIMIT = Number(process.env.NEXT_PUBLIC_SHOT_LIMIT || 50);
const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Our Wedding";
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "wedding";

type Status = "idle" | "uploading" | "error";

export default function GuestCameraPage() {
  const [nameInput, setNameInput] = useState("");
  const [guestName, setGuestNameState] = useState<string | null>(null);
  const [guestId, setGuestIdState] = useState<string>("");
  const [shotsTaken, setShotsTaken] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function init() {
      const id = getGuestId();
      setGuestIdState(id);
      const existingName = getGuestName();
      if (existingName) {
        setGuestNameState(existingName);
        void refreshCount(id);
      }
    }
    init();
  }, []);

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

  function triggerCamera() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !guestName) return;

    if (shotsTaken !== null && shotsTaken >= SHOT_LIMIT) {
      setErrorMsg("Your roll is finished — no shots left.");
      return;
    }

    setStatus("uploading");
    setErrorMsg(null);
    try {
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
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setErrorMsg("That shot didn't save. Check your connection and try again.");
      setStatus("idle");
    }
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

  const remaining = shotsTaken === null ? null : Math.max(SHOT_LIMIT - shotsTaken, 0);
  const rollDone = remaining === 0;

  // Screen 2 — viewfinder / capture
  return (
    <main className="min-h-dvh flex flex-col bg-viewfinder text-ivory">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <header className="flex items-center justify-between px-6 pt-6">
        <div>
          <p className="font-body text-[11px] tracking-[0.2em] uppercase text-rose-dust/70">
            {EVENT_NAME}
          </p>
          <p className="font-display text-lg text-ivory/90">{guestName}</p>
        </div>
        <div className="text-right">
          <p className="frame-counter font-body text-xs text-brass/90">
            {shotsTaken === null ? "··" : String(shotsTaken).padStart(2, "0")}
            {" / "}
            {SHOT_LIMIT}
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {rollDone ? (
          <div className="text-center max-w-xs">
            <p className="font-display text-3xl mb-2">Roll&apos;s finished.</p>
            <p className="font-body text-sm text-ivory/60">
              That&apos;s every shot on your film. Thank you for capturing the
              day — we can&apos;t wait to see it through your eyes.
            </p>
          </div>
        ) : (
          <button
            onClick={triggerCamera}
            disabled={status === "uploading"}
            aria-label="Take a photo"
            className="relative h-28 w-28 rounded-full border-4 border-ivory/80 bg-transparent flex items-center justify-center transition active:scale-95 disabled:opacity-50"
          >
            <span className="h-20 w-20 rounded-full bg-ivory" />
            {status === "uploading" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-6 w-6 rounded-full border-2 border-maroon border-t-transparent animate-spin" />
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

      <footer className="flex items-center justify-between px-6 pb-8">
        <div className="h-14 w-14 rounded-md overflow-hidden border border-ivory/20 bg-ivory/5">
          {lastThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lastThumb}
              alt="Last shot"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <p className="font-body text-[11px] text-ivory/40 text-right max-w-[10rem]">
          Photos reveal together, after the day.
        </p>
      </footer>
    </main>
  );
}

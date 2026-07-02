"use client";

import { useEffect, useState } from "react";
import { supabase, type WedcamPhoto } from "@/lib/supabaseClient";

const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Our Wedding";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<WedcamPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("wedcam_photos")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setPhotos(data as WedcamPhoto[]);
      setLoading(false);
    }
    void load();
  }, []);

  const guestCount = new Set(photos.map((p) => p.guest_id)).size;

  return (
    <main className="min-h-dvh bg-ivory text-ink px-4 py-8 sm:px-8">
      <header className="max-w-5xl mx-auto mb-8 flex items-end justify-between flex-wrap gap-2">
        <div>
          <p className="font-body text-xs tracking-[0.25em] uppercase text-maroon/70">
            {EVENT_NAME}
          </p>
          <h1 className="font-display text-3xl font-semibold text-maroon-deep">
            Ek Roll — Gallery
          </h1>
        </div>
        <p className="font-body text-sm text-ink/60">
          {photos.length} photo{photos.length === 1 ? "" : "s"} from{" "}
          {guestCount} guest{guestCount === 1 ? "" : "s"}
        </p>
      </header>

      {loading ? (
        <p className="font-body text-sm text-ink/50 text-center mt-20">
          Loading photos…
        </p>
      ) : photos.length === 0 ? (
        <p className="font-body text-sm text-ink/50 text-center mt-20">
          No photos yet. Once guests start shooting, they&apos;ll show up here.
        </p>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={photo.image_url}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-md bg-white/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_url}
                alt={`Shot by ${photo.guest_name}`}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-viewfinder/80 to-transparent px-2 py-1.5 text-[11px] font-body text-ivory opacity-0 group-hover:opacity-100 transition">
                {photo.guest_name}
              </span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

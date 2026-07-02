"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "Our Wedding";

export default function QrPage() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    function init() {
      setUrl(window.location.origin);
    }
    init();
  }, []);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-ivory text-ink px-6 py-12 print:bg-white">
      <p className="font-body text-xs tracking-[0.25em] uppercase text-maroon/70 mb-2">
        {EVENT_NAME}
      </p>
      <h1 className="font-display text-4xl font-semibold text-maroon-deep mb-8">
        Scan to take photos
      </h1>
      {url && (
        <div className="rounded-2xl border-4 border-maroon/20 bg-white p-6">
          <QRCodeSVG value={url} size={280} fgColor="#241b17" bgColor="#ffffff" />
        </div>
      )}
      <p className="mt-4 font-body text-[11px] tracking-[0.2em] uppercase text-brass">
        Ek Roll
      </p>
      <p className="mt-2 font-body text-sm text-ink/50 max-w-xs text-center break-all">
        {url}
      </p>
      <p className="mt-8 font-body text-xs text-ink/40 print:hidden">
        Print this page and place it at the entrance or on tables.
      </p>
    </main>
  );
}

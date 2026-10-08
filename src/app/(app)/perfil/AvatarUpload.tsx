"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { saveAvatar } from "@/app/profile-actions";

export function AvatarUpload({ name, url }: { name: string | null; url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-5">
      <Avatar name={name} url={url} size={80} />
      <div>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => input.current?.click()}>
          <Camera size={16} /> {pending ? "Subiendo…" : "Cambiar foto"}
        </button>
        {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.set("avatar", f);
          start(async () => {
            const res = await saveAvatar(fd);
            setError(res.error ?? null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

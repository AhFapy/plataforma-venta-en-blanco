"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markChannelRead } from "./actions";

// Al abrir un canal se marca como visto y se refrescan los contadores
export function MarkRead({ channelId, hadUnread }: { channelId: string; hadUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    markChannelRead(channelId).then(() => { if (hadUnread) router.refresh(); });
  }, [channelId, hadUnread, router]);
  return null;
}

import { supabase } from "@/integrations/supabase/client";

export type RemoteAction = "next" | "prev" | "star" | "refresh";
const topic = (userId: string) => `hb-remote-${userId}`;

/** Board side: listen for phone remote commands sent by the same teacher account. */
export function listenRemote(userId: string, on: (a: RemoteAction) => void) {
  const ch = supabase.channel(topic(userId)).on("broadcast", { event: "cmd" }, ({ payload }) => on((payload as { action: RemoteAction }).action)).subscribe();
  return () => { void supabase.removeChannel(ch); };
}

/** Phone side: a channel that sends commands to the board. */
export function remoteSender(userId: string) {
  const ch = supabase.channel(topic(userId));
  ch.subscribe();
  return {
    send: (action: RemoteAction) => ch.send({ type: "broadcast", event: "cmd", payload: { action } }),
    close: () => { void supabase.removeChannel(ch); },
  };
}

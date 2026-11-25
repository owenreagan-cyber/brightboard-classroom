import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { remoteSender, type RemoteAction } from "@/lib/remote";

export const Route = createFileRoute("/_authenticated/remote")({
  head: () => ({
    meta: [
      { title: "Phone Remote — Hero Board" },
      { name: "description", content: "Change slides and reveal the Mystery Star from your phone while the smartboard presents." },
      { property: "og:title", content: "Phone Remote — Hero Board" },
      { property: "og:description", content: "Change slides and reveal the Mystery Star from your phone while the smartboard presents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Remote,
});

function Remote() {
  const sender = useRef<ReturnType<typeof remoteSender> | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let off = () => {};
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const s = remoteSender(data.user.id); sender.current = s; setReady(true); off = s.close;
    });
    return () => off();
  }, []);
  const send = async (a: RemoteAction, msg: string) => {
    if (a === "star") {
      const { data } = await supabase.auth.getUser();
      const games = { ...((data.user?.user_metadata?.["games"] as Record<string, unknown>) ?? {}) };
      const star = games["hb-star"] as { secret?: string | null } | undefined;
      if (!star?.secret) { toast("Pick a secret star on the board first"); return; }
      await supabase.auth.updateUser({ data: { games: { ...games, "hb-star": { ...star, revealed: true } } } });
    }
    await sender.current?.send(a);
    toast.success(msg);
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
      <Button asChild variant="outline" className="self-start"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
      <h1 className="font-display text-3xl">Phone remote</h1>
      <p className="text-sm text-muted-foreground">Open the board on the smartboard with the same account, then use these buttons.</p>
      <div className="grid grid-cols-2 gap-3">
        <Button disabled={!ready} className="h-32 text-xl" variant="outline" onClick={() => send("prev", "Previous slide")}><ChevronLeft className="h-8 w-8" /> Back</Button>
        <Button disabled={!ready} className="h-32 text-xl" onClick={() => send("next", "Next slide")}>Next <ChevronRight className="h-8 w-8" /></Button>
      </div>
      <Button disabled={!ready} className="h-20 text-xl" variant="secondary" onClick={() => send("star", "Mystery Star revealed")}>⭐ Reveal Mystery Star</Button>
    </div>
  );
}

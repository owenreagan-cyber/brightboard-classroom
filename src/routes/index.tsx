import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import sakura from "@/assets/bg-sakura.jpg";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sakura Board — Anime classroom slides for first grade" },
      { name: "description", content: "Morning messages, timer sequences, name picker and class music on one cute classroom screen." },
      { property: "og:title", content: "Sakura Board — Anime classroom slides" },
      { property: "og:description", content: "Morning messages, timer sequences, name picker and class music on one cute classroom screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in didn't work. Please try again.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundImage: `url(${sakura})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-background/40" />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
        <img src={mascot} alt="Sakura Board cat mascot" width={1024} height={1024} className="h-40 w-40 drop-shadow-xl" />
        <div className="widget-card rounded-[40px] px-10 py-10">
          <h1 className="font-display text-5xl text-primary md:text-6xl">Sakura Board</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-foreground">
            A cozy anime-style classroom screen: morning messages, auto-running timer routines, a name picker, work symbols and class music.
          </p>
          <div className="mt-8">
            {signedIn ? (
              <Button asChild size="lg" className="kid-btn h-auto"><Link to="/board">Open my board</Link></Button>
            ) : (
              <Button size="lg" className="kid-btn h-auto" onClick={signIn} disabled={signedIn === null}>Sign in with Google</Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

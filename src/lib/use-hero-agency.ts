import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newHeroJobs, type HeroJobsState } from "./hero-jobs";
import { mergeHeroAgency, readHeroAgency } from "./hero-agency-store";

let chain: Promise<unknown> = Promise.resolve();
const event = "hb-hero-agency-updated";
type SaveStatus = "loading" | "saved" | "saving" | "error";

/** Separate from slide/game data; every Hero Agency view reads this same teacher-owned value. */
export function useHeroAgency() {
  const [state, setState] = useState(newHeroJobs);
  const current = useRef(state);
  const pending = useRef(0);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const apply = (value: HeroJobsState) => { current.current = value; setState(value); };
    const pull = async () => {
      if (pending.current) return;
      const { data, error: failure } = await supabase.auth.getUser();
      if (!live || pending.current) return;
      if (failure || !data.user) { setStatus("error"); setError("Couldn't load saved jobs. Check your connection."); return; }
      apply(readHeroAgency(data.user.user_metadata)); setStatus("saved"); setError("");
    };
    const onUpdate = (e: Event) => apply((e as CustomEvent<HeroJobsState>).detail);
    const onFocus = () => void pull();
    window.addEventListener(event, onUpdate);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void pull(), 5000);
    void pull();
    return () => { live = false; clearInterval(timer); window.removeEventListener(event, onUpdate); window.removeEventListener("focus", onFocus); };
  }, []);
  const set = (after: HeroJobsState) => {
    if (status === "loading") return;
    const before = current.current;
    current.current = after; setState(after); setStatus("saving"); pending.current++;
    window.dispatchEvent(new CustomEvent(event, { detail: after }));
    chain = chain.catch(() => undefined).then(async () => {
      const { data, error: failure } = await supabase.auth.getUser();
      if (failure || !data.user) throw new Error("Couldn't save jobs. Check your connection and try again.");
      const merged = mergeHeroAgency(readHeroAgency(data.user.user_metadata), before, after);
      const { error: saveError } = await supabase.auth.updateUser({ data: { hero_agency: merged } });
      if (saveError) throw new Error("Couldn't save jobs. Check your connection and try again.");
      pending.current--;
      if (!pending.current) {
        current.current = merged; setState(merged); setStatus("saved"); setError("");
        window.dispatchEvent(new CustomEvent(event, { detail: merged }));
      }
    }).catch((failure: unknown) => {
      pending.current = Math.max(0, pending.current-1); setStatus("error");
      setError(failure instanceof Error ? failure.message : "Couldn't save jobs.");
    });
  };
  return [state, set, { status, error }] as const;
}
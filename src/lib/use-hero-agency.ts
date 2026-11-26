import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newHeroJobs, type HeroJobsState } from "./hero-jobs";
import { readHeroAgency } from "./hero-agency-store";
import { displayNames, DEFAULT_ROSTERS } from "./rosters";
import type { CompanionConnection } from "./classroom-companion";

const event = "hb-hero-agency-updated";
type SaveStatus = "loading" | "saved" | "saving" | "error";

/** Classroom Companion owns current jobs/check-ins; its Hero Agency document owns weekly history. */
export function useHeroAgency() {
  const [state, setState] = useState(newHeroJobs);
  const current = useRef(state);
  const pending = useRef(0);
  const connection = useRef<CompanionConnection | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const apply = (value: HeroJobsState) => {
      if (!live || pending.current) return;
      current.current = value;
      setState(value);
      setStatus("saved");
      setError("");
    };
    const onUpdate = (e: Event) => apply((e as CustomEvent<HeroJobsState>).detail);
    window.addEventListener(event, onUpdate);

    void (async () => {
      try {
        const [{ data: authData, error: authError }, { data: roster }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("rosters").select("students").eq("name", "Homeroom").maybeSingle(),
        ]);
        if (authError || !authData.user) throw new Error("Sign in again to open Classroom Companion jobs.");
        const fallback = readHeroAgency(authData.user.user_metadata);
        const names = displayNames((roster?.students as string[] | null | undefined) ?? DEFAULT_ROSTERS.Homeroom);
        const { openClassroomCompanion } = await import("./classroom-companion");
        if (!live) return;
        connection.current = await openClassroomCompanion(fallback, names, apply, (message) => {
          if (!live) return;
          setStatus("error");
          setError(message);
        });
      } catch (failure) {
        if (!live) return;
        setStatus("error");
        setError(failure instanceof Error ? failure.message : "Classroom Companion could not connect.");
      }
    })();

    return () => {
      live = false;
      window.removeEventListener(event, onUpdate);
      connection.current?.close();
      connection.current = null;
    };
  }, []);

  const set = (after: HeroJobsState) => {
    if (status !== "saved" || !connection.current) return;
    const before = current.current;
    current.current = after;
    setState(after);
    setStatus("saving");
    pending.current++;
    window.dispatchEvent(new CustomEvent(event, { detail: after }));
    const active = connection.current;
    chain.current = chain.current.catch(() => undefined).then(async () => {
      const merged = await active.save(before, after);
      pending.current = Math.max(0, pending.current - 1);
      if (!pending.current) {
        current.current = merged;
        setState(merged);
        setStatus("saved");
        setError("");
        window.dispatchEvent(new CustomEvent(event, { detail: merged }));
      }
    }).catch((failure: unknown) => {
      pending.current = Math.max(0, pending.current - 1);
      setStatus("error");
      setError(failure instanceof Error ? failure.message : "Classroom Companion could not save jobs.");
    });
  };

  return [state, set, { status, error }] as const;
}

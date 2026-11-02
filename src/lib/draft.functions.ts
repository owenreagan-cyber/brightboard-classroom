import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  subject: z.string().min(1).max(60),
  goal: z.string().min(1).max(400),
  details: z.string().max(1500).default(""),
  boardTitle: z.string().max(120).default(""),
});

export const draftSlideText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "AI writing isn't set up yet." };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const openai = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: openai.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        output: Output.object({
          schema: z.object({ heading: z.string(), steps: z.array(z.string()) }),
        }),
        system:
          "You write classroom slide text for first graders (age 6-7). Heading: max 6 words, upbeat, can end with one emoji. Steps: 3 to 5 short lines, max 8 simple words each, start with an action verb, one emoji per line is fine. No numbers at the start of lines. Match the subject's energy (Hero Board has a fun shonen anime hero vibe).",
        prompt: `Subject: ${data.subject}\nBoard: ${data.boardTitle}\nLesson goal: ${data.goal}\nKey details: ${data.details || "none"}`,
        providerOptions: {
          openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
        },
      });
      const out = await result.output;
      return { heading: out.heading, steps: out.steps.slice(0, 6) };
    } catch (e) {
      console.error("draftSlideText failed", e);
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 402) return { error: "Out of AI credits — add more in Settings → Plans & credits." };
      if (status === 429) return { error: "Too many requests — wait a moment and try again." };
      return { error: "Couldn't draft text right now. Try again." };
    }
  });

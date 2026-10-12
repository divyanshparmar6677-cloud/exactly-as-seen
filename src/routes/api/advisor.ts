import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/server/run-id";

const Body = z.object({ summary: z.string().min(10).max(8000) });

const INSTRUCTIONS = `You are a campus sustainability advisor for a university demo dashboard.
You receive aggregated resource records (some are SIMULATED sample data — never present them as real measurements).
Return 4-6 prioritized, practical recommendations as a markdown list. Each item: "**[High|Medium|Low] Title** — 1-2 sentence action with an estimated impact using only the numbers provided."
Do not invent real campus statistics, sensors, or facilities beyond what is listed. Keep it concise.`;

export const Route = createFileRoute("/api/advisor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 503 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions: INSTRUCTIONS,
          messages: [{ role: "user", content: parsed.data.summary }],
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const part of result.fullStream) {
                if (part.type === "text-delta") controller.enqueue(enc.encode(part.text));
                if (part.type === "error") {
                  const msg = part.error instanceof Error ? part.error.message : "AI request failed";
                  controller.enqueue(enc.encode(`\n[[AI_ERROR]] ${msg}`));
                }
              }
            } catch (e) {
              if (!request.signal.aborted) controller.enqueue(enc.encode(`\n[[AI_ERROR]] ${e instanceof Error ? e.message : "AI request failed"}`));
            } finally {
              controller.close();
            }
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      },
    },
  },
});

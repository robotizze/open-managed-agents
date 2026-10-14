import type { Context, Model } from "@earendil-works/pi-ai";
import { stream } from "@earendil-works/pi-ai/api/openai-completions";
import { normalizeContext } from "@earendil-works/pi-ai/utils/transcript";
import { describe, expect, it } from "vitest";

const signature = "opaque+/signature== do not trim";

function model(baseUrl: string): Model<"openai-completions"> {
  return {
    id: "gemini-2.5-flash",
    name: "Gemini compatibility test",
    api: "openai-completions",
    provider: "openai-compatible",
    baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 1024,
  };
}

function sse(deltas: Record<string, unknown>[], finishReason: string): Response {
  const chunks = deltas.map((delta) => ({
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    created: 1,
    model: "gemini-2.5-flash",
    choices: [{ index: 0, delta, finish_reason: null }],
  }));
  chunks.push({ ...chunks[0], choices: [{ index: 0, delta: {}, finish_reason: finishReason as never }] });
  return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream" },
  });
}

async function twoSteps(baseUrl: string) {
  const requests: Record<string, any>[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return requests.length === 1
      ? sse([
          { tool_calls: [{ index: 0, id: "call_one", type: "function", function: { name: "lookup", arguments: '{"query":' } }] },
          { tool_calls: [{ index: 0, function: { arguments: '"hello"}' }, extra_content: { google: { thought_signature: signature } } }] },
          { tool_calls: [{ index: 0, extra_content: { google: { thought_signature: null } } }] },
        ], "tool_calls")
      : sse([{ content: "Done" }], "stop");
  };
  const target = model(baseUrl);
  const context: Context = {
    messages: [{ role: "user", content: "Look up hello", timestamp: 1 }],
  };
  const first = await stream(target, normalizeContext(context), { apiKey: "fake", fetch: fetchImpl, maxRetries: 0 }).result();
  expect(first.stopReason).toBe("toolUse");
  const toolCall = first.content.find((block) => block.type === "toolCall");
  expect(toolCall).toMatchObject({ id: "call_one", name: "lookup", arguments: { query: "hello" } });
  const second = await stream(target, normalizeContext({
    messages: [
      ...context.messages,
      first,
      { role: "toolResult", toolCallId: "call_one", toolName: "lookup", content: [{ type: "text", text: "Found" }], isError: false, timestamp: 2 },
    ],
  }), { apiKey: "fake", fetch: fetchImpl, maxRetries: 0 }).result();
  expect(second.stopReason).toBe("stop");
  return { toolCall, replay: requests[1].messages.find((message: any) => message.role === "assistant").tool_calls[0] };
}

describe("Pi Gemini thought signatures over OpenAI completions", () => {
  it("captures a signature on a later chunk and replays the exact opaque value", async () => {
    const { toolCall, replay } = await twoSteps("https://generativelanguage.googleapis.com/v1beta/openai/");
    expect(toolCall?.thoughtSignature).toBe(signature);
    expect(replay.extra_content).toEqual({ google: { thought_signature: signature } });
    expect(replay.type).toBe("function");
    expect(replay.function).toEqual({ name: "lookup", arguments: '{"query":"hello"}' });
  });

  it.each([
    "https://api.openai.com/v1",
    "https://generativelanguage.googleapis.com.example.test/v1beta/openai/",
    "https://generativelanguage.googleapis.com/other/openai/",
  ])("leaves ordinary and unrelated compatible endpoints unchanged: %s", async (baseUrl) => {
    const { toolCall, replay } = await twoSteps(baseUrl);
    expect(toolCall?.thoughtSignature).toBeUndefined();
    expect(replay).not.toHaveProperty("extra_content");
  });
});

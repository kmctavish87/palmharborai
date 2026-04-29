import { getTmsPayload, isRefreshDue, refreshTmsData } from "../functions/_lib/tms-refresh.js";

const OPENAI_URL = "https://api.openai.com/v1/responses";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/tms" && request.method === "GET") {
      return handleTmsIndex(env, ctx);
    }

    if (url.pathname === "/api/tms/refresh" && request.method === "POST") {
      return handleTmsRefresh(request, env);
    }

    if (url.pathname === "/api/tms/generate" && request.method === "POST") {
      return handleTmsGenerate(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleTmsIndex(env, ctx) {
  try {
    if (await isRefreshDue(env)) {
      ctx.waitUntil(refreshTmsData(env));
    }

    const payload = await getTmsPayload(env);
    return Response.json(payload, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to load TMS hub data.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function handleTmsRefresh(request, env) {
  const headerToken = request.headers.get("x-admin-token") || "";

  if (!env.TMS_ADMIN_TOKEN || headerToken !== env.TMS_ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshTmsData(env);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: "Refresh failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function handleTmsGenerate(request, env) {
  if (!env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
    if (!items.length) {
      return Response.json({ error: "No sources were selected." }, { status: 400 });
    }

    const contentType = body.contentType || "Blog post";
    const tone = body.tone || "Professional";

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: buildPrompt({ items, contentType, tone }),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return Response.json(
        { error: payload.error?.message || "OpenAI request failed." },
        { status: response.status }
      );
    }

    return Response.json({ draft: extractText(payload) });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to generate a draft.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function buildPrompt({ items, contentType, tone }) {
  const sources = items
    .map((item, index) => {
      const tags = Array.isArray(item.tags) ? item.tags.join(", ") : "";
      return `${index + 1}. Title: ${item.title}
Source: ${item.source}
Date: ${item.publicationDate || "Unknown"}
Type: ${item.type}
Summary: ${item.summary}
Tags: ${tags}
URL: ${item.url}`;
    })
    .join("\n\n");

  return `You are drafting educational content for a TMS clinic.

Create a ${contentType} in a ${tone} tone using only the source information provided below.

Rules:
- Do not invent facts or outcomes.
- Do not say TMS cures anything.
- Use careful language such as "may help," "has been studied for," "research suggests," or "some reporting indicates."
- Reference the selected source titles explicitly in the draft.
- Include a short "Sources referenced" section at the end listing source titles.
- Keep the content educational and responsible.
- Add this exact disclaimer at the end: "This content is for educational purposes only and is not medical advice. Patients should consult a qualified medical provider."

Selected sources:
${sources}`;
}

function extractText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = payload.output || [];
  const textParts = [];
  outputs.forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.type === "output_text" && content.text) {
        textParts.push(content.text);
      }
    });
  });

  return textParts.join("\n").trim();
}

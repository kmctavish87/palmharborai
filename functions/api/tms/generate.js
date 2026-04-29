const OPENAI_URL = "https://api.openai.com/v1/responses";

export async function onRequestPost(context) {
  const { request, env } = context;

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

    const prompt = buildPrompt({ items, contentType, tone });
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return Response.json(
        { error: payload.error?.message || "OpenAI request failed." },
        { status: response.status }
      );
    }

    const draft = extractText(payload);
    return Response.json({ draft });
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

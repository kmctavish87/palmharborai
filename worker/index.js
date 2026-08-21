import { getTmsPayload, isRefreshDue, refreshTmsData } from "../functions/_lib/tms-refresh.js";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGE_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";
const TMS_HOSTS = new Set(["tms.palmharborai.com"]);
const TMS_ASSET_PATHS = new Map([
  ["/", "/TMS/index.html"],
  ["/index.html", "/TMS/index.html"],
  ["/tms.css", "/TMS/tms.css"],
  ["/tms.js", "/TMS/tms.js"],
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/csccreative") {
      url.pathname = "/csccreative/";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/steeldash" || url.pathname.startsWith("/steeldash/")) {
      return proxySteelDashboard(request, env);
    }

    if (url.pathname === "/apply" || url.pathname.startsWith("/apply/")) {
      return proxyResumeTailor(request, env);
    }

    if (url.pathname === "/flightpal" || url.pathname.startsWith("/flightpal/")) {
      return proxyFlightPal(request, env);
    }

    if (url.pathname === "/api/tms" && request.method === "GET") {
      return handleTmsIndex(env, ctx);
    }

    if (url.pathname === "/api/tms/refresh" && request.method === "POST") {
      return handleTmsRefresh(request, env);
    }

    if (url.pathname === "/api/tms/generate" && request.method === "POST") {
      return handleTmsGenerate(request, env);
    }

    if (url.pathname === "/api/csccreative/status" && request.method === "GET") {
      return Response.json({ provider: env.OPENAI_API_KEY && env.CSC_CREATIVE_ACCESS_TOKEN ? "openai" : "mock", model: "gpt-image-2", protected: Boolean(env.CSC_CREATIVE_ACCESS_TOKEN) });
    }

    if (url.pathname === "/api/csccreative/image" && request.method === "POST") {
      return handleCreativeImage(request, env);
    }

    if (isTmsHost(url.hostname)) {
      return serveTmsHostAsset(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleCreativeImage(request, env) {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "OpenAI image editing is not configured on this deployment. Choose Mock mode in Settings." }, { status: 503 });
  }
  if (!env.CSC_CREATIVE_ACCESS_TOKEN) {
    return Response.json({ error: "OpenAI image editing is disabled until CSC Creative access protection is configured." }, { status: 503 });
  }
  if (request.headers.get("x-csc-access-code") !== env.CSC_CREATIVE_ACCESS_TOKEN) {
    return Response.json({ error: "The CSC Creative access code is missing or invalid." }, { status: 401 });
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 28 * 1024 * 1024) {
      return Response.json({ error: "This request is too large. Use a source and references totaling less than 28 MB." }, { status: 413 });
    }
    const form = await request.formData();
    const instruction = String(form.get("instruction") || "").trim();
    if (!instruction) return Response.json({ error: "A creative instruction is required." }, { status: 400 });

    const requestedAction = form.get("action") === "edit" ? "edit" : "generate";
    const width = Number(form.get("width") || 1024);
    const height = Number(form.get("height") || 1024);
    const size = normalizeCreativeImageSize(width, height);
    const quality = ["low", "medium", "high"].includes(String(form.get("quality"))) ? String(form.get("quality")) : "medium";
    const source = form.get("image");
    const references = form.getAll("reference").filter((item) => item instanceof File).slice(0, 3);
    const images = [source, ...references].filter((item) => item instanceof File && item.size > 0);
    const isEdit = images.length > 0;
    const prompt = buildCreativeImagePrompt({
      action: isEdit ? "edit" : requestedAction,
      instruction,
      projectName: String(form.get("projectName") || ""),
      brand: String(form.get("brand") || ""),
      campaign: String(form.get("campaign") || ""),
      brandContext: String(form.get("brandContext") || ""),
      brief: String(form.get("brief") || ""),
      width,
      height,
      referenceCount: references.length,
    });

    let apiRequest;
    if (isEdit) {
      const outgoing = new FormData();
      outgoing.set("model", "gpt-image-2");
      outgoing.set("prompt", prompt);
      outgoing.set("size", size);
      outgoing.set("quality", quality);
      outgoing.set("output_format", "png");
      images.forEach((image) => outgoing.append("image[]", image, image.name || "creative.png"));
      apiRequest = () => fetch(OPENAI_IMAGE_EDITS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: outgoing,
      });
    } else {
      apiRequest = () => fetch(OPENAI_IMAGE_GENERATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality, output_format: "png" }),
      });
    }

    let response = await apiRequest();
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      response = await apiRequest();
    }
    const payload = await response.json();
    if (!response.ok) {
      const moderationFailure = payload.error?.code === "content_policy_violation" || /safety|policy|moderation/i.test(payload.error?.message || "");
      return Response.json({
        error: moderationFailure ? "The image request could not be completed under the provider’s safety policy. Revise the instruction or source and try again." : userSafeImageError(response.status),
        requestId: response.headers.get("x-request-id") || undefined,
      }, { status: moderationFailure ? 422 : response.status });
    }
    const base64 = payload.data?.[0]?.b64_json;
    if (!base64) return Response.json({ error: "The image provider completed without returning an image." }, { status: 502 });
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    return new Response(bytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
        "x-creative-action": isEdit ? "AI revision" : "Generated concept",
        "x-creative-message": isEdit ? "Created a new, non-destructive image edit with OpenAI." : "Created a new starting concept with OpenAI.",
      },
    });
  } catch (error) {
    return Response.json({ error: "The image request could not be completed. Try again or enable local fallback." }, { status: 500 });
  }
}

function normalizeCreativeImageSize(width, height) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1024;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1024;
  const ratio = Math.min(3, Math.max(1 / 3, safeWidth / safeHeight));
  const targetPixels = 1572864;
  const rawWidth = Math.sqrt(targetPixels * ratio);
  const rawHeight = rawWidth / ratio;
  const normalizedWidth = Math.min(3840, Math.max(256, Math.round(rawWidth / 16) * 16));
  const normalizedHeight = Math.min(3840, Math.max(256, Math.round(rawHeight / 16) * 16));
  return `${normalizedWidth}x${normalizedHeight}`;
}

function buildCreativeImagePrompt({ action, instruction, projectName, brand, campaign, brandContext, brief, width, height, referenceCount }) {
  let parsedBrief = {};
  try { parsedBrief = brief ? JSON.parse(brief) : {}; } catch { parsedBrief = {}; }
  const referenceRule = referenceCount
    ? `Use the additional ${referenceCount} image${referenceCount === 1 ? "" : "s"} only as visual style references. Do not copy logos, people, or exact compositions from them.`
    : "No additional style reference was supplied.";
  return `You are a production image editor supporting a professional in-house designer.

Task: ${action === "edit" ? "Edit the first supplied image non-destructively." : "Create a polished starting concept."}
User instruction: ${instruction}
Project: ${projectName || "Untitled"}
Brand: ${brand || "Unspecified"}
Campaign: ${campaign || "Unspecified"}
Requested final canvas: ${width}x${height}. Compose for this aspect ratio with generous safe margins; the application may perform a final exact-size fit.

Creative brief:
Objective: ${parsedBrief.objective || "Not specified"}
Audience: ${parsedBrief.audience || "Not specified"}
Offer: ${parsedBrief.offer || "Not specified"}
Headline: ${parsedBrief.headline || "Not specified"}
Supporting copy: ${parsedBrief.supportingCopy || "Not specified"}
CTA: ${parsedBrief.cta || "Not specified"}
Creative direction: ${parsedBrief.creativeDirection || parsedBrief.description || "Not specified"}

Brand guidance:
${brandContext || "No saved brand guidance was supplied."}

Rules:
- Keep the primary concept, hierarchy, brand identity, and important subjects unless the instruction explicitly asks to change them.
- Never stretch a subject, logo, or typography. Recompose for the requested aspect ratio.
- Preserve existing text exactly unless the user asks to replace or remove it.
- Do not invent promotions, prices, legal claims, or terms.
- Make all visible text concise and legible. Include a required disclaimer from brand guidance when practical.
- ${referenceRule}
- Return one finished, production-oriented composition without a mockup frame or explanatory text.`;
}

function userSafeImageError(status) {
  if (status === 400) return "The provider could not use this image or instruction. Try a PNG/JPG source and a more specific request.";
  if (status === 429) return "The image provider is busy or the usage limit was reached. Try again shortly.";
  if (status === 401 || status === 403) return "The server-side image provider credential needs attention.";
  return "The image provider is temporarily unavailable. Try again or enable local fallback.";
}

function isTmsHost(hostname) {
  return TMS_HOSTS.has(hostname.toLowerCase());
}

function serveTmsHostAsset(request, env) {
  const url = new URL(request.url);
  const mappedPath = TMS_ASSET_PATHS.get(url.pathname);

  if (!mappedPath) {
    return env.ASSETS.fetch(request);
  }

  url.pathname = mappedPath;
  return env.ASSETS.fetch(new Request(url.toString(), request));
}

async function proxySteelDashboard(request, env) {
  if (!env.STEEL_DASHBOARD_ORIGIN) {
    return new Response("Steel dashboard origin is not configured.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const incomingUrl = new URL(request.url);
  const originUrl = new URL(env.STEEL_DASHBOARD_ORIGIN);
  const targetUrl = new URL(request.url);
  targetUrl.protocol = originUrl.protocol;
  targetUrl.hostname = originUrl.hostname;
  targetUrl.port = originUrl.port;
  targetUrl.username = "";
  targetUrl.password = "";

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  return fetch(proxyRequest);
}

async function proxyResumeTailor(request, env) {
  if (!env.RESUME_TAILOR_ORIGIN) {
    return new Response("Resume Tailor origin is not configured.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const incomingUrl = new URL(request.url);
  if (incomingUrl.pathname === "/apply") {
    incomingUrl.pathname = "/apply/";
    return Response.redirect(incomingUrl.toString(), 301);
  }

  const originUrl = new URL(env.RESUME_TAILOR_ORIGIN);
  const targetUrl = new URL(request.url);
  targetUrl.protocol = originUrl.protocol;
  targetUrl.hostname = originUrl.hostname;
  targetUrl.port = originUrl.port;
  targetUrl.username = "";
  targetUrl.password = "";

  const headers = new Headers(request.headers);
  headers.set("host", targetUrl.host);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  return fetch(proxyRequest);
}

async function proxyFlightPal(request, env) {
  if (!env.FLIGHTPAL_ORIGIN) {
    return new Response("FlightPal origin is not configured.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const incomingUrl = new URL(request.url);
  if (incomingUrl.pathname === "/flightpal") {
    incomingUrl.pathname = "/flightpal/";
    return Response.redirect(incomingUrl.toString(), 301);
  }

  const originUrl = new URL(env.FLIGHTPAL_ORIGIN);
  const targetUrl = new URL(request.url);
  targetUrl.protocol = originUrl.protocol;
  targetUrl.hostname = originUrl.hostname;
  targetUrl.port = originUrl.port;
  targetUrl.username = "";
  targetUrl.password = "";

  const headers = new Headers(request.headers);
  headers.set("host", targetUrl.host);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  return fetch(proxyRequest);
}

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

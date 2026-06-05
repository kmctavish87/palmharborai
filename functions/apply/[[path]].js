export async function onRequest(context) {
  const { env, request } = context;

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

  return fetch(
    new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    }),
  );
}

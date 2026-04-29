import { getTmsPayload, isRefreshDue, refreshTmsData } from "../../_lib/tms-refresh.js";

export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (await isRefreshDue(env)) {
      context.waitUntil(refreshTmsData(env));
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

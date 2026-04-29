import { refreshTmsData } from "../../_lib/tms-refresh.js";

export async function onRequestPost(context) {
  const { request, env } = context;
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

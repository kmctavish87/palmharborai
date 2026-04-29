import { REFRESH_INTERVAL_DAYS } from "./tms-config.js";
import { ensureTmsSchema, getHubData, getLastRefreshInfo, logRefresh, upsertNews, upsertStudies } from "./tms-db.js";
import { fetchNewsCandidates, fetchStudyCandidates } from "./tms-fetchers.js";
import { isoNow } from "./tms-utils.js";

export async function refreshTmsData(env) {
  const createdAt = isoNow();
  await ensureTmsSchema(env);

  const [studies, news] = await Promise.all([fetchStudyCandidates(env), fetchNewsCandidates(env)]);
  const studyResults = await upsertStudies(env, studies);
  const newsResults = await upsertNews(env, news);

  const message = `Refreshed ${studies.length} study candidates and ${news.length} news candidates.`;
  await logRefresh(env, {
    status: "success",
    message,
    studiesAdded: studyResults.added,
    studiesUpdated: studyResults.updated,
    newsAdded: newsResults.added,
    newsUpdated: newsResults.updated,
    createdAt,
  });

  return {
    ok: true,
    createdAt,
    message,
    studiesAdded: studyResults.added,
    studiesUpdated: studyResults.updated,
    newsAdded: newsResults.added,
    newsUpdated: newsResults.updated,
  };
}

export async function getTmsPayload(env) {
  await ensureTmsSchema(env);
  let { studies, news } = await getHubData(env);
  const lastRefresh = await getLastRefreshInfo(env);

  if (!studies.length && !news.length) {
    await refreshTmsData(env);
    ({ studies, news } = await getHubData(env));
  }

  const updated = await getLastRefreshInfo(env);

  return {
    studies,
    news,
    lastUpdated: updated?.created_at || lastRefresh?.created_at || null,
  };
}

export async function isRefreshDue(env) {
  await ensureTmsSchema(env);
  const lastRefresh = await getLastRefreshInfo(env);
  if (!lastRefresh?.created_at) {
    return true;
  }

  const elapsed = Date.now() - new Date(lastRefresh.created_at).getTime();
  return elapsed >= REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
}

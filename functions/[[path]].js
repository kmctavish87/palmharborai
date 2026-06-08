const TMS_HOSTS = new Set(["tms.palmharborai.com"]);
const TMS_ASSET_PATHS = new Map([
  ["/", "/TMS/index.html"],
  ["/index.html", "/TMS/index.html"],
  ["/tms.css", "/TMS/tms.css"],
  ["/tms.js", "/TMS/tms.js"],
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const mappedPath = TMS_ASSET_PATHS.get(url.pathname);

  if (!TMS_HOSTS.has(url.hostname.toLowerCase()) || !mappedPath) {
    return context.next();
  }

  url.pathname = mappedPath;
  return fetch(new Request(url.toString(), context.request));
}

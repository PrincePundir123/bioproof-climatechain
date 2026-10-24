// Next may normalize request.url to the server hostname. The Host header
// retains the authority the browser actually addressed (including its port).
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  if (!origin || origin !== `${url.protocol}//${host}`) {
    throw new Error("Invalid request origin");
  }
}

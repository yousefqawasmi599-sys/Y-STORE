const requests = new Map();
let operations = 0;

export function rateLimit(request, key, { limit = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  operations += 1;
  if (operations % 1000 === 0) {
    for (const [key, entry] of requests) {
      if (entry.resetAt <= now) requests.delete(key);
    }
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const bucketKey = `${key}:${clientIp}`;
  const bucket = requests.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    if (requests.size >= 50_000) {
      for (const [key, entry] of requests) {
        if (entry.resetAt <= now) requests.delete(key);
      }
    }
    requests.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= limit) {
    return Math.ceil((bucket.resetAt - now) / 1000);
  }

  bucket.count += 1;
  return null;
}

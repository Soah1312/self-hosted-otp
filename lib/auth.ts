export function validateApiKey(apiKeyHeader: string | null): boolean {
  const secretKey = process.env.API_SECRET_KEY;
  if (!secretKey) return false;
  return apiKeyHeader === secretKey;
}

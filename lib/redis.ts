import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client using HTTP-based REST API
// Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in your environment variables.
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Missing Upstash Redis environment variables");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

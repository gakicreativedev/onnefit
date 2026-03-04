/**
 * Simple in-memory rate limiter for Supabase Edge Functions.
 * Limits requests per user within a sliding time window.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
 *   // In your handler:
 *   const limited = limiter.check(userId);
 *   if (limited) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimiterOptions {
    /** Max requests allowed per window (default: 10) */
    maxRequests?: number;
    /** Window duration in ms (default: 60000 = 1 minute) */
    windowMs?: number;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
    const { maxRequests = 10, windowMs = 60_000 } = options;
    const entries = new Map<string, RateLimitEntry>();

    // Cleanup stale entries periodically
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of entries) {
            if (now > entry.resetAt) entries.delete(key);
        }
    }, windowMs * 2);

    return {
        /**
         * Check if the user has exceeded the rate limit.
         * Returns `true` if rate limited (should reject), `false` if allowed.
         */
        check(userId: string): boolean {
            const now = Date.now();
            const entry = entries.get(userId);

            if (!entry || now > entry.resetAt) {
                entries.set(userId, { count: 1, resetAt: now + windowMs });
                return false;
            }

            entry.count++;
            return entry.count > maxRequests;
        },

        /** Returns remaining requests for a user */
        remaining(userId: string): number {
            const entry = entries.get(userId);
            if (!entry || Date.now() > entry.resetAt) return maxRequests;
            return Math.max(0, maxRequests - entry.count);
        },
    };
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Simple API Key Authentication Middleware
 * For production, consider using JWT or NextAuth.js
 */

export const validateApiKey = (req: VercelRequest): boolean => {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = process.env.API_SECRET_KEY;

  if (!validKey) {
    console.warn('⚠️ API_SECRET_KEY not configured');
    return true; // Allow in development
  }

  return apiKey === validKey;
};

export const requireAuth = (handler: Function) => {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Skip auth for GET requests in development
    if (req.method === 'GET' && process.env.NODE_ENV !== 'production') {
      return handler(req, res);
    }

    // Validate API key for write operations
    if (['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
      if (!validateApiKey(req)) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key'
        });
      }
    }

    return handler(req, res);
  };
};

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or Upstash
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: VercelRequest, res: VercelResponse, next: Function) => {
    const ip = req.headers['x-forwarded-for'] as string || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((record.resetAt - now) / 1000)}s`
      });
    }

    record.count++;
    return next();
  };
};

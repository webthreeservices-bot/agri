import { z } from 'zod';
import { insertUserSchema, users, lots, transactions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        walletAddress: z.string(),
        signature: z.string(),
        sponsorAddress: z.string().optional(),
      }),
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  trading: {
    buyLot: {
      method: 'POST' as const,
      path: '/api/trading/buy',
      input: z.object({
        type: z.number().int().min(1).max(4),
      }),
      responses: {
        200: z.object({ 
          lot: z.custom<typeof lots.$inferSelect>(),
          soldLot: z.custom<typeof lots.$inferSelect>().optional(), // If a trigger happened
          message: z.string()
        }),
        400: errorSchemas.validation,
      },
    },
    upgrade: {
      method: 'POST' as const,
      path: '/api/trading/upgrade',
      responses: {
        200: z.object({ 
          user: z.custom<typeof users.$inferSelect>(),
          message: z.string() 
        }),
        400: errorSchemas.validation,
      },
    },
    getLots: {
      method: 'GET' as const,
      path: '/api/trading/lots',
      responses: {
        200: z.array(z.custom<typeof lots.$inferSelect>()),
      },
    },
    getQueueCounts: {
      method: 'GET' as const,
      path: '/api/trading/queue-counts',
      responses: {
        200: z.object({
          '1': z.object({ buy: z.number(), sell: z.number() }),
          '2': z.object({ buy: z.number(), sell: z.number() }),
          '3': z.object({ buy: z.number(), sell: z.number() }),
          '4': z.object({ buy: z.number(), sell: z.number() }),
        }),
      },
    },
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
    withdraw: {
      method: 'POST' as const,
      path: '/api/withdraw',
      input: z.object({
        amount: z.number().positive(),
        address: z.string(),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    // Admin only
    deposit: {
      method: 'POST' as const,
      path: '/api/admin/deposit',
      input: z.object({
        userId: z.number(),
        amount: z.number().positive(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    getConfig: {
      method: 'GET' as const,
      path: '/api/admin/config',
      responses: {
        200: z.custom<any>(),
      },
    },
    updateConfig: {
      method: 'POST' as const,
      path: '/api/admin/config',
      input: z.any(),
      responses: {
        200: z.custom<any>(),
      },
    },
    // User Management
    updateUser: {
      method: 'POST' as const,
      path: '/api/admin/users/:id',
      input: z.object({
        balance: z.string().optional(),
        packageLevel: z.number().optional(),
        directReferrals: z.number().optional(),
        totalLotsBought: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    listUsers: {
      method: 'GET' as const,
      path: '/api/admin/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    getUser: {
      method: 'GET' as const,
      path: '/api/admin/users/:id',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

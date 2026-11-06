import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import type { UserContext } from '../security.types.js';

export interface IdentityServiceOptions {
  prismaClient?: PrismaClient;
}

export class IdentityService {
  private readonly prisma: PrismaClient;

  constructor(options: IdentityServiceOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
  }

  /**
   * Resolves a user identity from request headers (x-user-id or bearer authorization).
   */
  async resolveUser(headers: Record<string, string | string[] | undefined>): Promise<UserContext | null> {
    const rawUserId = headers['x-user-id'];
    const authHeader = headers['authorization'];

    let userId: string | null = null;

    if (typeof rawUserId === 'string' && rawUserId.trim().length > 0) {
      userId = rawUserId.trim();
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      // For token patterns (e.g. user_id or test tokens)
      if (token.startsWith('user_') || token.startsWith('cuid_') || token.length >= 5) {
        userId = token;
      }
    }

    if (!userId) {
      return null;
    }

    // Look up user in database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}


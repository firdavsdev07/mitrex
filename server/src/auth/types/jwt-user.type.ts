import { UserRole } from '@metrix/prisma-client';

// JwtStrategy#validate() qaytaradigan shakl — JwtGuard bilan himoyalangan
// so'rovlarda req.user shu ko'rinishda bo'ladi.
export interface JwtUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  deletedAt: Date | null;
}

export interface AuthenticatedRequest {
  user: JwtUser;
}

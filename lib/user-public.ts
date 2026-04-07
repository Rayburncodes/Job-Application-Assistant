import type { Prisma } from "@prisma/client";

export const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  workHistory: true,
  skills: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

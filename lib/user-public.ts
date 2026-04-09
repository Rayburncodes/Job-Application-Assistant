import type { Prisma } from "@prisma/client";

export const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  linkedinUrl: true,
  githubUrl: true,
  resumeText: true,
  workHistory: true,
  skills: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

/** Select public fields plus PDF blob (for deriving hasResumePdf; never send bytes to the client). */
export const userPublicWithResumePdfSelect = {
  ...userPublicSelect,
  resumePdf: true,
} satisfies Prisma.UserSelect;

export type UserPublicWithResumePdf = Prisma.UserGetPayload<{
  select: typeof userPublicWithResumePdfSelect;
}>;

export function userPublicForClient(user: UserPublicWithResumePdf) {
  const { resumePdf, ...rest } = user;
  return {
    ...rest,
    hasResumePdf: resumePdf != null && resumePdf.length > 0,
  };
}

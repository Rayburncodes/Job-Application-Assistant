/** Max length for stored resume plain text. */
export const MAX_RESUME_TEXT_CHARS = 200_000;

export function validateResumeTextPayload(input: unknown): string | null {
  if (input === undefined) return null;
  if (typeof input !== "string") return null;
  if (input.length > MAX_RESUME_TEXT_CHARS) return null;
  return input;
}

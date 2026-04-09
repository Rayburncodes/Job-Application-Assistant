import { PDFParse } from "pdf-parse";

/** Extract plain text from a PDF buffer (Node / API routes only). */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result.text ?? "").trim();
  } finally {
    await parser.destroy();
  }
}

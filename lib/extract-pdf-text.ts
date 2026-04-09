import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";

/**
 * Client-only: loads pdfjs in the browser to pull text from a PDF buffer.
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch {
    throw new Error("Could not open PDF (corrupt, encrypted, or not a PDF).");
  }

  const pageTexts: string[] = [];
  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const line = content.items
        .map((item: TextItem | TextMarkedContent) =>
          "str" in item && typeof item.str === "string" ? item.str : ""
        )
        .filter(Boolean)
        .join(" ");
      if (line.trim()) pageTexts.push(line.trim());
    }
    return pageTexts.join("\n\n").trim();
  } finally {
    await pdf.destroy().catch(() => {});
  }
}

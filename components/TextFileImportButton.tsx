"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { extractTextFromPdf } from "@/lib/extract-pdf-text";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "text",
  "md",
  "markdown",
  "csv",
  "json",
  "log",
]);

const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

type TextFileImportButtonProps = {
  id: string;
  /** Replaces the target field with decoded file text (UTF-8 or PDF extract). */
  onImported: (text: string) => void;
  disabled?: boolean;
  /** If true, only PDF uploads are allowed (no .txt / paste workflow). */
  pdfOnly?: boolean;
};

export function TextFileImportButton({
  id,
  onImported,
  disabled,
  pdfOnly = false,
}: TextFileImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openPicker() {
    if (disabled || busy) return;
    setError(null);
    inputRef.current?.click();
  }

  async function processFile(file: File) {
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
      : "";
    const isPdf = file.type === "application/pdf" || ext === "pdf";

    if (pdfOnly && !isPdf) {
      setError("Only PDF files are allowed.");
      return;
    }

    if (isPdf) {
      if (file.size > MAX_PDF_BYTES) {
        setError("PDF is too large (max 8 MB).");
        return;
      }
    } else {
      if (file.size > MAX_TEXT_BYTES) {
        setError("File is too large (max 2 MB).");
        return;
      }
    }

    const mimeOk =
      file.type.startsWith("text/") || file.type === "application/json";
    const textExtOk = TEXT_EXTENSIONS.has(ext);

    if (isPdf) {
      setBusy(true);
      setError(null);
      try {
        const buf = await file.arrayBuffer();
        const text = await extractTextFromPdf(buf);
        if (!text.trim()) {
          setError("No text found in this PDF (it may be scanned images only).");
          return;
        }
        onImported(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not read PDF.";
        setError(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (pdfOnly) {
      return;
    }

    if (!mimeOk && !textExtOk) {
      setError("Use .pdf or a plain text file (.txt, .md, .csv, .json).");
      return;
    }

    try {
      const text = await file.text();
      setError(null);
      onImported(text);
    } catch {
      setError("Could not read that file.");
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void processFile(file);
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={
          pdfOnly
            ? [".pdf", "application/pdf"].join(",")
            : [
                ".pdf",
                "application/pdf",
                ".txt",
                ".text",
                ".md",
                ".markdown",
                ".csv",
                ".json",
                ".log",
                "text/plain",
                "application/json",
              ].join(",")
        }
        onChange={onChange}
        disabled={disabled || busy}
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || busy}
        className="btn-secondary py-1.5 text-xs font-semibold"
        title={
          pdfOnly
            ? "PDF only, max 8 MB"
            : "PDF (max 8 MB) or plain text: .txt, .md, .csv, .json (max 2 MB)"
        }
      >
        {busy ? "Reading PDF…" : pdfOnly ? "Import PDF" : "Import file"}
      </button>
      {error ? (
        <span className="max-w-[220px] text-right text-[11px] font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}

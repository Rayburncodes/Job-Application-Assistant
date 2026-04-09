import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { extractTextFromPdfBuffer } from "@/lib/extract-pdf-text-server";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { MAX_RESUME_TEXT_CHARS } from "@/lib/resume-text";
import {
  userPublicForClient,
  userPublicWithResumePdfSelect,
} from "@/lib/user-public";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

function isPdfMagic(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return (
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  );
}

export async function GET(request: NextRequest) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { resumePdf: true },
    });
    const pdf = user?.resumePdf;
    if (!pdf || pdf.length === 0) {
      return NextResponse.json({ error: "No resume PDF on file." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    logError("api.users.me.resume.GET", e);
    return NextResponse.json({ error: "Could not load resume." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    logError("api.users.me.resume.POST formData", e);
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field (PDF)." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF is too large (max 8 MB)." }, { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch (e) {
    logError("api.users.me.resume.POST read file", e);
    return NextResponse.json({ error: "Could not read upload." }, { status: 400 });
  }

  if (!isPdfMagic(buf)) {
    return NextResponse.json({ error: "Upload must be a PDF file." }, { status: 400 });
  }

  let extracted: string;
  try {
    extracted = await extractTextFromPdfBuffer(buf);
  } catch (e) {
    logError("api.users.me.resume.POST extract", e);
    return NextResponse.json(
      { error: "Could not read that PDF (corrupt or password-protected?)." },
      { status: 400 }
    );
  }

  if (extracted.length > MAX_RESUME_TEXT_CHARS) {
    return NextResponse.json(
      {
        error: `Extracted text exceeds ${MAX_RESUME_TEXT_CHARS.toLocaleString()} characters.`,
      },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: sessionUserId },
      data: {
        resumePdf: buf,
        resumeText: extracted.length > 0 ? extracted : null,
      },
      select: userPublicWithResumePdfSelect,
    });
    return NextResponse.json({ user: userPublicForClient(user) });
  } catch (e) {
    logError("api.users.me.resume.POST prisma", e);
    return NextResponse.json({ error: "Could not save resume." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: sessionUserId },
      data: { resumePdf: null, resumeText: null },
      select: userPublicWithResumePdfSelect,
    });
    return NextResponse.json({ user: userPublicForClient(user) });
  } catch (e) {
    logError("api.users.me.resume.DELETE", e);
    return NextResponse.json({ error: "Could not remove resume." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { toText } from "@/lib/wardrobe";

const MAX_OUTFIT_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 12;

function sanitizeExtension(fileName: string): string {
  const raw = fileName.trim();
  if (!raw) return "";

  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex < 0) return "";

  const extension = raw.slice(dotIndex).toLowerCase();
  if (!/^\.[a-z0-9]{1,10}$/.test(extension)) return "";
  return extension;
}

function parseFileSize(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value <= 0) return null;
  return value;
}

type UploadFileInput = {
  fileName: string;
  contentType: string;
  fileSize: number | null;
};

type UploadTicket = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  publicUrl: string;
};

function normalizePathSegment(value: string): string {
  const raw = value.trim();
  if (!raw) return "anonymous";
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "anonymous";
}

function parseUploadFiles(payload: Record<string, unknown>): UploadFileInput[] {
  const rawFiles = Array.isArray(payload.files) ? payload.files : [payload];
  const files = rawFiles
    .map((entry) => (typeof entry === "object" && entry ? (entry as Record<string, unknown>) : null))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

  return files.map((entry) => ({
    fileName: toText(entry.fileName),
    contentType: toText(entry.contentType).toLowerCase(),
    fileSize: parseFileSize(entry.fileSize),
  }));
}

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "요청 본문 형식이 올바르지 않아요." }, { status: 400 });
  }

  const files = parseUploadFiles(payload);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "최소 한 개 이상의 파일이 필요해요." }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { ok: false, error: `사진은 한 번에 최대 ${MAX_FILES_PER_REQUEST}개까지 업로드할 수 있어요.` },
      { status: 400 },
    );
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file.contentType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: `이미지 파일만 업로드할 수 있어요. (파일 #${index + 1})` },
        { status: 400 },
      );
    }
    if (file.fileSize != null && file.fileSize > MAX_OUTFIT_PHOTO_BYTES) {
      return NextResponse.json(
        { ok: false, error: `각 사진은 ${Math.round(MAX_OUTFIT_PHOTO_BYTES / (1024 * 1024))}MB 이하여야 해요.` },
        { status: 413 },
      );
    }
  }

  try {
    const admin = createServiceRoleSupabaseClient();
    const bucket = getSupabaseBucket();
    const authUserIdSegment = normalizePathSegment(toText(authUser.id));

    const tickets = await Promise.all(files.map(async (file) => {
      const extension = sanitizeExtension(file.fileName);
      const objectPath = `outfits/${authUserIdSegment}/${crypto.randomUUID().replace(/-/g, "")}${extension}`;
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath);
      if (error || !data?.token) {
        throw new Error(error?.message || "서명 업로드 URL 생성에 실패했어요.");
      }
      const signedUrl = toText(data.signedUrl);
      if (!signedUrl) {
        throw new Error("서명 업로드 URL 생성에 실패했어요.");
      }

      const { data: publicData } = admin.storage.from(bucket).getPublicUrl(data.path || objectPath);
      const publicUrl = toText(publicData.publicUrl);
      if (!publicUrl) {
        throw new Error("공개 URL을 확인하지 못했어요.");
      }

      return {
        bucket,
        path: data.path || objectPath,
        token: data.token,
        signedUrl,
        publicUrl,
      } as UploadTicket;
    }));

    return NextResponse.json({
      ok: true,
      ticket: tickets[0] || null,
      tickets,
      maxFileBytes: MAX_OUTFIT_PHOTO_BYTES,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "업로드 준비에 실패했어요.",
      },
      { status: 500 },
    );
  }
}

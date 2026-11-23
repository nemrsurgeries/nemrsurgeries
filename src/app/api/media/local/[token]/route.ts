import fs from "fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import {
  resolveSafeLocalPath,
  verifyLocalStorageToken,
} from "@/lib/storage/local-provider";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { token } = await context.params;
  const payload = verifyLocalStorageToken(decodeURIComponent(token));
  if (!payload) {
    return NextResponse.json(
      { error: "Signed URL is invalid or has expired." },
      { status: 403 },
    );
  }

  try {
    const filePath = resolveSafeLocalPath(payload.key);
    const bytes = await fs.readFile(filePath);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      payload.contentType ?? "application/octet-stream",
    );
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    if (payload.downloadFilename) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${payload.downloadFilename.replace(/"/g, "")}"`,
      );
    } else {
      headers.set("Content-Disposition", "inline");
    }

    return new NextResponse(bytes, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

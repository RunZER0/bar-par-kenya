import { describe, expect, it } from "vitest";
import { createR2MediaStorage } from "../src/media-storage.js";

describe("R2 media storage", () => {
  const storage = createR2MediaStorage({
    accountId: "0123456789abcdef",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucket: "bar-par-kenya-test",
  });

  it("creates a short-lived, operation-specific upload grant without network access", async () => {
    const grant = await storage.createUploadGrant({
      objectKey: "resources/example.pdf",
      contentType: "application/pdf",
      expiresInSeconds: 600,
    });
    const url = new URL(grant.uploadUrl);
    expect(url.hostname).toBe("bar-par-kenya-test.0123456789abcdef.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/resources/example.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(grant.requiredHeaders).toEqual({ "Content-Type": "application/pdf" });
  });

  it("creates a separate read-only download grant", async () => {
    const grant = await storage.createDownloadGrant({
      objectKey: "resources/example.pdf",
      expiresInSeconds: 300,
    });
    const url = new URL(grant.downloadUrl);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(grant.objectKey).toBe("resources/example.pdf");
  });
});

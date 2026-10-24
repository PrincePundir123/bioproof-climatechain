export function validateFile(bytes: Uint8Array, mime: string) {
  if (bytes.length < 8 || bytes.length > 5242880)
    throw new Error("File size must be between 8 bytes and 5 MB");
  const hex = Array.from(bytes.slice(0, 8), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  const valid =
    (mime === "image/png" && hex === "89504e470d0a1a0a") ||
    (mime === "image/jpeg" && hex.startsWith("ffd8ff")) ||
    (mime === "application/pdf" &&
      new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-");
  if (!valid) throw new Error("Invalid file contents or MIME type");
}

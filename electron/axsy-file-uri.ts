import { join } from "path";

export const AXSY_FILE_SCHEME = "axsy-file";

/**
 * URI for a camera capture stored in the app temp directory.
 * Format: axsy-file://camera/{filename}
 */
export function cameraUri(filename: string): string {
  return `${AXSY_FILE_SCHEME}://camera/${encodeURIComponent(filename)}`;
}

/**
 * URI for a file selected via the document or image picker.
 * Format: axsy-file://picker{absolutePath}
 */
export function pickerUri(absolutePath: string): string {
  const encoded = absolutePath.split("/").map(encodeURIComponent).join("/");
  return `${AXSY_FILE_SCHEME}://picker${encoded}`;
}

/**
 * Resolves an axsy-file:// URI to an absolute filesystem path.
 * @param uri     An axsy-file:// URI produced by cameraUri() or pickerUri()
 * @param tempDir The application temp directory (app.getPath("temp"))
 */
export function resolveUri(uri: string, tempDir: string): string {
  const url = new URL(uri);
  const pathname = decodeURIComponent(url.pathname);
  if (url.hostname === "camera") {
    return join(tempDir, "camera-captures", pathname.slice(1));
  }
  if (url.hostname === "picker") {
    return pathname;
  }
  throw new Error(`Unknown ${AXSY_FILE_SCHEME} host: "${url.hostname}"`);
}

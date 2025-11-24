import fs from "node:fs";
import path from "node:path";
import type { UploadResult, UploadFileItem } from "../types";

type Headers = { [name: string]: string };

interface UploadParams {
  toUrl: string;
  files: UploadFileItem[];
  headers?: Headers;
  fields?: { [name: string]: string };
  method?: string;
  onUploadBegin?: () => void;
  onUploadProgress?: (
    totalBytesExpectedToSend: number,
    totalBytesSent: number
  ) => void;
  onUploadComplete?: (result: UploadResult) => void;
}

export class Uploader {
  private abort: boolean = false;

  public stop(): void {
    this.abort = true;
  }

  public async upload(params: UploadParams): Promise<UploadResult> {
    const result: UploadResult = {
      jobId: 0, // Will be set by caller
      statusCode: 0,
      headers: {},
      body: ""
    };

    try {
      await this.performUpload(params, result);
      if (params.onUploadComplete) {
        params.onUploadComplete(result);
      }
    } catch (error) {
      if (params.onUploadComplete) {
        params.onUploadComplete(result);
      }
      throw error;
    }

    return result;
  }

  private async performUpload(
    params: UploadParams,
    result: UploadResult
  ): Promise<void> {
    const crlf = "\r\n";
    const twoHyphens = "--";
    const boundary = "*****";
    const tail = crlf + twoHyphens + boundary + twoHyphens + crlf;

    let metadata = "";
    let stringData = "";
    const fileHeaders: string[] = [];
    let fileCount = 0;
    let totalFileLength = 0;

    // Build fields metadata
    if (params.fields) {
      for (const [key, value] of Object.entries(params.fields)) {
        metadata +=
          twoHyphens +
          boundary +
          crlf +
          'Content-Disposition: form-data; name="' +
          key +
          '"' +
          crlf +
          crlf +
          value +
          crlf;
      }
    }
    stringData += metadata;

    // Build file headers and calculate total file length
    for (const file of params.files) {
      const name = file.name;
      const filename = file.filename;
      let filetype = file.filetype;

      // Get MIME type from filepath if not provided
      if (!filetype) {
        filetype = this.getMimeType(file.filepath);
      }

      const fileStat = await fs.promises.stat(file.filepath);
      const fileLength = fileStat.size;
      totalFileLength += fileLength;

      // Add tail length for the last file
      if (fileCount === params.files.length - 1) {
        totalFileLength += tail.length;
      }

      const fileHeaderType =
        twoHyphens +
        boundary +
        crlf +
        'Content-Disposition: form-data; name="' +
        name +
        '"; filename="' +
        filename +
        '"' +
        crlf +
        "Content-Type: " +
        filetype +
        crlf;
      const fileLengthHeader = "Content-length: " + fileLength + crlf;
      const fileHeader = fileHeaderType + fileLengthHeader + crlf;

      fileHeaders.push(fileHeader);
      stringData += fileHeader;
      fileCount++;
    }

    // Calculate total request length
    const requestLength =
      totalFileLength + stringData.length + params.files.length * crlf.length;

    // Call onUploadBegin callback
    if (params.onUploadBegin) {
      params.onUploadBegin();
    }

    // Create a ReadableStream for the request body
    const encoder = new TextEncoder();
    let byteSentTotal = 0;
    const uploader = this;

    const stream = new ReadableStream({
      start(controller) {
        // Enqueue metadata
        const metadataBytes = encoder.encode(metadata);
        controller.enqueue(metadataBytes);

        // Process files asynchronously
        (async () => {
          try {
            fileCount = 0;
            for (const file of params.files) {
              // Check if aborted
              if (uploader.abort) {
                controller.error(new Error("Upload aborted"));
                return;
              }

              // Enqueue file header
              const fileHeaderBytes = encoder.encode(fileHeaders[fileCount]);
              controller.enqueue(fileHeaderBytes);

              // Stream file content in chunks
              const fileStat = await fs.promises.stat(file.filepath);
              const fileStream = fs.createReadStream(file.filepath, {
                highWaterMark: Math.max(Math.ceil(fileStat.size / 100), 8192)
              });

              await new Promise<void>((resolve, reject) => {
                fileStream.on("data", (chunk: string | Buffer) => {
                  if (uploader.abort) {
                    fileStream.destroy();
                    controller.error(new Error("Upload aborted"));
                    reject(new Error("Upload aborted"));
                    return;
                  }

                  const buffer = Buffer.isBuffer(chunk)
                    ? chunk
                    : Buffer.from(chunk);
                  controller.enqueue(buffer);
                  byteSentTotal += buffer.length;

                  // Report progress
                  if (params.onUploadProgress) {
                    params.onUploadProgress(
                      totalFileLength - tail.length,
                      byteSentTotal
                    );
                  }
                });

                fileStream.on("end", () => {
                  // Enqueue CRLF after file
                  controller.enqueue(encoder.encode(crlf));
                  fileCount++;
                  resolve();
                });

                fileStream.on("error", error => {
                  reject(error);
                });
              });
            }

            // Enqueue tail
            controller.enqueue(encoder.encode(tail));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        })();
      }
    });

    // Prepare headers
    const headers: Headers = {
      "Content-Type": "multipart/form-data;boundary=" + boundary,
      "Content-length": String(requestLength),
      ...(params.headers || {})
    };

    // Make the request
    const response = await fetch(params.toUrl, {
      method: params.method || "POST",
      headers: headers,
      body: stream
    });

    // Read response
    const responseBody = await response.text();
    const responseHeaders: Headers = {};

    // Convert Headers object to plain object
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    result.statusCode = response.status;
    result.headers = responseHeaders;
    result.body = responseBody;
  }

  private getMimeType(filepath: string): string {
    const ext = path.extname(filepath).toLowerCase().slice(1); // Remove the dot

    // Common MIME types mapping
    const mimeTypes: { [key: string]: string } = {
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      json: "application/json",
      xml: "application/xml",
      pdf: "application/pdf",
      zip: "application/zip",
      gz: "application/gzip",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      wmv: "video/x-ms-wmv",
      flv: "video/x-flv",
      webm: "video/webm"
    };

    return mimeTypes[ext] || "*/*";
  }
}

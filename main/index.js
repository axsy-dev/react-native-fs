/**
 * Electron main process entry point for react-native-fs.
 *
 * Exports:
 * - filesystem: full IPC bridge for RNFS operations (mkdir, copyFile, readFile, etc.)
 *   Ported from src/electron/main.ts in the axsy-dev/react-native-fs git version.
 * - rnfsCompat: additional IPC handlers (copyToPictures, readFileAsBase64, writeFileBase64)
 *   From the electron-shims development branch.
 */

import { ipcMain, app } from "electron";
import { copyFile, readFile, writeFile, mkdir, rename, unlink, access, appendFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import { basename, join, sep } from "path";
import { statfs } from "fs/promises";
import os from "os";

// ============================================================================
// filesystem — full IPC bridge
// ============================================================================

const RNFSFileTypeRegular = 0;
const RNFSFileTypeDirectory = 1;

function getPathsConfig() {
  const resourcesPath = app.isPackaged
    ? process.resourcesPath
    : join(app.getAppPath(), "..", "resources");
  return {
    RNFSSeparator: sep,
    RNFSDocumentDirectoryPath: app.getPath("userData"),
    RNFSTemporaryDirectoryPath: app.getPath("temp"),
    RNFSPicturesDirectoryPath: app.getPath("pictures"),
    RNFSDownloadDirectoryPath: app.getPath("downloads"),
    RNFSFileTypeRegular: true,
    RNFSFileTypeDirectory: true,
    RNFSCachesDirectoryPath: null,
    RNFSExternalDirectoryPath: null,
    RNFSExternalStorageDirectoryPath: null,
    RNFSExternalCachesDirectoryPath: null,
    RNFSResourcesPath: resourcesPath,
    RNFSMainBundlePath: app.getAppPath()
  };
}

async function ipcMkdir(_event, dirpath, _options) {
  try {
    await mkdir(dirpath, { recursive: true });
  } catch {
    // swallow error
  }
}

async function ipcMoveFile(_event, filepath, destPath, _options) {
  await rename(filepath, destPath);
}

async function ipcCopyFile(_event, filepath, destPath, _options) {
  await copyFile(filepath, destPath);
}

async function ipcUnlink(_event, filepath) {
  try {
    await unlink(filepath);
  } catch {
    // swallow error
  }
}

async function ipcExists(_event, filepath) {
  try {
    await access(filepath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ipcReadFile(_event, filepath, _options) {
  return (await readFile(filepath)).toString("base64");
}

async function ipcWriteFile(_event, filepath, contents, options) {
  // contents is always base64-encoded by the RNFS module before IPC
  const encoding = typeof options === "string" ? options : options?.encoding;
  let decodedContents;
  if (encoding === "base64") {
    // Content is already base64 and should be written as a base64 string (UTF-8 text)
    decodedContents = contents;
  } else {
    // Content was encoded to base64 by RNFS, decode it back
    decodedContents = Buffer.from(contents, "base64");
  }
  await writeFile(
    filepath,
    decodedContents,
    encoding === "base64" ? "utf8" : encoding
  );
}

async function ipcInitPaths(_event) {
  return getPathsConfig();
}

async function ipcReadDir(_event, dirPath) {
  const { opendir } = await import("fs/promises");
  const dirEntries = await opendir(dirPath);
  const entries = [];
  for await (const dirEntry of dirEntries) {
    const result = await ipcGetStat(join(dirPath, dirEntry.name));
    entries.push(result);
  }
  return entries;
}

async function ipcGetStat(filepath) {
  const { stat } = await import("fs/promises");
  const fileStat = await stat(filepath);
  return {
    name: basename(filepath),
    path: filepath,
    ctime: fileStat.ctimeMs,
    mtime: fileStat.mtimeMs,
    size: fileStat.size,
    type: fileStat.isFile() ? RNFSFileTypeRegular : RNFSFileTypeDirectory
  };
}

async function ipcAppendFile(_event, filepath, contents) {
  await appendFile(filepath, contents, "base64");
}

async function ipcStat(_event, filepath) {
  return await ipcGetStat(filepath);
}

async function ipcDownloadFile(_event, options) {
  const request = new Request(options.fromUrl, {
    headers: new Headers({
      ...options.headers,
      "Content-Type": "application/octet-stream"
    })
  });

  const response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const body = response.body;
  if (!body) {
    throw new Error("Body not found");
  }

  const { open } = await import("fs/promises");
  const reader = body.getReader();
  const fd = await open(options.toFile, "w");
  const writer = fd.createWriteStream();

  let bytesDone = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = result.value;
      if (!chunk) throw new Error("Empty chunk");
      await new Promise((resolve, reject) => {
        writer.write(chunk, err => (err ? reject(err) : resolve(undefined)));
      });
      bytesDone += chunk.length;
    }
  } catch (error) {
    writer.destroy();
    throw error;
  }

  writer.end();
  await fd.close();

  return {
    jobId: options.jobId,
    statusCode: response.status,
    bytesWritten: bytesDone
  };
}

async function ipcGetFSInfo(_event) {
  const st = await statfs(os.homedir());
  return {
    freeSpace: st.blocks * st.bsize,
    totalSpace: st.bfree * st.bsize
  };
}

export const filesystem = {
  main: {
    init() {
      const handlers = {
        mkdir: ipcMkdir,
        moveFile: ipcMoveFile,
        copyFile: ipcCopyFile,
        unlink: ipcUnlink,
        exists: ipcExists,
        readFile: ipcReadFile,
        writeFile: ipcWriteFile,
        readDir: ipcReadDir,
        appendFile: ipcAppendFile,
        stat: ipcStat,
        downloadFile: ipcDownloadFile,
        getFSInfo: ipcGetFSInfo
      };
      for (const [key, fn] of Object.entries(handlers)) {
        ipcMain.removeHandler(`axsy:fs:${key}`);
        ipcMain.handle(`axsy:fs:${key}`, fn);
      }
      ipcMain.removeHandler("axsy:fs:initPaths");
      ipcMain.handle("axsy:fs:initPaths", ipcInitPaths);
      ipcMain.removeAllListeners("axsy:fs:initPathsSync");
      ipcMain.on("axsy:fs:initPathsSync", event => {
        event.returnValue = getPathsConfig();
      });
    }
  }
};

// ============================================================================
// rnfsCompat — additional IPC handlers
// ============================================================================

const COPY_TO_PICTURES = "axsy:fs:copyToPictures";
const READ_FILE_AS_BASE64 = "axsy:fs:readFileAsBase64";
const WRITE_FILE_BASE64 = "axsy:fs:writeFileBase64";

const AXSY_FILE_SCHEME = "axsy-file";

function resolveUri(uri, tempDir) {
  if (uri.startsWith(`${AXSY_FILE_SCHEME}://camera/`)) {
    const filename = basename(uri.slice(`${AXSY_FILE_SCHEME}://camera/`.length));
    return join(tempDir, "camera-captures", filename);
  }
  if (uri.startsWith(`${AXSY_FILE_SCHEME}://picker`)) {
    return uri.slice(`${AXSY_FILE_SCHEME}://picker`.length);
  }
  return uri;
}

async function copyToPictures(_event, uri) {
  try {
    const filePath = resolveUri(uri, app.getPath("temp"));
    const picturesDir = app.getPath("pictures");
    const destPath = join(picturesDir, basename(filePath));
    await copyFile(filePath, destPath);
    return true;
  } catch {
    return false;
  }
}

async function readFileAsBase64(_event, uri) {
  let filePath;
  if (uri.startsWith(`${AXSY_FILE_SCHEME}://`)) {
    filePath = resolveUri(uri, app.getPath("temp"));
  } else if (uri.startsWith("file://")) {
    filePath = new URL(uri).pathname;
  } else {
    filePath = uri;
  }
  return (await readFile(filePath)).toString("base64");
}

async function writeFileBase64(_event, filepath, base64Data) {
  await writeFile(filepath, Buffer.from(base64Data, "base64"));
}

export const rnfsCompat = {
  main: {
    init() {
      ipcMain.removeHandler(COPY_TO_PICTURES);
      ipcMain.handle(COPY_TO_PICTURES, copyToPictures);
      ipcMain.removeHandler(READ_FILE_AS_BASE64);
      ipcMain.handle(READ_FILE_AS_BASE64, readFileAsBase64);
      ipcMain.removeHandler(WRITE_FILE_BASE64);
      ipcMain.handle(WRITE_FILE_BASE64, writeFileBase64);
    }
  }
};

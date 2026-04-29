import { ipcMain, app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type {
  DownloadBridgeOptions,
  FileOptions,
  MkdirOptions,
  ReadDirEntry
} from "../types";
import type { IpcMainInvokeEvent } from "electron";
import type { ObjectEncodingOptions, WriteStream } from "node:fs";

const RNFSFileTypeRegular = 0;
const RNFSFileTypeDirectory = 1;

function getPathsConfig() {
  const resourcesPath = app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), "..", "resources");
  return {
    RNFSSeparator: path.sep,
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

async function mkdir(
  _event: IpcMainInvokeEvent,
  dirpath: string,
  _options: MkdirOptions
) {
  try {
    await fs.mkdir(dirpath, { recursive: true });
  } catch (e) {
    // swallow error
  }
}

async function moveFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  destPath: string,
  _options: FileOptions
) {
  try {
    await fs.rename(filepath, destPath);
  } catch {
    // swallow error
  }
}

async function copyFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  destPath: string,
  _options: FileOptions
) {
  try {
    await fs.copyFile(filepath, destPath);
  } catch {
    // swallow error
  }
}

async function unlink(_event: IpcMainInvokeEvent, filepath: string) {
  try {
    await fs.unlink(filepath);
  } catch (e) {
    // swallow error
  }
}

async function exists(
  _event: IpcMainInvokeEvent,
  filepath: string
): Promise<boolean> {
  try {
    await fs.access(filepath, fs.constants.F_OK);
  } catch (err) {
    return false;
  }
  return true;
}

async function readFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  _options: FileOptions
) {
  try {
    return await fs.readFile(filepath, "base64");
  } catch {
    return "";
  }
}

async function writeFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  contents: string,
  _options: ObjectEncodingOptions
) {
  try {
    // RNFS index.ts always base64-encodes content before passing to native modules.
    // Decode back to a raw Buffer and write binary.
    const decodedContents = Buffer.from(contents, "base64");
    await fs.writeFile(filepath, decodedContents);
  } catch {
    // swallow error
  }
}

async function initPaths(_event: IpcMainInvokeEvent) {
  return getPathsConfig();
}

async function readDir(
  _event: IpcMainInvokeEvent,
  dirPath: string
): Promise<ReadDirEntry[]> {
  try {
    const dirEntries = await fs.opendir(dirPath);

    const entries: ReadDirEntry[] = [];

    for await (const dirEntry of dirEntries) {
      const result = await getStat(path.join(dirPath, dirEntry.name));
      entries.push(result);
    }

    return entries;
  } catch {
    return [];
  }
}

async function getStat(filepath: string): Promise<ReadDirEntry> {
  const fileStat = await fs.stat(filepath);
  return {
    name: path.basename(filepath),
    path: filepath,
    ctime: fileStat.ctimeMs,
    mtime: fileStat.mtimeMs,
    size: fileStat.size,
    type: fileStat.isFile() ? RNFSFileTypeRegular : RNFSFileTypeDirectory
  };
}

async function appendFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  contents: string
) {
  try {
    await fs.appendFile(filepath, contents, "base64");
  } catch {
    // swallow error
  }
}

async function stat(_event: IpcMainInvokeEvent, filepath: string) {
  return await getStat(filepath);
}

async function downloadFile(
  _event: IpcMainInvokeEvent,
  options: DownloadBridgeOptions
) {
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

  const reader = body.getReader();
  const fd = await fs.open(options.toFile, "w");
  // fd.createWriteStream() defaults to autoClose: true, so the stream
  // takes ownership of the fd and closes it on "close" / on destroy().
  const writer = fd.createWriteStream();

  const bytesDone = await _streamFile(reader, writer);

  // writer.end() only *signals* end-of-stream; pending chunks are still
  // being flushed to the OS, and the fd has not yet been closed. If we
  // resolve here, a renderer that immediately calls readFile() over IPC
  // can race and observe an empty or partial file. Wait for "close" so
  // the bytes are flushed and the fd is released before we reply.
  await new Promise<void>((resolve, reject) => {
    writer.once("close", () => resolve());
    writer.once("error", reject);
    writer.end();
  });

  return {
    jobId: options.jobId,
    statusCode: response.status,
    bytesWritten: bytesDone
  };
}

async function _streamFile(
  reader: ReadableStreamDefaultReader<any>,
  writer: WriteStream
) {
  let bytesDone = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        return bytesDone;
      }

      const chunk = result.value;
      if (!chunk) {
        throw new Error("Empty chunk");
      }

      await new Promise((resolve, reject) => {
        writer.write(chunk, err => {
          if (err) {
            reject(err);
          } else {
            resolve(undefined);
          }
        });
      });

      bytesDone += chunk.length;
    }
  } catch (error) {
    writer.destroy();
    throw error;
  }
}

async function getFSInfo(_event: IpcMainInvokeEvent) {
  try {
    const st = await fs.statfs(os.homedir());
    return {
      freeSpace: st.bfree * st.bsize,
      totalSpace: st.blocks * st.bsize
    };
  } catch {
    return { freeSpace: 0, totalSpace: 0 };
  }
}

export const filesystem = {
  get api() {
    return {
      mkdir,
      moveFile,
      copyFile,
      unlink,
      exists,
      readFile,
      writeFile,
      readDir,
      appendFile,
      stat,
      downloadFile,
      getFSInfo
    };
  },
  main: {
    init() {
      for (const [key, fn] of Object.entries(filesystem.api)) {
        ipcMain.handle(`axsy:fs:${key}`, fn);
      }
      ipcMain.handle("axsy:fs:initPaths", initPaths);

      // Synchronous handler for preload script to get paths at startup
      ipcMain.on("axsy:fs:initPathsSync", event => {
        event.returnValue = getPathsConfig();
      });
    }
  }
};

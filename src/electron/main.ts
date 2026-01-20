import { ipcMain, app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
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

async function mkdir(
  _event: IpcMainInvokeEvent,
  dirpath: string,
  _options: MkdirOptions
) {
  await fs.mkdir(dirpath);
}

async function moveFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  destPath: string,
  _options: FileOptions
) {
  await fs.rename(filepath, destPath);
}

async function copyFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  destPath: string,
  _options: FileOptions
) {
  await fs.copyFile(filepath, destPath);
}

async function unlink(_event: IpcMainInvokeEvent, filepath: string) {
  await fs.unlink(filepath);
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
  return await fs.readFile(filepath, "base64");
}

async function writeFile(
  _event: IpcMainInvokeEvent,
  filepath: string,
  contents: string,
  options: ObjectEncodingOptions
) {
  await fs.writeFile(filepath, contents, options);
}

async function initPaths(_event: IpcMainInvokeEvent) {
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
    RNFSExternalCachesDirectoryPath: null
  };
}

async function readDir(
  _event: IpcMainInvokeEvent,
  dirPath: string
): Promise<ReadDirEntry[]> {
  const dirEntries = await fs.opendir(dirPath);

  const entries: ReadDirEntry[] = [];

  for await (const dirEntry of dirEntries) {
    const result = await getStat(path.join(dirPath, dirEntry.name));
    entries.push(result);
  }

  return entries;
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
  await fs.appendFile(filepath, contents, "base64");
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
  const writer = fd.createWriteStream();

  const bytesDone = await _streamFile(reader, writer);

  writer.end();

  await fd.close();

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
      downloadFile
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
        event.returnValue = {
          RNFSSeparator: path.sep,
          RNFSDocumentDirectoryPath: app.getPath("userData"),
          RNFSTemporaryDirectoryPath: app.getPath("temp"),
          RNFSPicturesDirectoryPath: app.getPath("pictures"),
          RNFSDownloadDirectoryPath: app.getPath("downloads"),
          RNFSExternalDirectoryPath: null,
          RNFSExternalStorageDirectoryPath: null,
          RNFSExternalCachesDirectoryPath: null
        };
      });
    }
  }
};

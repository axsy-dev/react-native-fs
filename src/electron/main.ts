import { ipcMain, app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { FileOptions, MkdirOptions, ReadDirEntry } from "../types";
import type { IpcMainInvokeEvent } from "electron";
import type { ObjectEncodingOptions } from "node:fs";

const RNFSFileTypeRegular = 0;
const RNFSFileTypeDirectory = 1;

async function mkdir(
  _event: IpcMainInvokeEvent,
  path: string,
  _options: MkdirOptions
) {
  await fs.mkdir(path);
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
    const stat = await fs.stat(path.join(dirPath, dirEntry.name));

    entries.push({
      name: dirEntry.name,
      path: path.join(dirPath, dirEntry.name),
      ctime: stat.ctimeMs,
      mtime: stat.mtimeMs,
      size: stat.size,
      type: stat.isFile() ? RNFSFileTypeRegular : RNFSFileTypeDirectory
    });
  }

  return entries;
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
      readDir
    };
  },
  main: {
    init() {
      for (const [key, fn] of Object.entries(filesystem.api)) {
        ipcMain.handle(`axsy:fs:${key}`, fn);
      }
      ipcMain.handle("axsy:fs:initPaths", initPaths);
    }
  }
};

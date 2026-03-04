import { app, ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { copyFile, readFile, writeFile } from "fs/promises";
import { basename, join } from "path";
import {
  COPY_TO_PICTURES,
  READ_FILE_AS_BASE64,
  WRITE_FILE_BASE64
} from "./constants";
import { AXSY_FILE_SCHEME, resolveUri } from "./axsy-file-uri";

async function copyToPictures(
  _event: IpcMainInvokeEvent,
  uri: string
): Promise<boolean> {
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

async function readFileAsBase64(
  _event: IpcMainInvokeEvent,
  uri: string
): Promise<string> {
  let filePath: string;
  if (uri.startsWith(`${AXSY_FILE_SCHEME}://`)) {
    filePath = resolveUri(uri, app.getPath("temp"));
  } else if (uri.startsWith("file://")) {
    filePath = new URL(uri).pathname;
  } else {
    filePath = uri;
  }
  return (await readFile(filePath)).toString("base64");
}

async function writeFileBase64(
  _event: IpcMainInvokeEvent,
  filepath: string,
  base64Data: string
): Promise<void> {
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

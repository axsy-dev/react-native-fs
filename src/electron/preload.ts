import { contextBridge, ipcRenderer } from "electron";
import type {
  DownloadBridgeOptions,
  FileOptions,
  MkdirOptions
} from "../types";
import type { ObjectEncodingOptions } from "node:fs";
import type { FSApi, FSPaths } from "./renderer";

// Get paths synchronously at preload time - this blocks until main responds
// but ensures paths are available immediately when renderer starts
const paths: FSPaths = ipcRenderer.sendSync("axsy:fs:initPathsSync");

const api: FSApi = {
  mkdir: async (path: string, options: MkdirOptions) => {
    return await ipcRenderer.invoke("axsy:fs:mkdir", path, options);
  },
  moveFile: async (
    filepath: string,
    destPath: string,
    options: FileOptions
  ) => {
    return await ipcRenderer.invoke(
      "axsy:fs:moveFile",
      filepath,
      destPath,
      options
    );
  },
  copyFile: async (
    filepath: string,
    destPath: string,
    options: FileOptions
  ) => {
    return await ipcRenderer.invoke(
      "axsy:fs:copyFile",
      filepath,
      destPath,
      options
    );
  },
  unlink: async (filepath: string) => {
    return await ipcRenderer.invoke("axsy:fs:unlink", filepath);
  },
  exists: async (filepath: string) => {
    return await ipcRenderer.invoke("axsy:fs:exists", filepath);
  },
  readFile: async (filepath: string, options: FileOptions) => {
    return await ipcRenderer.invoke("axsy:fs:readFile", filepath, options);
  },
  writeFile: async (
    filepath: string,
    contents: string,
    options: ObjectEncodingOptions
  ) => {
    return await ipcRenderer.invoke(
      "axsy:fs:writeFile",
      filepath,
      contents,
      options
    );
  },
  readDir: async (dirPath: string) => {
    return await ipcRenderer.invoke("axsy:fs:readDir", dirPath);
  },
  appendFile: async (filepath: string, contents: string) => {
    return await ipcRenderer.invoke("axsy:fs:appendFile", filepath, contents);
  },
  stat: async (filepath: string) => {
    return await ipcRenderer.invoke("axsy:fs:stat", filepath);
  },
  downloadFile: async (options: DownloadBridgeOptions) => {
    return await ipcRenderer.invoke("axsy:fs:downloadFile", options);
  },
  getFSInfo: async () => {
    return await ipcRenderer.invoke("axsy:fs:getFSInfo");
  }
};

export const filesystem = {
  preload: {
    init() {
      contextBridge.exposeInMainWorld("fsapi", api);
      contextBridge.exposeInMainWorld("fspaths", paths);
    }
  }
};

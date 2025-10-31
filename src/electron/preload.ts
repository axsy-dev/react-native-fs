import { app, contextBridge, ipcRenderer } from "electron";
import type { FileOptions, MkdirOptions } from "../types";
import type { ObjectEncodingOptions } from "node:fs";

export const filesystem = {
  preload: {
    init() {
      contextBridge.exposeInMainWorld("fsapi", {
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
          return await ipcRenderer.invoke(
            "axsy:fs:readFile",
            filepath,
            options
          );
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
        initPaths: async () => {
          return await ipcRenderer.invoke("axsy:fs:initPaths");
        }
      });
    }
  }
};

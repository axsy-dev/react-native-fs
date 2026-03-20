"use strict";

import { contextBridge, ipcRenderer } from "electron";
// Get paths synchronously at preload time - this blocks until main responds
// but ensures paths are available immediately when renderer starts
const paths = ipcRenderer.sendSync("axsy:fs:initPathsSync");
const api = {
  mkdir: async (path, options) => {
    return await ipcRenderer.invoke("axsy:fs:mkdir", path, options);
  },
  moveFile: async (filepath, destPath, options) => {
    return await ipcRenderer.invoke("axsy:fs:moveFile", filepath, destPath, options);
  },
  copyFile: async (filepath, destPath, options) => {
    return await ipcRenderer.invoke("axsy:fs:copyFile", filepath, destPath, options);
  },
  unlink: async filepath => {
    return await ipcRenderer.invoke("axsy:fs:unlink", filepath);
  },
  exists: async filepath => {
    return await ipcRenderer.invoke("axsy:fs:exists", filepath);
  },
  readFile: async (filepath, options) => {
    return await ipcRenderer.invoke("axsy:fs:readFile", filepath, options);
  },
  writeFile: async (filepath, contents, options) => {
    return await ipcRenderer.invoke("axsy:fs:writeFile", filepath, contents, options);
  },
  readDir: async dirPath => {
    return await ipcRenderer.invoke("axsy:fs:readDir", dirPath);
  },
  appendFile: async (filepath, contents) => {
    return await ipcRenderer.invoke("axsy:fs:appendFile", filepath, contents);
  },
  stat: async filepath => {
    return await ipcRenderer.invoke("axsy:fs:stat", filepath);
  },
  downloadFile: async options => {
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
//# sourceMappingURL=preload.js.map
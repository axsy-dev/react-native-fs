/**
 * Electron preload entry point for react-native-fs.
 *
 * Exports:
 * - filesystem: sets up window.fsapi and window.fspaths via contextBridge
 *   Ported from src/electron/preload.ts in the axsy-dev/react-native-fs git version.
 * - rnfsCompat: sets up window.rnfscompat via contextBridge
 *   From the electron-shims development branch.
 */

import { contextBridge, ipcRenderer } from "electron";

// ============================================================================
// filesystem — path and API bridge
// ============================================================================

// Get paths synchronously at preload time so they're available immediately
const paths = ipcRenderer.sendSync("axsy:fs:initPathsSync");

const api = {
  mkdir: async (path, options) =>
    await ipcRenderer.invoke("axsy:fs:mkdir", path, options),
  moveFile: async (filepath, destPath, options) =>
    await ipcRenderer.invoke("axsy:fs:moveFile", filepath, destPath, options),
  copyFile: async (filepath, destPath, options) =>
    await ipcRenderer.invoke("axsy:fs:copyFile", filepath, destPath, options),
  unlink: async filepath =>
    await ipcRenderer.invoke("axsy:fs:unlink", filepath),
  exists: async filepath =>
    await ipcRenderer.invoke("axsy:fs:exists", filepath),
  readFile: async (filepath, options) =>
    await ipcRenderer.invoke("axsy:fs:readFile", filepath, options),
  writeFile: async (filepath, contents, options) =>
    await ipcRenderer.invoke("axsy:fs:writeFile", filepath, contents, options),
  readDir: async dirPath =>
    await ipcRenderer.invoke("axsy:fs:readDir", dirPath),
  appendFile: async (filepath, contents) =>
    await ipcRenderer.invoke("axsy:fs:appendFile", filepath, contents),
  stat: async filepath => await ipcRenderer.invoke("axsy:fs:stat", filepath),
  downloadFile: async options =>
    await ipcRenderer.invoke("axsy:fs:downloadFile", options),
  getFSInfo: async () => await ipcRenderer.invoke("axsy:fs:getFSInfo")
};

export const filesystem = {
  preload: {
    init() {
      contextBridge.exposeInMainWorld("fsapi", api);
      contextBridge.exposeInMainWorld("fspaths", paths);
    }
  }
};

// ============================================================================
// rnfsCompat — additional IPC bridge
// ============================================================================

const COPY_TO_PICTURES = "axsy:fs:copyToPictures";
const READ_FILE_AS_BASE64 = "axsy:fs:readFileAsBase64";
const WRITE_FILE_BASE64 = "axsy:fs:writeFileBase64";

const rnfsCompatApi = {
  async copyToPictures(uri) {
    return await ipcRenderer.invoke(COPY_TO_PICTURES, uri);
  },
  async readFileAsBase64(uri) {
    return await ipcRenderer.invoke(READ_FILE_AS_BASE64, uri);
  },
  async writeFileBase64(filepath, base64Data) {
    return await ipcRenderer.invoke(WRITE_FILE_BASE64, filepath, base64Data);
  }
};

export const rnfsCompat = {
  preload: {
    init() {
      contextBridge.exposeInMainWorld("rnfscompat", rnfsCompatApi);
    }
  }
};

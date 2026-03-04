import { contextBridge, ipcRenderer } from "electron";
import {
  COPY_TO_PICTURES,
  READ_FILE_AS_BASE64,
  WRITE_FILE_BASE64
} from "./constants";

type RNFSCompatApi = {
  copyToPictures: (uri: string) => Promise<boolean>;
  readFileAsBase64: (uri: string) => Promise<string>;
  writeFileBase64: (filepath: string, base64Data: string) => Promise<void>;
};

const api: RNFSCompatApi = {
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
      contextBridge.exposeInMainWorld("rnfscompat", api);
    }
  }
};

declare global {
  interface Window {
    rnfscompat: RNFSCompatApi;
  }
}

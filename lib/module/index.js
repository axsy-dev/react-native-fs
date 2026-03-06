/**
 * Electron-specific react-native-fs module.
 * All operations delegate to the main process via IPC through electronAPI.
 * Ported from src/index.ts in the axsy-dev/react-native-fs git version.
 *
 * This module is wrapped by electron/index.js which applies a Proxy to:
 * - Fix path property race conditions
 * - Route base64 writeFile through rnfscompat IPC
 * - Route copyToPictures through rnfscompat IPC
 */

import { electronAPI } from "./electron/renderer.js";

// Use native browser APIs (available in Electron renderer) instead of external packages
const b64encode = str => btoa(unescape(encodeURIComponent(str)));
const b64decode = b64 => decodeURIComponent(escape(atob(b64)));

const RNFSManager = electronAPI;

const RNFSFileTypeRegular = RNFSManager.RNFSFileTypeRegular;
const RNFSFileTypeDirectory = RNFSManager.RNFSFileTypeDirectory;

let _jobId = 0;
const getJobId = () => {
  _jobId += 1;
  return _jobId;
};

const normalizeFilePath = path =>
  path.startsWith("file://") ? path.slice(7) : path;

function readFileGeneric(filepath, encodingOrOptions, command) {
  var options = { encoding: "utf8" };

  if (encodingOrOptions) {
    if (typeof encodingOrOptions === "string") {
      options.encoding = encodingOrOptions;
    } else if (typeof encodingOrOptions === "object") {
      options = encodingOrOptions;
    }
  }

  return command(normalizeFilePath(filepath), options).then(b64 => {
    if (options.encoding === "utf8") {
      return b64decode(b64);
    } else if (options.encoding === "ascii") {
      return atob(b64);
    } else if (options.encoding === "base64") {
      return b64;
    } else {
      throw new Error('Invalid encoding type "' + String(options.encoding) + '"');
    }
  });
}

function readDirGeneric(dirpath, command) {
  return command(normalizeFilePath(dirpath)).then(files =>
    files.map(file => ({
      ctime: (file.ctime && new Date(file.ctime * 1000)) || null,
      mtime: (file.mtime && new Date(file.mtime * 1000)) || null,
      name: file.name,
      path: file.path,
      size: file.size,
      isFile: () => file.type === RNFSFileTypeRegular,
      isDirectory: () => file.type === RNFSFileTypeDirectory
    }))
  );
}

var RNFS = {
  mkdir(filepath, options = {}) {
    return RNFSManager.mkdir(normalizeFilePath(filepath), options).then(
      () => undefined
    );
  },

  moveFile(filepath, destPath, options = {}) {
    return RNFSManager.moveFile(
      normalizeFilePath(filepath),
      normalizeFilePath(destPath),
      options
    ).then(() => undefined);
  },

  copyFile(filepath, destPath, options = {}) {
    return RNFSManager.copyFile(
      normalizeFilePath(filepath),
      normalizeFilePath(destPath),
      options
    ).then(() => undefined);
  },

  getFSInfo() {
    return RNFSManager.getFSInfo();
  },

  unlink(filepath) {
    return RNFSManager.unlink(normalizeFilePath(filepath)).then(() => undefined);
  },

  exists(filepath) {
    return RNFSManager.exists(normalizeFilePath(filepath));
  },

  readDir(dirpath) {
    return readDirGeneric(dirpath, RNFSManager.readDir.bind(RNFSManager));
  },

  readdir(dirpath) {
    return RNFS.readDir(normalizeFilePath(dirpath)).then(files =>
      files.map(file => file.name)
    );
  },

  stat(filepath) {
    return RNFSManager.stat(normalizeFilePath(filepath)).then(result => ({
      path: filepath,
      ctime: new Date(result.ctime * 1000),
      mtime: new Date(result.mtime * 1000),
      size: result.size,
      mode: 0,
      originalFilepath: filepath,
      isFile: () => result.type === RNFSFileTypeRegular,
      isDirectory: () => result.type === RNFSFileTypeDirectory
    }));
  },

  readFile(filepath, encodingOrOptions) {
    return readFileGeneric(
      filepath,
      encodingOrOptions,
      RNFSManager.readFile.bind(RNFSManager)
    );
  },

  writeFile(filepath, contents, encodingOrOptions) {
    var b64;
    var options = { encoding: "utf8" };

    if (encodingOrOptions) {
      if (typeof encodingOrOptions === "string") {
        options.encoding = encodingOrOptions;
      } else if (typeof encodingOrOptions === "object") {
        options = { ...options, ...encodingOrOptions };
      }
    }

    if (options.encoding === "utf8") {
      b64 = b64encode(contents);
    } else if (options.encoding === "ascii") {
      b64 = btoa(contents);
    } else if (options.encoding === "base64") {
      // Route base64 writes through rnfscompat IPC which decodes to binary correctly
      return window.rnfscompat.writeFileBase64(normalizeFilePath(filepath), contents);
    } else {
      throw new Error('Invalid encoding type "' + options.encoding + '"');
    }

    return RNFSManager.writeFile(normalizeFilePath(filepath), b64, options).then(
      () => undefined
    );
  },

  appendFile(filepath, contents, encodingOrOptions) {
    var b64;
    var options = { encoding: "utf8" };

    if (encodingOrOptions) {
      if (typeof encodingOrOptions === "string") {
        options.encoding = encodingOrOptions;
      } else if (typeof encodingOrOptions === "object") {
        options = encodingOrOptions;
      }
    }

    if (options.encoding === "utf8") {
      b64 = b64encode(contents);
    } else if (options.encoding === "ascii") {
      b64 = btoa(contents);
    } else if (options.encoding === "base64") {
      b64 = contents;
    } else {
      throw new Error('Invalid encoding type "' + options.encoding + '"');
    }

    return RNFSManager.appendFile(normalizeFilePath(filepath), b64);
  },

  downloadFile(options) {
    if (typeof options !== "object")
      throw new Error("downloadFile: Invalid value for argument `options`");
    if (typeof options.fromUrl !== "string")
      throw new Error("downloadFile: Invalid value for property `fromUrl`");
    if (typeof options.toFile !== "string")
      throw new Error("downloadFile: Invalid value for property `toFile`");

    var jobId = getJobId();

    var bridgeOptions = {
      jobId,
      fromUrl: options.fromUrl,
      toFile: normalizeFilePath(options.toFile),
      headers: options.headers || {},
      background: !!options.background,
      progressDivider: options.progressDivider || 0,
      readTimeout: options.readTimeout || 15000,
      connectionTimeout: options.connectionTimeout || 5000
    };

    return {
      jobId,
      promise: RNFSManager.downloadFile(bridgeOptions)
    };
  },

  // Stubs for platform-specific methods not supported on Electron
  pathForBundle() {
    return Promise.reject(new Error("pathForBundle is not available on Electron"));
  },
  pathForGroup() {
    return Promise.reject(new Error("pathForGroup is not available on Electron"));
  },
  getAllExternalFilesDirs() {
    return Promise.reject(new Error("getAllExternalFilesDirs is not available on Electron"));
  },
  stopDownload() {},
  resumeDownload() {},
  isResumable() {
    return Promise.resolve(false);
  },
  stopUpload() {},
  completeHandlerIOS() {},
  readDirAssets() {
    return Promise.reject(new Error("readDirAssets is not available on Electron"));
  },
  existsAssets() {
    return Promise.reject(new Error("existsAssets is not available on Electron"));
  },
  existsRes() {
    return Promise.reject(new Error("existsRes is not available on Electron"));
  },
  setReadable() {
    return Promise.reject(new Error("setReadable is not available on Electron"));
  },
  read() {
    return Promise.reject(new Error("read is not available on Electron"));
  },
  readFileAssets() {
    return Promise.reject(new Error("readFileAssets is not available on Electron"));
  },
  readFileRes() {
    return Promise.reject(new Error("readFileRes is not available on Electron"));
  },
  hash() {
    return Promise.reject(new Error("hash is not available on Electron"));
  },
  copyFileAssets() {
    return Promise.reject(new Error("copyFileAssets is not available on Electron"));
  },
  copyFileRes() {
    return Promise.reject(new Error("copyFileRes is not available on Electron"));
  },
  copyAssetsFileIOS() {
    return Promise.reject(new Error("copyAssetsFileIOS is not available on Electron"));
  },
  copyAssetsVideoIOS() {
    return Promise.reject(new Error("copyAssetsVideoIOS is not available on Electron"));
  },
  write() {
    return Promise.reject(new Error("write is not available on Electron"));
  },
  uploadFiles() {
    return {
      jobId: -1,
      promise: Promise.reject(new Error("uploadFiles is not available on Electron"))
    };
  },
  touch() {
    return Promise.reject(new Error("touch is not available on Electron"));
  },
  scanFile() {
    return Promise.reject(new Error("scanFile is not available on Electron"));
  },

  copyToPictures(uri) {
    return window.rnfscompat.copyToPictures(uri);
  },

  // Path properties
  get MainBundlePath() {
    return RNFSManager.RNFSMainBundlePath || "";
  },
  get ResourcesPath() {
    return RNFSManager.RNFSResourcesPath || "";
  },
  get CachesDirectoryPath() {
    return RNFSManager.RNFSTemporaryDirectoryPath || ""; // Use temp as cache on Electron
  },
  get ExternalCachesDirectoryPath() {
    return RNFSManager.RNFSExternalCachesDirectoryPath || "";
  },
  get DocumentDirectoryPath() {
    return RNFSManager.RNFSDocumentDirectoryPath || "";
  },
  get DownloadDirectoryPath() {
    return RNFSManager.RNFSDownloadDirectoryPath || "";
  },
  get ExternalDirectoryPath() {
    return RNFSManager.RNFSExternalDirectoryPath || "";
  },
  get ExternalStorageDirectoryPath() {
    return RNFSManager.RNFSExternalStorageDirectoryPath || "";
  },
  get TemporaryDirectoryPath() {
    return RNFSManager.RNFSTemporaryDirectoryPath || "";
  },
  get LibraryDirectoryPath() {
    return null;
  },
  get PicturesDirectoryPath() {
    return RNFSManager.RNFSPicturesDirectoryPath || "";
  },
  get FileProtectionKeys() {
    return null;
  },
  get Separator() {
    return RNFSManager.RNFSSeparator || "/";
  }
};

export default RNFS;

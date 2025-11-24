import { NativeModules, NativeAppEventEmitter, Platform } from "react-native";
import * as base64 from "base-64";
import utf8 from "./utf8";
import { electronAPI } from "./electron/renderer";
import type {
  FileOptions,
  MkdirOptions,
  ReadDirItem,
  DownloadResult,
  StatResult,
  FSInfoResult,
  DownloadFileOptions,
  DownloadBridgeOptions,
  UploadFileOptions,
  UploadBridgeOptions,
  UploadResult
} from "./types";

const RNFSManager = Platform.select({
  web: electronAPI,
  default: NativeModules.RNFSManager
});
const isIOS = Platform.OS === "ios";

const RNFSFileTypeRegular = RNFSManager.RNFSFileTypeRegular;
const RNFSFileTypeDirectory = RNFSManager.RNFSFileTypeDirectory;

let _jobId = 0;

const getJobId = () => {
  _jobId += 1;
  return _jobId;
};

const normalizeFilePath = (path: string) =>
  path.startsWith("file://") ? path.slice(7) : path;

/**
 * Generic function used by readFile and readFileAssets
 */
function readFileGeneric(
  filepath: string,
  encodingOrOptions: string | null | undefined,
  command: Function
) {
  var options = {
    encoding: "utf8"
  };

  if (encodingOrOptions) {
    if (typeof encodingOrOptions === "string") {
      options.encoding = encodingOrOptions;
    } else if (typeof encodingOrOptions === "object") {
      options = encodingOrOptions;
    }
  }

  return command(normalizeFilePath(filepath)).then((b64: string) => {
    var contents;

    if (options.encoding === "utf8") {
      contents = utf8.decode(base64.decode(b64));
    } else if (options.encoding === "ascii") {
      contents = base64.decode(b64);
    } else if (options.encoding === "base64") {
      contents = b64;
    } else {
      throw new Error(
        'Invalid encoding type "' + String(options.encoding) + '"'
      );
    }

    return contents;
  });
}

/**
 * Generic function used by readDir and readDirAssets
 */
function readDirGeneric(
  dirpath: string,
  command: Function
): Promise<ReadDirItem[]> {
  return command(normalizeFilePath(dirpath)).then((files: any[]) => {
    return files.map((file: any) => ({
      ctime: (file.ctime && new Date(file.ctime * 1000)) || null,
      mtime: (file.mtime && new Date(file.mtime * 1000)) || null,
      name: file.name,
      path: file.path,
      size: file.size,
      isFile: () => file.type === RNFSFileTypeRegular,
      isDirectory: () => file.type === RNFSFileTypeDirectory
    }));
  });
}

var RNFS = {
  mkdir(filepath: string, options: MkdirOptions = {}): Promise<void> {
    return RNFSManager.mkdir(normalizeFilePath(filepath), options).then(
      () => undefined
    );
  },

  moveFile(
    filepath: string,
    destPath: string,
    options: FileOptions = {}
  ): Promise<void> {
    return RNFSManager.moveFile(
      normalizeFilePath(filepath),
      normalizeFilePath(destPath),
      options
    ).then(() => undefined);
  },

  copyFile(
    filepath: string,
    destPath: string,
    options: FileOptions = {}
  ): Promise<void> {
    return RNFSManager.copyFile(
      normalizeFilePath(filepath),
      normalizeFilePath(destPath),
      options
    ).then(() => undefined);
  },

  pathForBundle(bundleNamed: string): Promise<string> {
    return RNFSManager.pathForBundle(bundleNamed);
  },

  pathForGroup(groupName: string): Promise<string> {
    return RNFSManager.pathForGroup(groupName);
  },

  getFSInfo(): Promise<FSInfoResult> {
    return RNFSManager.getFSInfo();
  },

  getAllExternalFilesDirs(): Promise<string> {
    return RNFSManager.getAllExternalFilesDirs();
  },

  unlink(filepath: string): Promise<void> {
    return RNFSManager.unlink(normalizeFilePath(filepath)).then(
      () => undefined
    );
  },

  exists(filepath: string): Promise<boolean> {
    return RNFSManager.exists(normalizeFilePath(filepath));
  },

  stopDownload(jobId: number): void {
    RNFSManager.stopDownload(jobId);
  },

  resumeDownload(jobId: number): void {
    RNFSManager.resumeDownload(jobId);
  },

  isResumable(jobId: number): Promise<boolean> {
    return RNFSManager.isResumable(jobId);
  },

  stopUpload(jobId: number): void {
    RNFSManager.stopUpload(jobId);
  },

  completeHandlerIOS(jobId: number): void {
    return RNFSManager.completeHandlerIOS(jobId);
  },

  readDir(dirpath: string): Promise<ReadDirItem[]> {
    return readDirGeneric(dirpath, RNFSManager.readDir);
  },

  // Android-only
  readDirAssets(dirpath: string): Promise<ReadDirItem[]> {
    if (!RNFSManager.readDirAssets) {
      throw new Error("readDirAssets is not available on this platform");
    }
    return readDirGeneric(dirpath, RNFSManager.readDirAssets);
  },

  // Android-only
  existsAssets(filepath: string) {
    if (!RNFSManager.existsAssets) {
      throw new Error("existsAssets is not available on this platform");
    }
    return RNFSManager.existsAssets(filepath);
  },

  // Android-only
  existsRes(filename: string) {
    if (!RNFSManager.existsRes) {
      throw new Error("existsRes is not available on this platform");
    }
    return RNFSManager.existsRes(filename);
  },

  // Node style version (lowercase d). Returns just the names
  readdir(dirpath: string): Promise<string[]> {
    return RNFS.readDir(normalizeFilePath(dirpath)).then(files => {
      return files.map(file => file.name);
    });
  },

  // setReadable for Android
  setReadable(
    filepath: string,
    readable: boolean,
    ownerOnly: boolean
  ): Promise<boolean> {
    return RNFSManager.setReadable(filepath, readable, ownerOnly).then(
      (result: boolean) => {
        return result;
      }
    );
  },

  stat(filepath: string): Promise<StatResult> {
    return RNFSManager.stat(normalizeFilePath(filepath)).then((result: any) => {
      return {
        path: filepath,
        ctime: new Date(result.ctime * 1000),
        mtime: new Date(result.mtime * 1000),
        size: result.size,
        mode: result.mode,
        originalFilepath: result.originalFilepath,
        isFile: () => result.type === RNFSFileTypeRegular,
        isDirectory: () => result.type === RNFSFileTypeDirectory
      };
    });
  },

  readFile(filepath: string, encodingOrOptions?: any): Promise<string> {
    return readFileGeneric(filepath, encodingOrOptions, RNFSManager.readFile);
  },

  read(
    filepath: string,
    length: number = 0,
    position: number = 0,
    encodingOrOptions?: any
  ): Promise<string> {
    var options = {
      encoding: "utf8"
    };

    if (encodingOrOptions) {
      if (typeof encodingOrOptions === "string") {
        options.encoding = encodingOrOptions;
      } else if (typeof encodingOrOptions === "object") {
        options = encodingOrOptions;
      }
    }

    return RNFSManager.read(normalizeFilePath(filepath), length, position).then(
      (b64: string) => {
        var contents;

        if (options.encoding === "utf8") {
          contents = utf8.decode(base64.decode(b64 as string));
        } else if (options.encoding === "ascii") {
          contents = base64.decode(b64 as string);
        } else if (options.encoding === "base64") {
          contents = b64 as string;
        } else {
          throw new Error(
            ('Invalid encoding type "' +
              String(options.encoding) +
              '"') as string
          );
        }

        return contents;
      }
    );
  },

  // Android only
  readFileAssets(filepath: string, encodingOrOptions?: any): Promise<string> {
    if (!RNFSManager.readFileAssets) {
      throw new Error("readFileAssets is not available on this platform");
    }
    return readFileGeneric(
      filepath,
      encodingOrOptions,
      RNFSManager.readFileAssets
    );
  },

  // Android only
  readFileRes(filename: string, encodingOrOptions?: any): Promise<string> {
    if (!RNFSManager.readFileRes) {
      throw new Error("readFileRes is not available on this platform");
    }
    return readFileGeneric(
      filename,
      encodingOrOptions,
      RNFSManager.readFileRes
    );
  },

  hash(filepath: string, algorithm: string): Promise<string> {
    return RNFSManager.hash(normalizeFilePath(filepath), algorithm);
  },

  // Android only
  copyFileAssets(filepath: string, destPath: string) {
    if (!RNFSManager.copyFileAssets) {
      throw new Error("copyFileAssets is not available on this platform");
    }
    return RNFSManager.copyFileAssets(
      normalizeFilePath(filepath),
      normalizeFilePath(destPath)
    ).then(() => undefined);
  },

  // Android only
  copyFileRes(filename: string, destPath: string) {
    if (!RNFSManager.copyFileRes) {
      throw new Error("copyFileRes is not available on this platform");
    }
    return RNFSManager.copyFileRes(filename, normalizeFilePath(destPath)).then(
      () => undefined
    );
  },

  // iOS only
  // Copies fotos from asset-library (camera-roll) to a specific location
  // with a given width or height
  // @see: https://developer.apple.com/reference/photos/phimagemanager/1616964-requestimageforasset
  copyAssetsFileIOS(
    imageUri: string,
    destPath: string,
    width: number,
    height: number,
    scale: number = 1.0,
    compression: number = 1.0,
    resizeMode: string = "contain"
  ): Promise<string> {
    return RNFSManager.copyAssetsFileIOS(
      imageUri,
      destPath,
      width,
      height,
      scale,
      compression,
      resizeMode
    );
  },

  // iOS only
  // Copies fotos from asset-library (camera-roll) to a specific location
  // with a given width or height
  // @see: https://developer.apple.com/reference/photos/phimagemanager/1616964-requestimageforasset
  copyAssetsVideoIOS(imageUri: string, destPath: string): Promise<string> {
    return RNFSManager.copyAssetsVideoIOS(imageUri, destPath);
  },

  writeFile(
    filepath: string,
    contents: string,
    encodingOrOptions?: any
  ): Promise<void> {
    var b64;

    var options = {
      encoding: "utf8"
    };

    if (encodingOrOptions) {
      if (typeof encodingOrOptions === "string") {
        options.encoding = encodingOrOptions;
      } else if (typeof encodingOrOptions === "object") {
        options = {
          ...options,
          ...encodingOrOptions
        };
      }
    }

    if (options.encoding === "utf8") {
      b64 = base64.encode(utf8.encode(contents));
    } else if (options.encoding === "ascii") {
      b64 = base64.encode(contents);
    } else if (options.encoding === "base64") {
      b64 = contents;
    } else {
      throw new Error('Invalid encoding type "' + options.encoding + '"');
    }

    return RNFSManager.writeFile(
      normalizeFilePath(filepath),
      b64,
      options
    ).then(() => undefined);
  },

  appendFile(
    filepath: string,
    contents: string,
    encodingOrOptions?: any
  ): Promise<void> {
    var b64;

    var options = {
      encoding: "utf8"
    };

    if (encodingOrOptions) {
      if (typeof encodingOrOptions === "string") {
        options.encoding = encodingOrOptions;
      } else if (typeof encodingOrOptions === "object") {
        options = encodingOrOptions;
      }
    }

    if (options.encoding === "utf8") {
      b64 = base64.encode(utf8.encode(contents));
    } else if (options.encoding === "ascii") {
      b64 = base64.encode(contents);
    } else if (options.encoding === "base64") {
      b64 = contents;
    } else {
      throw new Error('Invalid encoding type "' + options.encoding + '"');
    }

    return RNFSManager.appendFile(normalizeFilePath(filepath), b64);
  },

  write(
    filepath: string,
    contents: string,
    position?: number,
    encodingOrOptions?: any
  ): Promise<void> {
    var b64;

    var options = {
      encoding: "utf8"
    };

    if (encodingOrOptions) {
      if (typeof encodingOrOptions === "string") {
        options.encoding = encodingOrOptions;
      } else if (typeof encodingOrOptions === "object") {
        options = encodingOrOptions;
      }
    }

    if (options.encoding === "utf8") {
      b64 = base64.encode(utf8.encode(contents));
    } else if (options.encoding === "ascii") {
      b64 = base64.encode(contents);
    } else if (options.encoding === "base64") {
      b64 = contents;
    } else {
      throw new Error('Invalid encoding type "' + options.encoding + '"');
    }

    if (position === undefined) {
      position = -1;
    }

    return RNFSManager.write(normalizeFilePath(filepath), b64, position).then(
      () => undefined
    );
  },

  downloadFile(options: DownloadFileOptions): {
    jobId: number;
    promise: Promise<DownloadResult>;
  } {
    if (typeof options !== "object")
      throw new Error("downloadFile: Invalid value for argument `options`");
    if (typeof options.fromUrl !== "string")
      throw new Error("downloadFile: Invalid value for property `fromUrl`");
    if (typeof options.toFile !== "string")
      throw new Error("downloadFile: Invalid value for property `toFile`");
    if (options.headers && typeof options.headers !== "object")
      throw new Error("downloadFile: Invalid value for property `headers`");
    if (options.background && typeof options.background !== "boolean")
      throw new Error("downloadFile: Invalid value for property `background`");
    if (options.progressDivider && typeof options.progressDivider !== "number")
      throw new Error(
        "downloadFile: Invalid value for property `progressDivider`"
      );
    if (options.readTimeout && typeof options.readTimeout !== "number")
      throw new Error("downloadFile: Invalid value for property `readTimeout`");
    if (
      options.connectionTimeout &&
      typeof options.connectionTimeout !== "number"
    )
      throw new Error(
        "downloadFile: Invalid value for property `connectionTimeout`"
      );

    var jobId = getJobId();
    var subscriptions: any[] = [];

    if (options.begin) {
      subscriptions.push(
        NativeAppEventEmitter.addListener(
          "DownloadBegin-" + jobId,
          options.begin
        )
      );
    }

    if (options.progress) {
      subscriptions.push(
        NativeAppEventEmitter.addListener(
          "DownloadProgress-" + jobId,
          options.progress
        )
      );
    }

    if (options.resumable) {
      subscriptions.push(
        NativeAppEventEmitter.addListener(
          "DownloadResumable-" + jobId,
          options.resumable
        )
      );
    }

    var bridgeOptions: DownloadBridgeOptions = {
      jobId: jobId,
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
        .then((res: DownloadResult) => {
          subscriptions.forEach((sub: any) => sub.remove());
          return res;
        })
        .catch((e: Error) => {
          return Promise.reject(e);
        })
    };
  },

  uploadFiles(options: UploadFileOptions): {
    jobId: number;
    promise: Promise<UploadResult>;
  } {
    if (!RNFSManager.uploadFiles) {
      return {
        jobId: -1,
        promise: Promise.reject(
          new Error("`uploadFiles` is unsupported on this platform")
        )
      };
    }

    var jobId = getJobId();
    var subscriptions: any[] = [];

    if (typeof options !== "object")
      throw new Error("uploadFiles: Invalid value for argument `options`");
    if (typeof options.toUrl !== "string")
      throw new Error("uploadFiles: Invalid value for property `toUrl`");
    if (!Array.isArray(options.files))
      throw new Error("uploadFiles: Invalid value for property `files`");
    if (options.headers && typeof options.headers !== "object")
      throw new Error("uploadFiles: Invalid value for property `headers`");
    if (options.fields && typeof options.fields !== "object")
      throw new Error("uploadFiles: Invalid value for property `fields`");
    if (options.method && typeof options.method !== "string")
      throw new Error("uploadFiles: Invalid value for property `method`");

    if (options.begin) {
      subscriptions.push(
        NativeAppEventEmitter.addListener("UploadBegin-" + jobId, options.begin)
      );
    }
    if (options.beginCallback && options.beginCallback instanceof Function) {
      // Deprecated
      subscriptions.push(
        NativeAppEventEmitter.addListener(
          "UploadBegin-" + jobId,
          options.beginCallback
        )
      );
    }

    if (options.progress) {
      subscriptions.push(
        NativeAppEventEmitter.addListener(
          "UploadProgress-" + jobId,
          options.progress
        )
      );
    }
    if (
      options.progressCallback &&
      options.progressCallback instanceof Function
    ) {
      // Deprecated
      subscriptions.push(
        NativeAppEventEmitter.addListener(
          "UploadProgress-" + jobId,
          options.progressCallback
        )
      );
    }

    var bridgeOptions: UploadBridgeOptions = {
      jobId: jobId,
      toUrl: options.toUrl,
      files: options.files,
      headers: options.headers || {},
      fields: options.fields || {},
      method: options.method || "POST"
    };

    return {
      jobId,
      promise: RNFSManager.uploadFiles(bridgeOptions).then(
        (res: UploadResult | null) => {
          subscriptions.forEach((sub: any) => sub.remove());
          return res as UploadResult;
        }
      )
    };
  },

  touch(filepath: string, mtime?: Date, ctime?: Date): Promise<void> {
    if (ctime && !(ctime instanceof Date))
      throw new Error("touch: Invalid value for argument `ctime`");
    if (mtime && !(mtime instanceof Date))
      throw new Error("touch: Invalid value for argument `mtime`");
    var ctimeTime = 0;
    if (isIOS) {
      ctimeTime = (ctime && ctime.getTime()) || 0;
    }
    return RNFSManager.touch(
      normalizeFilePath(filepath),
      (mtime && mtime.getTime()) || 0,
      ctimeTime
    );
  },

  scanFile(path: string): Promise<ReadDirItem[]> {
    return RNFSManager.scanFile(path);
  },

  MainBundlePath: RNFSManager.RNFSMainBundlePath,
  CachesDirectoryPath: RNFSManager.RNFSCachesDirectoryPath,
  ExternalCachesDirectoryPath: RNFSManager.RNFSExternalCachesDirectoryPath,
  DocumentDirectoryPath: RNFSManager.RNFSDocumentDirectoryPath,
  ExternalDirectoryPath: RNFSManager.RNFSExternalDirectoryPath,
  ExternalStorageDirectoryPath: RNFSManager.RNFSExternalStorageDirectoryPath,
  TemporaryDirectoryPath: RNFSManager.RNFSTemporaryDirectoryPath,
  LibraryDirectoryPath: RNFSManager.RNFSLibraryDirectoryPath,
  PicturesDirectoryPath: RNFSManager.RNFSPicturesDirectoryPath,
  FileProtectionKeys: RNFSManager.RNFSFileProtectionKeys,

  Separator: Platform.select({
    ios: "/",
    android: "/",
    windows: "\\",
    web: RNFSManager.RNFSSeparator
  })
};

export default RNFS;

import type {
  MkdirOptions,
  FileOptions,
  ReadDirEntry,
  DownloadBridgeOptions,
  DownloadResult
} from "../types";
import type { ObjectEncodingOptions } from "node:fs";

export interface FSApi {
  mkdir: (path: string, options: MkdirOptions) => Promise<void>;
  moveFile: (
    filepath: string,
    destPath: string,
    options: FileOptions
  ) => Promise<void>;
  copyFile: (
    filepath: string,
    destPath: string,
    options: FileOptions
  ) => Promise<void>;
  unlink: (filepath: string) => Promise<void>;
  exists: (filepath: string) => Promise<boolean>;
  readFile: (filepath: string, options: FileOptions) => Promise<string>;
  writeFile: (
    filepath: string,
    contents: string,
    options: ObjectEncodingOptions
  ) => Promise<void>;
  readDir: (dirPath: string) => Promise<ReadDirEntry[]>;
  initPaths: () => Promise<{
    RNFSSeparator: string;
    RNFSDocumentDirectoryPath: string;
    RNFSTemporaryDirectoryPath: string;
    RNFSPicturesDirectoryPath: string;
    RNFSDownloadDirectoryPath: string;
    RNFSExternalDirectoryPath: string;
    RNFSExternalStorageDirectoryPath: string;
    RNFSExternalCachesDirectoryPath: string;
  }>;
  appendFile: (filepath: string, contents: string) => Promise<void>;
  stat: (filepath: string) => Promise<ReadDirEntry>;
  downloadFile: (options: DownloadBridgeOptions) => Promise<DownloadResult>;
}

class RNFSManager implements Omit<FSApi, "initPaths"> {
  public RNFSFileTypeRegular = 0;
  public RNFSFileTypeDirectory = 1;
  public RNFSDocumentDirectoryPath: string = "";
  public RNFSSeparator: string = "/";
  public RNFSTemporaryDirectoryPath: string = "";
  public RNFSPicturesDirectoryPath: string = "";
  public RNFSDownloadDirectoryPath: string = "";
  public RNFSExternalDirectoryPath: string = "";
  public RNFSExternalStorageDirectoryPath: string = "";
  public RNFSExternalCachesDirectoryPath: string = "";
  public readFilesAssets = null;
  public readFileRes = null;

  constructor() {
    this.init();
  }

  public async downloadFile(
    options: DownloadBridgeOptions
  ): Promise<DownloadResult> {
    return window.fsapi.downloadFile(options);
  }

  private async init() {
    const paths = await window.fsapi.initPaths();

    this.RNFSDocumentDirectoryPath = paths.RNFSDocumentDirectoryPath;
    this.RNFSSeparator = paths.RNFSSeparator;
    this.RNFSTemporaryDirectoryPath = paths.RNFSTemporaryDirectoryPath;
    this.RNFSPicturesDirectoryPath = paths.RNFSPicturesDirectoryPath;
    this.RNFSDownloadDirectoryPath = paths.RNFSDownloadDirectoryPath;
    this.RNFSExternalDirectoryPath = paths.RNFSExternalDirectoryPath;
    this.RNFSExternalStorageDirectoryPath =
      paths.RNFSExternalStorageDirectoryPath;
    this.RNFSExternalCachesDirectoryPath =
      paths.RNFSExternalCachesDirectoryPath;
  }

  public async mkdir(path: string, options: MkdirOptions): Promise<void> {
    return await window.fsapi.mkdir(path, options);
  }

  public async moveFile(
    filepath: string,
    destPath: string,
    options: FileOptions
  ): Promise<void> {
    return await window.fsapi.moveFile(filepath, destPath, options);
  }

  public async copyFile(
    filepath: string,
    destPath: string,
    options: FileOptions
  ): Promise<void> {
    return await window.fsapi.copyFile(filepath, destPath, options);
  }

  public async unlink(filepath: string): Promise<void> {
    return await window.fsapi.unlink(filepath);
  }

  public async exists(filepath: string): Promise<boolean> {
    return await window.fsapi.exists(filepath);
  }

  public async readFile(
    filepath: string,
    options: FileOptions
  ): Promise<string> {
    return await window.fsapi.readFile(filepath, options);
  }

  public async writeFile(
    filepath: string,
    contents: string,
    options: ObjectEncodingOptions
  ): Promise<void> {
    return await window.fsapi.writeFile(filepath, contents, options);
  }

  public async readDir(dirPath: string): Promise<ReadDirEntry[]> {
    return await window.fsapi.readDir(dirPath);
  }

  public async appendFile(filepath: string, contents: string): Promise<void> {
    return await window.fsapi.appendFile(filepath, contents);
  }

  public async stat(filepath: string): Promise<Stat> {
    return await window.fsapi.stat(filepath);
  }
}

export const electronAPI = new RNFSManager();

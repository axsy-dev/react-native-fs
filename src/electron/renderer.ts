import type {
  MkdirOptions,
  FileOptions,
  ReadDirEntry,
  DownloadBridgeOptions,
  DownloadResult,
  FSInfoResult
} from "../types";
import type { ObjectEncodingOptions } from "node:fs";

export interface FSPaths {
  RNFSSeparator: string;
  RNFSDocumentDirectoryPath: string;
  RNFSTemporaryDirectoryPath: string;
  RNFSPicturesDirectoryPath: string;
  RNFSDownloadDirectoryPath: string;
  RNFSExternalDirectoryPath: string | null;
  RNFSExternalStorageDirectoryPath: string | null;
  RNFSExternalCachesDirectoryPath: string | null;
}

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
  appendFile: (filepath: string, contents: string) => Promise<void>;
  stat: (filepath: string) => Promise<ReadDirEntry>;
  downloadFile: (options: DownloadBridgeOptions) => Promise<DownloadResult>;
  getFSInfo: () => Promise<FSInfoResult>;
}

class RNFSManager implements FSApi {
  public RNFSFileTypeRegular = 0;
  public RNFSFileTypeDirectory = 1;
  public readFilesAssets = null;
  public readFileRes = null;

  // Paths are loaded synchronously from window.fspaths (set by preload script)
  public get RNFSDocumentDirectoryPath(): string {
    return window.fspaths.RNFSDocumentDirectoryPath;
  }
  public get RNFSSeparator(): string {
    return window.fspaths.RNFSSeparator;
  }
  public get RNFSTemporaryDirectoryPath(): string {
    return window.fspaths.RNFSTemporaryDirectoryPath;
  }
  public get RNFSPicturesDirectoryPath(): string {
    return window.fspaths.RNFSPicturesDirectoryPath;
  }
  public get RNFSDownloadDirectoryPath(): string {
    return window.fspaths.RNFSDownloadDirectoryPath;
  }
  public get RNFSExternalDirectoryPath(): string | null {
    return window.fspaths.RNFSExternalDirectoryPath;
  }
  public get RNFSExternalStorageDirectoryPath(): string | null {
    return window.fspaths.RNFSExternalStorageDirectoryPath;
  }
  public get RNFSExternalCachesDirectoryPath(): string | null {
    return window.fspaths.RNFSExternalCachesDirectoryPath;
  }

  public async downloadFile(
    options: DownloadBridgeOptions
  ): Promise<DownloadResult> {
    return window.fsapi.downloadFile(options);
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

  public async stat(filepath: string): Promise<ReadDirEntry> {
    return await window.fsapi.stat(filepath);
  }
  public async getFSInfo(): Promise<FSInfoResult> {
    return await window.fsapi.getFSInfo();
  }
}

export const electronAPI = new RNFSManager();

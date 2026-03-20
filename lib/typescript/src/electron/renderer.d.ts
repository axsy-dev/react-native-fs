import type { MkdirOptions, FileOptions, ReadDirEntry, DownloadBridgeOptions, DownloadResult, FSInfoResult } from "../types";
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
    RNFSResourcesPath: string;
    RNFSMainBundlePath: string;
}
export interface FSApi {
    mkdir: (path: string, options: MkdirOptions) => Promise<void>;
    moveFile: (filepath: string, destPath: string, options: FileOptions) => Promise<void>;
    copyFile: (filepath: string, destPath: string, options: FileOptions) => Promise<void>;
    unlink: (filepath: string) => Promise<void>;
    exists: (filepath: string) => Promise<boolean>;
    readFile: (filepath: string, options: FileOptions) => Promise<string>;
    writeFile: (filepath: string, contents: string, options: ObjectEncodingOptions) => Promise<void>;
    readDir: (dirPath: string) => Promise<ReadDirEntry[]>;
    appendFile: (filepath: string, contents: string) => Promise<void>;
    stat: (filepath: string) => Promise<ReadDirEntry>;
    downloadFile: (options: DownloadBridgeOptions) => Promise<DownloadResult>;
    getFSInfo: () => Promise<FSInfoResult>;
}
declare class RNFSManager implements FSApi {
    RNFSFileTypeRegular: number;
    RNFSFileTypeDirectory: number;
    readFilesAssets: null;
    readFileRes: null;
    get RNFSDocumentDirectoryPath(): string;
    get RNFSSeparator(): string;
    get RNFSTemporaryDirectoryPath(): string;
    get RNFSPicturesDirectoryPath(): string;
    get RNFSDownloadDirectoryPath(): string;
    get RNFSExternalDirectoryPath(): string | null;
    get RNFSExternalStorageDirectoryPath(): string | null;
    get RNFSExternalCachesDirectoryPath(): string | null;
    get RNFSResourcesPath(): string;
    get RNFSMainBundlePath(): string;
    downloadFile(options: DownloadBridgeOptions): Promise<DownloadResult>;
    mkdir(path: string, options: MkdirOptions): Promise<void>;
    moveFile(filepath: string, destPath: string, options: FileOptions): Promise<void>;
    copyFile(filepath: string, destPath: string, options: FileOptions): Promise<void>;
    unlink(filepath: string): Promise<void>;
    exists(filepath: string): Promise<boolean>;
    readFile(filepath: string, options: FileOptions): Promise<string>;
    writeFile(filepath: string, contents: string, options: ObjectEncodingOptions): Promise<void>;
    readDir(dirPath: string): Promise<ReadDirEntry[]>;
    appendFile(filepath: string, contents: string): Promise<void>;
    stat(filepath: string): Promise<ReadDirEntry>;
    getFSInfo(): Promise<FSInfoResult>;
}
export declare const electronAPI: RNFSManager;
export {};
//# sourceMappingURL=renderer.d.ts.map
import type { DownloadBridgeOptions, FileOptions, MkdirOptions, ReadDirEntry } from "../types";
import type { IpcMainInvokeEvent } from "electron";
import type { ObjectEncodingOptions } from "node:fs";
declare function mkdir(_event: IpcMainInvokeEvent, dirpath: string, _options: MkdirOptions): Promise<void>;
declare function moveFile(_event: IpcMainInvokeEvent, filepath: string, destPath: string, _options: FileOptions): Promise<void>;
declare function copyFile(_event: IpcMainInvokeEvent, filepath: string, destPath: string, _options: FileOptions): Promise<void>;
declare function unlink(_event: IpcMainInvokeEvent, filepath: string): Promise<void>;
declare function exists(_event: IpcMainInvokeEvent, filepath: string): Promise<boolean>;
declare function readFile(_event: IpcMainInvokeEvent, filepath: string, _options: FileOptions): Promise<string>;
declare function writeFile(_event: IpcMainInvokeEvent, filepath: string, contents: string, _options: ObjectEncodingOptions): Promise<void>;
declare function readDir(_event: IpcMainInvokeEvent, dirPath: string): Promise<ReadDirEntry[]>;
declare function appendFile(_event: IpcMainInvokeEvent, filepath: string, contents: string): Promise<void>;
declare function stat(_event: IpcMainInvokeEvent, filepath: string): Promise<ReadDirEntry>;
declare function downloadFile(_event: IpcMainInvokeEvent, options: DownloadBridgeOptions): Promise<{
    jobId: number;
    statusCode: number;
    bytesWritten: number;
}>;
declare function getFSInfo(_event: IpcMainInvokeEvent): Promise<{
    freeSpace: number;
    totalSpace: number;
}>;
export declare const filesystem: {
    readonly api: {
        mkdir: typeof mkdir;
        moveFile: typeof moveFile;
        copyFile: typeof copyFile;
        unlink: typeof unlink;
        exists: typeof exists;
        readFile: typeof readFile;
        writeFile: typeof writeFile;
        readDir: typeof readDir;
        appendFile: typeof appendFile;
        stat: typeof stat;
        downloadFile: typeof downloadFile;
        getFSInfo: typeof getFSInfo;
    };
    main: {
        init(): void;
    };
};
export {};
//# sourceMappingURL=main.d.ts.map
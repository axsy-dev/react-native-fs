export type MkdirOptions = {
    NSURLIsExcludedFromBackupKey?: boolean;
    NSFileProtectionKey?: string;
};
export type FileOptions = {
    NSFileProtectionKey?: string;
};
export type ReadDirItem = {
    ctime: Date | null | undefined;
    mtime: Date | null | undefined;
    name: string;
    path: string;
    size: string;
    isFile: () => boolean;
    isDirectory: () => boolean;
};
export type ReadDirEntry = {
    name: string;
    path: string;
    ctime: number;
    mtime: number;
    size: number;
    type: 0 | 1;
};
export type DownloadResult = {
    jobId: number;
    statusCode: number;
    bytesWritten: number;
};
export type DownloadBeginCallbackResult = {
    jobId: number;
    statusCode: number;
    contentLength: number;
    headers: Headers;
};
export type DownloadProgressCallbackResult = {
    jobId: number;
    contentLength: number;
    bytesWritten: number;
};
export type StatResult = {
    name: string | null | undefined;
    path: string;
    size: string;
    mode: number;
    ctime: number;
    mtime: number;
    originalFilepath: string;
    isFile: () => boolean;
    isDirectory: () => boolean;
};
type Headers = {
    [name: string]: string;
};
type Fields = {
    [name: string]: string;
};
export type DownloadFileOptions = {
    fromUrl: string;
    toFile: string;
    headers?: Headers;
    background?: boolean;
    discretionary?: boolean;
    cacheable?: boolean;
    progressDivider?: number;
    begin?: (res: DownloadBeginCallbackResult) => void;
    progress?: (res: DownloadProgressCallbackResult) => void;
    resumable?: () => void;
    connectionTimeout?: number;
    readTimeout?: number;
};
export type DownloadBridgeOptions = {
    jobId: number;
    fromUrl: string;
    toFile: string;
    headers: Headers;
    background: boolean;
    progressDivider: number;
    readTimeout: number;
    connectionTimeout: number;
};
export type UploadFileOptions = {
    toUrl: string;
    files: UploadFileItem[];
    headers?: Headers;
    fields?: Fields;
    method?: string;
    beginCallback?: (res: UploadBeginCallbackResult) => void;
    progressCallback?: (res: UploadProgressCallbackResult) => void;
    begin?: (res: UploadBeginCallbackResult) => void;
    progress?: (res: UploadProgressCallbackResult) => void;
};
export type UploadFileItem = {
    name: string;
    filename: string;
    filepath: string;
    filetype: string;
};
export type UploadBeginCallbackResult = {
    jobId: number;
};
export type UploadProgressCallbackResult = {
    jobId: number;
    totalBytesExpectedToSend: number;
    totalBytesSent: number;
};
export type UploadBridgeOptions = {
    jobId: number;
    toUrl: string;
    files: UploadFileItem[];
    headers: Headers;
    fields: Fields;
    method: string;
};
export type UploadResult = {
    jobId: number;
    statusCode: number;
    headers: Headers;
    body: string;
};
export type FSInfoResult = {
    totalSpace: number;
    freeSpace: number;
};
export {};
//# sourceMappingURL=types.d.ts.map
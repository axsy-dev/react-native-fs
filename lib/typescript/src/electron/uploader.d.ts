import type { UploadResult, UploadFileItem } from "../types";
type Headers = {
    [name: string]: string;
};
interface UploadParams {
    toUrl: string;
    files: UploadFileItem[];
    headers?: Headers;
    fields?: {
        [name: string]: string;
    };
    method?: string;
    onUploadBegin?: () => void;
    onUploadProgress?: (totalBytesExpectedToSend: number, totalBytesSent: number) => void;
    onUploadComplete?: (result: UploadResult) => void;
}
export declare class Uploader {
    private abort;
    stop(): void;
    upload(params: UploadParams): Promise<UploadResult>;
    private performUpload;
    private getMimeType;
}
export {};
//# sourceMappingURL=uploader.d.ts.map
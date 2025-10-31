export type MkdirOptions = {
  NSURLIsExcludedFromBackupKey?: boolean; // iOS only
  NSFileProtectionKey?: string; // IOS only
};

export type FileOptions = {
  NSFileProtectionKey?: string; // IOS only
};

export type ReadDirItem = {
  ctime: Date | null | undefined; // The creation date of the file (iOS only)
  mtime: Date | null | undefined; // The last modified date of the file
  name: string; // The name of the item
  path: string; // The absolute path to the item
  size: string; // Size in bytes
  isFile: () => boolean; // Is the file just a file?
  isDirectory: () => boolean; // Is the file a directory?
};

export type ReadDirEntry = {
  name: string;
  path: string;
  ctime: number;
  mtime: number;
  size: number;
  type: 0 | 1;
};

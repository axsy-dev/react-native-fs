# RNFS Methods and Properties Used in This Project

This document lists all methods and properties on `RNFS` (react-native-fs) found in this codebase.

## Properties (Constants)

1. **DocumentDirectoryPath** - Path to the documents directory
2. **CachesDirectoryPath** - Path to the caches directory
3. **MainBundlePath** - Path to the main bundle
4. **Separator** - File path separator (`/` on Unix/Mac, `\` on Windows)
5. **TemporaryDirectoryPath** - Path to temporary directory (found in stub)
6. **ExternalDirectoryPath** - Path to external directory (found in stub)
7. **ExternalStorageDirectoryPath** - Path to external storage directory (found in stub)
8. **DownloadDirectoryPath** - Path to downloads directory (found in stub)
9. **PicturesDirectoryPath** - Path to pictures directory (found in stub)

## Methods

1. ~~**exists(filePath: string)** - Check if a file or directory exists~~
2. ~~**readFile(filepath: string, encoding?: 'utf8' | 'ascii' | 'base64')** - Read file contents~~
3. ~~**writeFile(filepath: string, contents: string, encoding?: 'utf8' | 'ascii' | 'base64')** - Write contents to a file~~
4. **appendFile(filepath: string, contents: string, encoding?: 'utf8' | 'ascii' | 'base64')** - Append contents to a file
5. **readFileAssets(filepath: string, encoding?: 'utf8' | 'ascii' | 'base64')** - Read file from assets
6. ~~**mkdir(dirPath: string, options?: object)** - Create a directory~~
7. ~~**unlink(filepath: string)** - Delete a file or directory~~
8. ~~**readDir(dirPath: string)** - Read directory contents~~
9. **stat(filepath: string)** - Get file/directory statistics
10. ~~**copyFile(sourcePath: string, destPath: string)** - Copy a file~~
11. **downloadFile(options: object)** - Download a file from a URL
12. **uploadFiles(options: object)** - Upload files to a server
13. **copyToPictures(uri: string)** - Copy file to pictures directory
14. **getFSInfo()** - Get filesystem information (returns {totalSpace, freeSpace})
15. **pathForGroup(groupId: string)** - Get path for app group (iOS, imported separately, not on RNFS object)

## Methods Found in Stub/Type Definitions (Not Verified in Actual Usage)

16. **moveFile(sourcePath: string, destPath: string)** - Move a file (found in stub)
17. **readdir(dirPath: string)** - Alias for readDir (found in stub)

## Usage Patterns

- Most methods return Promises
- Common encoding options: 'utf8', 'base64', 'ascii'
- Methods are often called via `yield call([RNFS, RNFS.methodName], ...args)` in Redux-Saga
- `pathForGroup` is imported separately: `import RNFS, { pathForGroup } from "react-native-fs"`


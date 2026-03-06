/**
 * Electron renderer-side RNFS manager.
 * Delegates all operations to the main process via IPC (window.fsapi/window.fspaths).
 * Ported from src/electron/renderer.ts in the axsy-dev/react-native-fs git version.
 */

class RNFSManager {
  RNFSFileTypeRegular = 0;
  RNFSFileTypeDirectory = 1;
  readFilesAssets = null;
  readFileRes = null;

  // Paths are loaded synchronously from window.fspaths (set by preload script)
  get RNFSDocumentDirectoryPath() {
    return window.fspaths.RNFSDocumentDirectoryPath;
  }
  get RNFSSeparator() {
    return window.fspaths.RNFSSeparator;
  }
  get RNFSTemporaryDirectoryPath() {
    return window.fspaths.RNFSTemporaryDirectoryPath;
  }
  get RNFSPicturesDirectoryPath() {
    return window.fspaths.RNFSPicturesDirectoryPath;
  }
  get RNFSDownloadDirectoryPath() {
    return window.fspaths.RNFSDownloadDirectoryPath;
  }
  get RNFSExternalDirectoryPath() {
    return window.fspaths.RNFSExternalDirectoryPath;
  }
  get RNFSExternalStorageDirectoryPath() {
    return window.fspaths.RNFSExternalStorageDirectoryPath;
  }
  get RNFSExternalCachesDirectoryPath() {
    return window.fspaths.RNFSExternalCachesDirectoryPath;
  }
  get RNFSResourcesPath() {
    return window.fspaths.RNFSResourcesPath;
  }
  get RNFSMainBundlePath() {
    return window.fspaths.RNFSMainBundlePath;
  }

  async downloadFile(options) {
    return window.fsapi.downloadFile(options);
  }
  async mkdir(path, options) {
    return await window.fsapi.mkdir(path, options);
  }
  async moveFile(filepath, destPath, options) {
    return await window.fsapi.moveFile(filepath, destPath, options);
  }
  async copyFile(filepath, destPath, options) {
    return await window.fsapi.copyFile(filepath, destPath, options);
  }
  async unlink(filepath) {
    return await window.fsapi.unlink(filepath);
  }
  async exists(filepath) {
    return await window.fsapi.exists(filepath);
  }
  async readFile(filepath, options) {
    return await window.fsapi.readFile(filepath, options);
  }
  async writeFile(filepath, contents, options) {
    return await window.fsapi.writeFile(filepath, contents, options);
  }
  async readDir(dirPath) {
    return await window.fsapi.readDir(dirPath);
  }
  async appendFile(filepath, contents) {
    return await window.fsapi.appendFile(filepath, contents);
  }
  async stat(filepath) {
    return await window.fsapi.stat(filepath);
  }
  async getFSInfo() {
    return await window.fsapi.getFSInfo();
  }
}

export const electronAPI = new RNFSManager();

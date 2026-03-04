/**
 * Wrapper for react-native-fs that fixes the async path initialization race condition
 *
 * The underlying react-native-fs/electron copies path values at module load time,
 * before the async init() completes. This wrapper uses getters to always return
 * the current value.
 */

import RNFS from "react-native-fs/lib/module/index.js";
import { electronAPI } from "react-native-fs/lib/module/electron/renderer.js";

// Create a proxy that intercepts path property access
const wrappedRNFS = new Proxy(RNFS, {
  get(target, prop) {
    // For path properties, get the current value from electronAPI
    switch (prop) {
      case "DocumentDirectoryPath":
        return electronAPI.RNFSDocumentDirectoryPath || "";
      case "TemporaryDirectoryPath":
        return electronAPI.RNFSTemporaryDirectoryPath || "";
      case "CachesDirectoryPath":
        return electronAPI.RNFSTemporaryDirectoryPath || ""; // Use temp as cache
      case "PicturesDirectoryPath":
        return electronAPI.RNFSPicturesDirectoryPath || "";
      case "DownloadDirectoryPath":
        return electronAPI.RNFSDownloadDirectoryPath || "";
      case "ExternalDirectoryPath":
        return electronAPI.RNFSExternalDirectoryPath || "";
      case "ExternalStorageDirectoryPath":
        return electronAPI.RNFSExternalStorageDirectoryPath || "";
      case "ExternalCachesDirectoryPath":
        return electronAPI.RNFSExternalCachesDirectoryPath || "";
      case "Separator":
        return electronAPI.RNFSSeparator || "/";
      case "copyToPictures":
        return uri => window.rnfscompat.copyToPictures(uri);
      case "writeFile":
        // react-native-fs/electron/main.js has a bug: when encoding is "base64"
        // it writes the raw base64 string as UTF-8 text instead of decoding to
        // binary. Override to route base64 writes through our own IPC handler
        // which uses Buffer.from(data, "base64") before writing.
        return (filepath, contents, encodingOrOptions) => {
          const encoding =
            typeof encodingOrOptions === "string"
              ? encodingOrOptions
              : encodingOrOptions?.encoding;
          if (encoding === "base64") {
            return window.rnfscompat.writeFileBase64(filepath, contents);
          }
          return target.writeFile(filepath, contents, encodingOrOptions);
        };
      default:
        return target[prop];
    }
  }
});

// Re-export everything
export default wrappedRNFS;
export * from "react-native-fs/lib/module/types.js";

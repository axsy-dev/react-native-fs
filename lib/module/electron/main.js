"use strict";

import { ipcMain, app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const RNFSFileTypeRegular = 0;
const RNFSFileTypeDirectory = 1;
function getPathsConfig() {
  const resourcesPath = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "..", "resources");
  return {
    RNFSSeparator: path.sep,
    RNFSDocumentDirectoryPath: app.getPath("userData"),
    RNFSTemporaryDirectoryPath: app.getPath("temp"),
    RNFSPicturesDirectoryPath: app.getPath("pictures"),
    RNFSDownloadDirectoryPath: app.getPath("downloads"),
    RNFSFileTypeRegular: true,
    RNFSFileTypeDirectory: true,
    RNFSCachesDirectoryPath: null,
    RNFSExternalDirectoryPath: null,
    RNFSExternalStorageDirectoryPath: null,
    RNFSExternalCachesDirectoryPath: null,
    RNFSResourcesPath: resourcesPath,
    RNFSMainBundlePath: app.getAppPath()
  };
}
async function mkdir(_event, dirpath, _options) {
  try {
    await fs.mkdir(dirpath, {
      recursive: true
    });
  } catch (e) {
    // swallow error
  }
}
async function moveFile(_event, filepath, destPath, _options) {
  try {
    await fs.rename(filepath, destPath);
  } catch {
    // swallow error
  }
}
async function copyFile(_event, filepath, destPath, _options) {
  try {
    await fs.copyFile(filepath, destPath);
  } catch {
    // swallow error
  }
}
async function unlink(_event, filepath) {
  try {
    await fs.unlink(filepath);
  } catch (e) {
    // swallow error
  }
}
async function exists(_event, filepath) {
  try {
    await fs.access(filepath, fs.constants.F_OK);
  } catch (err) {
    return false;
  }
  return true;
}
async function readFile(_event, filepath, _options) {
  try {
    return await fs.readFile(filepath, "base64");
  } catch {
    return "";
  }
}
async function writeFile(_event, filepath, contents, _options) {
  try {
    // RNFS index.ts always base64-encodes content before passing to native modules.
    // Decode back to a raw Buffer and write binary.
    const decodedContents = Buffer.from(contents, "base64");
    await fs.writeFile(filepath, decodedContents);
  } catch {
    // swallow error
  }
}
async function initPaths(_event) {
  return getPathsConfig();
}
async function readDir(_event, dirPath) {
  try {
    const dirEntries = await fs.opendir(dirPath);
    const entries = [];
    for await (const dirEntry of dirEntries) {
      const result = await getStat(path.join(dirPath, dirEntry.name));
      entries.push(result);
    }
    return entries;
  } catch {
    return [];
  }
}
async function getStat(filepath) {
  const fileStat = await fs.stat(filepath);
  return {
    name: path.basename(filepath),
    path: filepath,
    ctime: fileStat.ctimeMs,
    mtime: fileStat.mtimeMs,
    size: fileStat.size,
    type: fileStat.isFile() ? RNFSFileTypeRegular : RNFSFileTypeDirectory
  };
}
async function appendFile(_event, filepath, contents) {
  try {
    await fs.appendFile(filepath, contents, "base64");
  } catch {
    // swallow error
  }
}
async function stat(_event, filepath) {
  return await getStat(filepath);
}
async function downloadFile(_event, options) {
  const request = new Request(options.fromUrl, {
    headers: new Headers({
      ...options.headers,
      "Content-Type": "application/octet-stream"
    })
  });
  const response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const body = response.body;
  if (!body) {
    throw new Error("Body not found");
  }
  const reader = body.getReader();
  const fd = await fs.open(options.toFile, "w");
  const writer = fd.createWriteStream();
  const bytesDone = await _streamFile(reader, writer);
  writer.end();
  await fd.close();
  return {
    jobId: options.jobId,
    statusCode: response.status,
    bytesWritten: bytesDone
  };
}
async function _streamFile(reader, writer) {
  let bytesDone = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        return bytesDone;
      }
      const chunk = result.value;
      if (!chunk) {
        throw new Error("Empty chunk");
      }
      await new Promise((resolve, reject) => {
        writer.write(chunk, err => {
          if (err) {
            reject(err);
          } else {
            resolve(undefined);
          }
        });
      });
      bytesDone += chunk.length;
    }
  } catch (error) {
    writer.destroy();
    throw error;
  }
}
async function getFSInfo(_event) {
  try {
    const st = await fs.statfs(os.homedir());
    return {
      freeSpace: st.bfree * st.bsize,
      totalSpace: st.blocks * st.bsize
    };
  } catch {
    return {
      freeSpace: 0,
      totalSpace: 0
    };
  }
}
export const filesystem = {
  get api() {
    return {
      mkdir,
      moveFile,
      copyFile,
      unlink,
      exists,
      readFile,
      writeFile,
      readDir,
      appendFile,
      stat,
      downloadFile,
      getFSInfo
    };
  },
  main: {
    init() {
      for (const [key, fn] of Object.entries(filesystem.api)) {
        ipcMain.handle(`axsy:fs:${key}`, fn);
      }
      ipcMain.handle("axsy:fs:initPaths", initPaths);

      // Synchronous handler for preload script to get paths at startup
      ipcMain.on("axsy:fs:initPathsSync", event => {
        event.returnValue = getPathsConfig();
      });
    }
  }
};
//# sourceMappingURL=main.js.map
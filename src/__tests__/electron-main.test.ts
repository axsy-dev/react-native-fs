import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Mock electron before importing the module under test
jest.mock("electron", () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  app: {
    isPackaged: false,
    getAppPath: () => "/mock/app",
    getPath: (name: string) => `/mock/${name}`
  }
}));

import { filesystem } from "../electron/main";

// Helper: the electron main functions expect IpcMainInvokeEvent as first arg
const event = {} as any;

describe("electron/main filesystem API", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rnfs-test-"));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("writeFile + readFile", () => {
    it("round-trips content via base64 encoding", async () => {
      const filePath = path.join(tmpDir, "test.txt");
      const content = "Hello, RNFS!";
      const b64 = Buffer.from(content).toString("base64");

      await filesystem.api.writeFile(event, filePath, b64, {});
      const result = await filesystem.api.readFile(event, filePath, {});

      // readFile returns base64-encoded content
      expect(Buffer.from(result, "base64").toString()).toBe(content);
    });

    it("writes binary data correctly", async () => {
      const filePath = path.join(tmpDir, "binary.bin");
      const bytes = Buffer.from([0x00, 0xff, 0x80, 0x7f]);
      const b64 = bytes.toString("base64");

      await filesystem.api.writeFile(event, filePath, b64, {});

      const raw = await fs.readFile(filePath);
      expect(Buffer.compare(raw, bytes)).toBe(0);
    });

    it("readFile returns empty string for non-existing file", async () => {
      const result = await filesystem.api.readFile(
        event,
        path.join(tmpDir, "nope.txt"),
        {}
      );
      expect(result).toBe("");
    });

    it("writeFile does not throw for invalid path", async () => {
      await expect(
        filesystem.api.writeFile(
          event,
          path.join(tmpDir, "no", "such", "dir", "file.txt"),
          Buffer.from("data").toString("base64"),
          {}
        )
      ).resolves.toBeUndefined();
    });
  });

  describe("exists", () => {
    it("returns true for existing file", async () => {
      const filePath = path.join(tmpDir, "exists.txt");
      await fs.writeFile(filePath, "data");

      expect(await filesystem.api.exists(event, filePath)).toBe(true);
    });

    it("returns false for non-existing file", async () => {
      expect(
        await filesystem.api.exists(event, path.join(tmpDir, "nope.txt"))
      ).toBe(false);
    });
  });

  describe("mkdir", () => {
    it("creates a directory", async () => {
      const dirPath = path.join(tmpDir, "newdir");
      await filesystem.api.mkdir(event, dirPath, {});

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it("does not throw if directory already exists", async () => {
      const dirPath = path.join(tmpDir, "newdir");
      await expect(
        filesystem.api.mkdir(event, dirPath, {})
      ).resolves.toBeUndefined();
    });

    it("creates nested directories recursively", async () => {
      const dirPath = path.join(tmpDir, "parent", "child", "grandchild");
      await filesystem.api.mkdir(event, dirPath, {});

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe("copyFile", () => {
    it("copies a file to a new location", async () => {
      const src = path.join(tmpDir, "copy-src.txt");
      const dest = path.join(tmpDir, "copy-dest.txt");
      await fs.writeFile(src, "copy me");

      await filesystem.api.copyFile(event, src, dest, {});

      const content = await fs.readFile(dest, "utf8");
      expect(content).toBe("copy me");
    });

    it("does not throw for non-existing source", async () => {
      await expect(
        filesystem.api.copyFile(
          event,
          path.join(tmpDir, "nope.txt"),
          path.join(tmpDir, "dest.txt"),
          {}
        )
      ).resolves.toBeUndefined();
    });
  });

  describe("moveFile", () => {
    it("moves a file to a new location", async () => {
      const src = path.join(tmpDir, "move-src.txt");
      const dest = path.join(tmpDir, "move-dest.txt");
      await fs.writeFile(src, "move me");

      await filesystem.api.moveFile(event, src, dest, {});

      expect(await filesystem.api.exists(event, src)).toBe(false);
      const content = await fs.readFile(dest, "utf8");
      expect(content).toBe("move me");
    });

    it("does not throw for non-existing source", async () => {
      await expect(
        filesystem.api.moveFile(
          event,
          path.join(tmpDir, "nope.txt"),
          path.join(tmpDir, "dest.txt"),
          {}
        )
      ).resolves.toBeUndefined();
    });
  });

  describe("unlink", () => {
    it("deletes a file", async () => {
      const filePath = path.join(tmpDir, "delete-me.txt");
      await fs.writeFile(filePath, "bye");

      await filesystem.api.unlink(event, filePath);

      expect(await filesystem.api.exists(event, filePath)).toBe(false);
    });

    it("does not throw for non-existing file", async () => {
      await expect(
        filesystem.api.unlink(event, path.join(tmpDir, "ghost.txt"))
      ).resolves.toBeUndefined();
    });
  });

  describe("appendFile", () => {
    it("appends content to a file", async () => {
      const filePath = path.join(tmpDir, "append.txt");
      await fs.writeFile(filePath, "first");

      // appendFile takes base64-encoded content
      const b64 = Buffer.from("-second").toString("base64");
      await filesystem.api.appendFile(event, filePath, b64);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("first-second");
    });

    it("does not throw for invalid path", async () => {
      await expect(
        filesystem.api.appendFile(
          event,
          path.join(tmpDir, "no", "such", "dir", "file.txt"),
          Buffer.from("data").toString("base64")
        )
      ).resolves.toBeUndefined();
    });
  });

  describe("stat", () => {
    it("returns file stats with correct shape", async () => {
      const filePath = path.join(tmpDir, "stat-test.txt");
      await fs.writeFile(filePath, "stat me");

      const result = await filesystem.api.stat(event, filePath);

      expect(result.name).toBe("stat-test.txt");
      expect(result.path).toBe(filePath);
      expect(result.size).toBe(7);
      expect(result.type).toBe(0); // RNFSFileTypeRegular
      expect(typeof result.ctime).toBe("number");
      expect(typeof result.mtime).toBe("number");
    });

    it("returns type 1 for directories", async () => {
      const result = await filesystem.api.stat(event, tmpDir);
      expect(result.type).toBe(1); // RNFSFileTypeDirectory
    });
  });

  describe("readDir", () => {
    it("lists directory contents", async () => {
      const dirPath = path.join(tmpDir, "readdir-test");
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, "a.txt"), "a");
      await fs.writeFile(path.join(dirPath, "b.txt"), "b");

      const entries = await filesystem.api.readDir(event, dirPath);

      const names = entries.map(e => e.name).sort();
      expect(names).toEqual(["a.txt", "b.txt"]);
      expect(entries[0]!.path).toContain("readdir-test");
      expect(typeof entries[0]!.size).toBe("number");
    });

    it("returns empty array for non-existing directory", async () => {
      const entries = await filesystem.api.readDir(
        event,
        path.join(tmpDir, "nope")
      );
      expect(entries).toEqual([]);
    });
  });

  describe("getFSInfo", () => {
    it("returns freeSpace and totalSpace as numbers", async () => {
      const result = await filesystem.api.getFSInfo(event);

      expect(typeof result.freeSpace).toBe("number");
      expect(typeof result.totalSpace).toBe("number");
      expect(result.totalSpace).toBeGreaterThan(0);
      expect(result.freeSpace).toBeGreaterThan(0);
      expect(result.freeSpace).toBeLessThanOrEqual(result.totalSpace);
    });
  });

  describe("downloadFile", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    function mockFetchWithChunks(chunks: Uint8Array[]) {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        }
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body
      }) as unknown as typeof fetch;
    }

    it("file is fully readable immediately after resolving", async () => {
      // Contract: when downloadFile resolves, the file is fully flushed
      // and the fd is closed. (In production the bug surfaced over IPC,
      // where the renderer's follow-up readFile raced the main process's
      // pending stream flush; this test exercises the happy path.)
      const expected = Buffer.alloc(1024 * 64, "x");
      const mid = expected.length / 2;
      mockFetchWithChunks([
        new Uint8Array(expected.subarray(0, mid)),
        new Uint8Array(expected.subarray(mid))
      ]);

      const toFile = path.join(tmpDir, "download-flush.bin");
      const result = await filesystem.api.downloadFile(event, {
        jobId: 1,
        fromUrl: "https://example.test/file.bin",
        toFile,
        headers: {},
        background: false,
        progressDivider: 0,
        readTimeout: 0,
        connectionTimeout: 0
      });

      expect(result.bytesWritten).toBe(expected.length);
      const onDisk = await fs.readFile(toFile);
      expect(Buffer.compare(onDisk, expected)).toBe(0);
    });

    it("propagates fetch errors", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        body: null
      }) as unknown as typeof fetch;

      await expect(
        filesystem.api.downloadFile(event, {
          jobId: 2,
          fromUrl: "https://example.test/missing",
          toFile: path.join(tmpDir, "missing.bin"),
          headers: {},
          background: false,
          progressDivider: 0,
          readTimeout: 0,
          connectionTimeout: 0
        })
      ).rejects.toThrow(/Failed to download file/);
    });
  });

  describe("main.init", () => {
    it("registers IPC handlers for all API methods", () => {
      const { ipcMain } = require("electron");

      (ipcMain.handle as jest.Mock).mockClear();
      (ipcMain.on as jest.Mock).mockClear();

      filesystem.main.init();

      const handleCalls = (ipcMain.handle as jest.Mock).mock.calls;
      const channels = handleCalls.map(([channel]: [string]) => channel);

      // All API methods should be registered
      expect(channels).toContain("axsy:fs:mkdir");
      expect(channels).toContain("axsy:fs:readFile");
      expect(channels).toContain("axsy:fs:writeFile");
      expect(channels).toContain("axsy:fs:exists");
      expect(channels).toContain("axsy:fs:readDir");
      expect(channels).toContain("axsy:fs:initPaths");

      // Sync handler for preload
      const onCalls = (ipcMain.on as jest.Mock).mock.calls;
      expect(
        onCalls.some(([ch]: [string]) => ch === "axsy:fs:initPathsSync")
      ).toBe(true);
    });
  });
});

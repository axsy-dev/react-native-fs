/**
 * Tests for pure utility functions extracted from src/index.ts.
 *
 * We mock react-native and the electron renderer so we can test the
 * encoding logic and helper functions in isolation.
 */

jest.mock("react-native", () => ({
  NativeModules: { RNFSManager: {} },
  NativeAppEventEmitter: { addListener: jest.fn() },
  Platform: {
    OS: "ios",
    select: (opts: Record<string, any>) => opts.default ?? opts.ios
  }
}));

jest.mock("../electron/renderer", () => ({
  electronAPI: undefined
}));

import * as base64 from "base-64";
import utf8 from "../utf8";

// Import the default export (RNFS) after mocks are set up
import RNFS from "../index";

describe("RNFS utility behavior", () => {
  describe("normalizeFilePath (via writeFile)", () => {
    const mockWriteFile = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      // Inject mock into RNFSManager
      const { NativeModules } = require("react-native");
      NativeModules.RNFSManager.writeFile = mockWriteFile;
      mockWriteFile.mockClear();
    });

    it("strips file:// prefix", async () => {
      await RNFS.writeFile("file:///path/to/file.txt", "data");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "/path/to/file.txt",
        expect.any(String),
        expect.any(Object)
      );
    });

    it("leaves paths without file:// prefix unchanged", async () => {
      await RNFS.writeFile("/path/to/file.txt", "data");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "/path/to/file.txt",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe("writeFile encoding", () => {
    const mockWriteFile = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      const { NativeModules } = require("react-native");
      NativeModules.RNFSManager.writeFile = mockWriteFile;
      mockWriteFile.mockClear();
    });

    it("encodes utf8 content to base64", async () => {
      await RNFS.writeFile("/test.txt", "Hello", "utf8");
      const b64Arg = mockWriteFile.mock.calls[0][1];
      const decoded = utf8.decode(base64.decode(b64Arg));
      expect(decoded).toBe("Hello");
    });

    it("encodes ascii content to base64", async () => {
      await RNFS.writeFile("/test.txt", "Hello", "ascii");
      const b64Arg = mockWriteFile.mock.calls[0][1];
      expect(base64.decode(b64Arg)).toBe("Hello");
    });

    it("passes base64 content through unchanged", async () => {
      const b64 = base64.encode("Hello");
      await RNFS.writeFile("/test.txt", b64, "base64");
      expect(mockWriteFile.mock.calls[0][1]).toBe(b64);
    });

    it("throws for invalid encoding", () => {
      expect(() => {
        RNFS.writeFile("/test.txt", "data", "invalid" as any);
      }).toThrow('Invalid encoding type "invalid"');
    });

    it("accepts encoding as options object", async () => {
      await RNFS.writeFile("/test.txt", "Hello", { encoding: "ascii" });
      const b64Arg = mockWriteFile.mock.calls[0][1];
      expect(base64.decode(b64Arg)).toBe("Hello");
    });
  });

  describe("readFile encoding", () => {
    const mockReadFile = jest.fn();

    beforeEach(() => {
      const { NativeModules } = require("react-native");
      NativeModules.RNFSManager.readFile = mockReadFile;
      mockReadFile.mockClear();
    });

    it("decodes base64 response to utf8 by default", async () => {
      const b64 = base64.encode(utf8.encode("Hello"));
      mockReadFile.mockResolvedValue(b64);

      const result = await RNFS.readFile("/test.txt");
      expect(result).toBe("Hello");
    });

    it("decodes base64 response to ascii", async () => {
      const b64 = base64.encode("Hello");
      mockReadFile.mockResolvedValue(b64);

      const result = await RNFS.readFile("/test.txt", "ascii");
      expect(result).toBe("Hello");
    });

    it("returns raw base64 when encoding is base64", async () => {
      mockReadFile.mockResolvedValue("SGVsbG8=");

      const result = await RNFS.readFile("/test.txt", "base64");
      expect(result).toBe("SGVsbG8=");
    });
  });

  describe("downloadFile validation", () => {
    it("throws for non-object options", () => {
      expect(() => RNFS.downloadFile("bad" as any)).toThrow(
        "Invalid value for argument `options`"
      );
    });

    it("throws for missing fromUrl", () => {
      expect(() => RNFS.downloadFile({ toFile: "/tmp/f" } as any)).toThrow(
        "Invalid value for property `fromUrl`"
      );
    });

    it("throws for missing toFile", () => {
      expect(() =>
        RNFS.downloadFile({ fromUrl: "http://example.com" } as any)
      ).toThrow("Invalid value for property `toFile`");
    });
  });

  describe("uploadFiles", () => {
    it("returns rejected promise when platform does not support uploads", async () => {
      const { NativeModules } = require("react-native");
      delete NativeModules.RNFSManager.uploadFiles;

      const result = RNFS.uploadFiles({
        toUrl: "http://example.com",
        files: []
      });

      expect(result.jobId).toBe(-1);
      await expect(result.promise).rejects.toThrow("unsupported");
    });
  });
});

/**
 * Regression test for the axsy-dev/react-app CodePush "stuck after login" bug.
 *
 * The native Android RNFSManager.downloadFile reads progressInterval (getInt),
 * hasBeginCallback and hasProgressCallback (getBoolean) with NO hasKey guard, so
 * every one of those keys MUST be present in the bridge options object or the
 * download rejects with `NoSuchKeyException`. The JS->TS rewrite (fd7dbf9)
 * dropped them, so on Android every RNFS.downloadFile call throws — which is
 * what blocks CodePush bundle downloads and hangs initial sync.
 */
jest.mock("react-native", () => ({
  NativeModules: { RNFSManager: {} },
  NativeAppEventEmitter: { addListener: jest.fn() },
  Platform: {
    OS: "android",
    select: (opts: Record<string, any>) => opts.default ?? opts.android ?? opts.ios
  }
}));
jest.mock("../electron/renderer", () => ({ electronAPI: undefined }));

// Import the default export (RNFS) after mocks are set up
import RNFS from "../index";

describe("downloadFile native bridge options", () => {
  const mockDownloadFile = jest
    .fn()
    .mockReturnValue(Promise.resolve({ jobId: 1, statusCode: 200, bytesWritten: 0 }));

  beforeEach(() => {
    const { NativeModules } = require("react-native");
    NativeModules.RNFSManager.downloadFile = mockDownloadFile;
    mockDownloadFile.mockClear();
  });

  it("forwards every key the Android native module reads as required", () => {
    RNFS.downloadFile({
      fromUrl: "https://example.com/bundle.zip",
      toFile: "/tmp/bundle.zip"
    });

    expect(mockDownloadFile).toHaveBeenCalledTimes(1);
    const bridge = mockDownloadFile.mock.calls[0][0];
    // These three are read via unguarded getInt/getBoolean on Android:
    expect(bridge).toHaveProperty("progressInterval", 0);
    expect(bridge).toHaveProperty("hasBeginCallback", false);
    expect(bridge).toHaveProperty("hasProgressCallback", false);
  });
});

import type { FSApi, FSPaths } from "./renderer";

declare global {
  interface Window {
    fsapi: FSApi;
    fspaths: FSPaths;
  }
}

import type { FSApi } from "./renderer";

declare global {
  interface Window {
    fsapi: FSApi;
  }
}

/// <reference types="vitest" />
import * as path from "path";
import { defineConfig } from "vite";

function aliases(...packages: string[]): {} {
  const alias = {};
  for (const p of packages) {
    alias[`@effect/${p}/test`] = path.resolve(__dirname, `./packages/${p}/test/esm`);
    alias[`@effect/${p}/examples`] = path.resolve(__dirname, `./packages/${p}/examples/esm`);
    alias[`@effect/${p}`] = path.resolve(__dirname, `./packages/${p}/build/esm`);
  }
  return alias;
}

export default defineConfig({
  // resolve: {
  //   alias: aliases("core")
  // },
  test: {
    // include: ["packages/*/build/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"]
    include: ["packages/*/build/test/io/Effect/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"]
  }
});

import * as Fs from "node:fs";
import Package from "../package.json" assert { type: "json" };

Fs.writeFileSync(
  "package.json",
  JSON.stringify(
    {
      ...Package,
      exports: {
        "./env": {
          types: "./env/index.d.ts",
          module: "./env/index.cjs.mjs",
          import: "./env/index.mjs",
          default: "./env/index.cjs",
        },
        ...Package.exports,
      },
      files: [...Package.files, "env"],
    },
    null,
    2
  )
);

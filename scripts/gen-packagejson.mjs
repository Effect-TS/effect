import * as Fs from "node:fs";
import Package from "../package.json" assert { type: "json" };

const modules = Fs.readdirSync("src").filter(
  (_) => _.endsWith(".ts") && _ !== "index.ts"
);
const files = ["dist", ...modules.map((_) => _.slice(0, -3))];
const exports = {
  ".": {
    module: "./dist/effect.esm.js",
    import: "./dist/effect.cjs.mjs",
    default: "./dist/effect.cjs.js",
  },
  "./package.json": "./package.json",
};

modules
  .map((_) => _.slice(0, -3))
  .forEach((module) => {
    exports[`./${module}`] = {
      module: `./${module}/dist/effect-${module}.esm.js`,
      import: `./${module}/dist/effect-${module}.cjs.mjs`,
      default: `./${module}/dist/effect-${module}.cjs.js`,
    };
  });

console.log(
  JSON.stringify(
    {
      ...Package,
      files,
      exports,
      preconstruct: {
        distFilenameStrategy: "full",
        exports: {
          importConditionDefaultExport: "default",
        },
        entrypoints: ["index.ts", ...modules],
      },
    },
    null,
    2
  )
);

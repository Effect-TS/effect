import * as Fs from "node:fs";
import Package from "../package.json" assert { type: "json" };

["src/tsconfig.json", ...Package.files.filter((_) => _ !== "src")].forEach(
  (file) => {
    Fs.rm(file, { recursive: true, force: true }, () => {});
  }
);

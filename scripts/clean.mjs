
import * as Fs from "node:fs";
import Package from "../package.json" assert { type: "json" };

Package.files.forEach((file) => {
  Fs.rmSync(file, { recursive: true, force: true });
})

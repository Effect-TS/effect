import * as Fs from "node:fs";
import Package from "../.vscode/settings.json" assert { type: "json" };

const modules = Fs.readdirSync("src").filter(
  (_) => _.endsWith(".ts") && _ !== "index.ts"
);
const files = ["dist", "internal", ...modules.map((_) => _.slice(0, -3))];
const ignores = Object.fromEntries(files.map((value) => [value, true]));

Package["files.exclude"] = ignores;

console.log(JSON.stringify(Package, null, 2));

import * as Fs from "node:fs";

const template = `coverage/
*.tsbuildinfo
node_modules/
yarn-error.log
.ultra.cache.json
.DS_Store
tmp/
build/
dist/
.direnv/

# files
/dist`;

const modules = Fs.readdirSync("src")
  .filter((_) => _.endsWith(".ts") && _ !== "index.ts")
  .map((_) => _.slice(0, -3));

console.log(`${template}
${modules.map((_) => `/${_}`).join("\n")}`);

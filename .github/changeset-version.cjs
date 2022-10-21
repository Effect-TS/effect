const { execSync } = require("node:child_process");

execSync("npm install -g pnpm");
execSync("npx changeset version");
execSync("pnpm install --lockfile-only");

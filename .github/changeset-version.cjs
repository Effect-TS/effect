const { execSync } = require("node:child_process");

execSync("npx changeset version");
execSync("YARN_ENABLE_IMMUTABLE_INSTALLS=false node .yarn/releases/yarn-3.2.1.cjs");

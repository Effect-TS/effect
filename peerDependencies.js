const fs = require("fs");

const package = "@matechs/effect";
const version = "^3.0.0";

const dir = fs.readdirSync("./packages");

dir.forEach(mod => {
  const pjson = require(`./packages/${mod}/package.json`);

  const peerDeps = pjson.peerDependencies || {};

  Object.keys(peerDeps).forEach(dep => {
    if (dep === package) {
      peerDeps[dep] = version;
    }
  });

  if (Object.keys(peerDeps).length > 0) {
    const sortedKeys = Object.keys(peerDeps).sort();

    const sdeps = {};

    sortedKeys.forEach(k => {
      sdeps[k] = peerDeps[k];
    });

    pjson.peerDependencies = sdeps;
  }

  fs.writeFileSync(
    `./packages/${mod}/package.json`,
    JSON.stringify(pjson, null, 2)
  );
});

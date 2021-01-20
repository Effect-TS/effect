const rootDeps = require("./package.json").devDependencies;
const fs = require("fs");

const dir = fs.readdirSync("./packages");

dir.forEach(mod => {
  const pjson = require(`./packages/${mod}/package.json`);

  const devDeps = pjson.devDependencies || {};

  Object.keys(devDeps).forEach(dep => {
    if (rootDeps[dep]) {
      devDeps[dep] = rootDeps[dep];
    }
  });

  const peerDeps = pjson.peerDependencies || {};

  Object.keys(peerDeps).forEach(dep => {
    if (devDeps[dep]) {
      peerDeps[dep] = devDeps[dep];
    } else if (rootDeps[dep]) {
      peerDeps[dep] = rootDeps[dep];
    }
  });

  Object.keys(peerDeps).forEach(dep => {
    if (!devDeps[dep]) {
      devDeps[dep] = peerDeps[dep];
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

  if (Object.keys(devDeps).length > 0) {
    const sortedKeys = Object.keys(devDeps).sort();

    const sdeps = {};

    sortedKeys.forEach(k => {
      sdeps[k] = devDeps[k];
    });

    pjson.devDependencies = sdeps;
  }

  fs.writeFileSync(
    `./packages/${mod}/package.json`,
    JSON.stringify(pjson, null, 2)
  );
});

import * as E from "fp-ts/Either"
import { flow, pipe } from "fp-ts/function"
import * as J from "fp-ts/Json"
import * as TE from "fp-ts/TaskEither"
import * as fs from "fs"

import { copy, exec, onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = copy("./README.md", "./dist", { update: true })

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  TE.chainEitherK(J.parse),
  TE.mapLeft(E.toError)
)

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((y) => typeof y === "string")

const getModules = flow(
  (content: any) => content?.config?.modules,
  TE.fromPredicate(isStringArray, () => new Error("missing modules config"))
)

const getSide = flow(
  (content: any) => content?.config?.side,
  TE.fromPredicate(isStringArray, () => new Error("missing side config"))
)

function carry(s: string, root: any, target: any) {
  if (s in root) {
    target[s] = root[s]
  }
}

const writePackageJsonContent = pipe(
  TE.Do,
  TE.bind("content", () => loadPackageJson),
  TE.bind("modules", ({ content }) => getModules(content)),
  TE.bind("side", ({ content }) => getSide(content)),
  TE.map(({ content, modules, side }) => {
    const packageJson = {}

    carry("name", content, packageJson)
    carry("version", content, packageJson)
    carry("private", content, packageJson)
    carry("license", content, packageJson)
    carry("repository", content, packageJson)
    carry("dependencies", content, packageJson)
    carry("peerDependencies", content, packageJson)
    carry("gitHead", content, packageJson)
    carry("bin", content, packageJson)

    const exports = {}
    const mainExports = {}

    if (fs.existsSync(`./build/esm/index.js`)) {
      mainExports["module"] = `./_esm/index.js`
    }
    if (fs.existsSync(`./build/cjs/index.js`)) {
      mainExports["require"] = `./index.js`
    }

    if (mainExports["require"]) {
      packageJson["main"] = mainExports["require"]
    } else if (mainExports["module"]) {
      packageJson["main"] = mainExports["module"]
    }

    if (Object.keys(mainExports).length > 0) {
      exports["./"] = mainExports

      if (exports["./"]["require"]) {
        exports["./"]["default"] = exports["./"]["require"]
        delete exports["./"]["require"]
      } else if (exports["./"]["module"]) {
        exports["./"]["default"] = exports["./"]["module"]
        delete exports["./"]["module"]
      }
    }

    modules.forEach((m) => {
      exports[`./${m}`] = {}
      if (fs.existsSync(`./build/esm/${m}/index.js`)) {
        exports[`./${m}`]["module"] = `./_esm/${m}/index.js`
      }
      if (fs.existsSync(`./build/cjs/${m}/index.js`)) {
        exports[`./${m}`]["require"] = `./${m}/index.js`
      }
      if (exports[`./${m}`]["require"]) {
        exports[`./${m}`]["default"] = exports[`./${m}`]["require"]
        delete exports[`./${m}`]["require"]
      } else if (exports[`./${m}`]["module"]) {
        exports[`./${m}`]["default"] = exports[`./${m}`]["module"]
        delete exports[`./${m}`]["module"]
      }
      if (Object.keys(exports[`./${m}`]).length === 0) {
        delete exports[`./${m}`]
      }
    })

    return JSON.stringify(
      {
        ...packageJson,
        publishConfig: {
          access: "public"
        },
        sideEffects: side.flatMap((m) => {
          const map = []
          if (fs.existsSync(`./build/cjs/${m}/index.js`)) {
            map.push(`./${m}/index.js`)
          }
          if (fs.existsSync(`./build/esm/${m}/index.js`)) {
            map.push(`./_esm/${m}/index.js`)
          }
          return map
        }),
        exports
      },
      null,
      2
    )
  }),
  TE.chain((str) => writeFile("./dist/package.json", str))
)

pipe(
  exec("rm -rf build/dist"),
  TE.chainFirst(() => exec("mkdir -p dist")),
  TE.chainFirst(() =>
    fs.existsSync(`./src`)
      ? exec(`mkdir -p ./dist/_src && cp -r ./src/* ./dist/_src`)
      : TE.right(void 0)
  ),
  TE.chainFirst(() =>
    fs.existsSync(`./build/esm`)
      ? exec(`mkdir -p ./dist/_esm && cp -r ./build/esm/* ./dist/_esm`)
      : TE.right(void 0)
  ),
  TE.chainFirst(() =>
    fs.existsSync(`./build/cjs`) ? exec(`cp -r ./build/cjs/* ./dist`) : TE.right(void 0)
  ),
  TE.chainFirst(() =>
    fs.existsSync(`./build/dts`) ? exec(`cp -r ./build/dts/* ./dist`) : TE.right(void 0)
  ),
  TE.chainFirst(() => writePackageJsonContent),
  TE.chainFirst(() => copyReadme),
  TE.fold(onLeft, onRight("pack succeeded!")),
  runMain
)

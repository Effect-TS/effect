import * as TE from "@effect-ts/core/Effect"
import { parseJSON_ } from "@effect-ts/core/Either"
import { flow, pipe } from "@effect-ts/core/Function"
import * as fs from "fs"

import { copy, exec, onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = copy("./README.md", "./dist", { update: true })

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  TE.chain((content) =>
    TE.fromEither(() => parseJSON_(content, () => new Error("json parse error")))
  )
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
  TE.do,
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
      mainExports["import"] = `./_esm/index.js`
    }
    if (fs.existsSync(`./build/cjs/index.js`)) {
      mainExports["require"] = `./index.js`
    }

    if (mainExports["require"]) {
      packageJson["main"] = mainExports["require"]
    } else if (mainExports["import"]) {
      packageJson["main"] = mainExports["import"]
    }

    if (Object.keys(mainExports).length > 0) {
      exports["."] = mainExports
    }

    modules.forEach((m) => {
      exports[`./${m}`] = {}
      if (fs.existsSync(`./build/esm/${m}/index.js`)) {
        exports[`./${m}`]["import"] = `./_esm/${m}/index.js`
      }
      if (fs.existsSync(`./build/cjs/${m}/index.js`)) {
        exports[`./${m}`]["require"] = `./${m}/index.js`
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

const writePackageJsonContentInESM = pipe(
  TE.do,
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

    packageJson["type"] = "module"

    const exports = {}
    const mainExports = {}

    if (fs.existsSync(`./build/esm/index.js`)) {
      mainExports["import"] = `./index.js`
    }

    if (mainExports["import"]) {
      packageJson["main"] = mainExports["import"]
    }

    if (Object.keys(mainExports).length > 0) {
      exports["."] = mainExports
    }

    modules.forEach((m) => {
      exports[`./${m}`] = {}
      if (fs.existsSync(`./build/esm/${m}/index.js`)) {
        exports[`./${m}`]["import"] = `./${m}/index.js`
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
          if (fs.existsSync(`./build/esm/${m}/index.js`)) {
            map.push(`./${m}/index.js`)
          }
          return map
        }),
        exports
      },
      null,
      2
    )
  }),
  TE.chain((str) => writeFile("./dist/_esm/package.json", str))
)

pipe(
  exec("rm -rf build/dist"),
  TE.tap(() => exec("mkdir -p dist")),
  TE.tap(() =>
    TE.when(() => fs.existsSync(`./src`))(
      exec(`mkdir -p ./dist/_src && cp -r ./src/* ./dist/_src`)
    )
  ),
  TE.tap(() =>
    TE.when(() => fs.existsSync(`./build/esm`))(
      exec(`mkdir -p ./dist/_esm && cp -r ./build/esm/* ./dist/_esm`)
    )
  ),
  TE.tap(() =>
    TE.when(() => fs.existsSync(`./build/cjs`))(exec(`cp -r ./build/cjs/* ./dist`))
  ),
  TE.tap(() =>
    TE.when(() => fs.existsSync(`./build/dts`))(exec(`cp -r ./build/dts/* ./dist`))
  ),
  TE.tap(() => writePackageJsonContent),
  TE.tap(() => writePackageJsonContentInESM),
  TE.tap(() => copyReadme),
  TE.fold(onLeft, onRight("pack succeeded!")),
  runMain
)

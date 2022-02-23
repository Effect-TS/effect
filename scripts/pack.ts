import * as A from "fp-ts/Array"
import * as E from "fp-ts/Either"
import type { Endomorphism } from "fp-ts/Endomorphism"
import { flow, pipe, unsafeCoerce } from "fp-ts/function"
import * as J from "fp-ts/Json"
import * as TE from "fp-ts/TaskEither"
import * as fs from "fs"
import { posix } from "path"

import {
  copy,
  exec,
  modifyGlob,
  onLeft,
  onRight,
  readFile,
  runMain,
  writeFile
} from "./_common"

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

    if (fs.existsSync(`./build/mjs/index.mjs`)) {
      mainExports["import"] = `./_mjs/index.mjs`
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
      if (fs.existsSync(`./build/mjs/${m}/index.mjs`)) {
        exports[`./${m}`]["import"] = `./_mjs/${m}/index.mjs`
      }
      if (fs.existsSync(`./build/cjs/${m}/index.js`)) {
        exports[`./${m}`]["require"] = `./${m}/index.js`
      }
      if (Object.keys(exports[`./${m}`]).length === 0) {
        delete exports[`./${m}`]
      }
    })

    exports["./*"] = {
      import: "./_mjs/*.mjs",
      require: "./*.js"
    }

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
          if (fs.existsSync(`./build/mjs/${m}/index.js`)) {
            map.push(`./_mjs/${m}/index.js`)
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

const MAP_GLOB_PATTERN = "dist/**/*.map"

interface SourceMapInterface {
  sources: string[]
}

const replaceString: (path: string) => Endomorphism<string> = (path) => {
  const dir = posix.dirname(path)
  const patch: (x: string) => string = path.startsWith("dist/_mjs/")
    ? (x) => x.replace(/(.*)\.\.\/src(.*)/gm, "$1_src$2")
    : (x) => x.replace(/(.*)\.\.\/\.\.\/src(.*)/gm, "$1_src$2")
  return flow(
    patch,
    (x) => posix.relative(dir, posix.join(dir, x)),
    (x) => (x.startsWith(".") ? x : "./" + x)
  )
}

const replace = (content: string, path: string): string =>
  pipe(
    J.parse(content),
    E.mapLeft((reason) => new Error("could not parse json: " + String(reason))),
    E.map((x) => unsafeCoerce<E.Json, SourceMapInterface>(x)),
    E.map(
      flow(
        Object.entries,
        A.map(([k, v]) =>
          k === "sources"
            ? [k, A.array.map(v as string[], replaceString(path))]
            : [k, v]
        ),
        A.reduce({}, (acc, [k, v]) => ({ ...acc, [k]: v }))
      ) as <A>(x: A) => A
    ),
    E.chain((obj) =>
      pipe(
        J.stringify(obj),
        E.mapLeft((reason) => new Error("could not stringify json: " + String(reason)))
      )
    ),
    E.getOrElse(() => content)
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
    fs.existsSync(`./build/mjs`)
      ? exec(`mkdir -p ./dist/_mjs && cp -r ./build/mjs/* ./dist/_mjs`)
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
  TE.chainFirst(() => modifyGlob(replace)(MAP_GLOB_PATTERN)),
  TE.fold(onLeft, onRight("pack succeeded!")),
  runMain
)

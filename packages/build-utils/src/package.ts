import * as A from "@effect-ts/core/Collections/Immutable/Array"
import * as TE from "@effect-ts/core/Effect"
import { parseJSON_ } from "@effect-ts/core/Either"
import { flow, pipe } from "@effect-ts/core/Function"

import { copy, onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = copy("./README.md", "./build", { update: true })

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  TE.chain((content) =>
    TE.fromEither(() => parseJSON_(content, () => new Error("json parse error")))
  )
)

const writePackageJsonContent = (modules: string[], content: any) =>
  pipe(
    JSON.stringify(
      {
        name: content["name"],
        version: content["version"],
        private: false,
        license: content["license"],
        repository: content["repository"],
        sideEffects: content["sideEffects"],
        dependencies: content["dependencies"],
        peerDependencies: content["peerDependencies"],
        gitHead: content["gitHead"],
        main: "./index.js",
        module: "./esm/index.js",
        typings: "./index.d.ts",
        publishConfig: {
          access: "public"
        },
        bin: content["bin"],
        exports: {
          ".": {
            node: "./index.js",
            default: "./esm/index.js"
          },
          ...A.reduce_(modules, {}, (b, m) => ({
            ...b,
            [`./${m}`]: {
              node: `./${m}/index.js`,
              default: `./esm/${m}/index.js`
            }
          })),
          "./package.json": "./package.json"
        }
      },
      null,
      2
    ),
    (str) => writeFile("./build/package.json", str)
  )

const getModules = flow(
  (content: any) => content?.config?.modules,
  TE.fromPredicate(
    (x): x is string[] => Array.isArray(x) && x.every((y) => typeof y === "string"),
    () => new Error("missing modules config")
  )
)

const getSide = flow(
  (content: any) => content?.config?.side,
  (x): string[] => (Array.isArray(x) && x.every((y) => typeof y === "string") ? x : [])
)

const writeModulePackageJson = (modules: string[], content: any) => {
  const side = getSide(content)
  return TE.forEach_(modules, (m) =>
    writeFile(
      `./build/${m}/package.json`,
      JSON.stringify(
        {
          sideEffects: side.includes(m),
          main: "./index.js",
          module: `${A.range(1, m.split("/").length)
            .map(() => "../")
            .join("")}esm/${m}/index.js`,
          typings: `./index.d.ts`
        },
        null,
        2
      )
    )
  )
}

pipe(
  TE.do,
  TE.bind("content", () => pipe(copyReadme, TE.zipRight(loadPackageJson))),
  TE.bind("modules", ({ content }) => getModules(content)),
  TE.tap(({ content, modules }) => writePackageJsonContent(modules, content)),
  TE.tap(({ content, modules }) => writeModulePackageJson(modules, content)),
  TE.foldM(onLeft, onRight("package copy succeeded!")),
  runMain
)

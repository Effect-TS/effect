import * as Ef from "@effect-ts/core/Effect"
import { parseJSON_ } from "@effect-ts/core/Either"
import { flow, pipe } from "@effect-ts/core/Function"

import { copy, onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = copy("./README.md", "./build", { update: true })

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  Ef.chain((content) =>
    Ef.fromEither(() => parseJSON_(content, () => new Error("json parse error")))
  )
)

const writePackageJsonContent = (content: any) =>
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
        type: "module",
        typings: "./index.d.ts",
        publishConfig: {
          access: "public"
        }
      },
      null,
      2
    ),
    (str) => writeFile("./build/esm/package.json", str)
  )

const getModules = flow(
  (content: any) => content?.config?.modules,
  Ef.fromPredicate(
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
  return Ef.forEach_(modules, (m) =>
    writeFile(
      `./build/esm/${m}/package.json`,
      JSON.stringify(
        {
          sideEffects: side.includes(m),
          main: "./index.js",
          type: "module",
          typings: `./index.d.ts`
        },
        null,
        2
      )
    )
  )
}

pipe(
  Ef.do,
  Ef.bind("content", () =>
    pipe(copyReadme, Ef.zipRight(loadPackageJson), Ef.tap(writePackageJsonContent))
  ),
  Ef.bind("modules", ({ content }) => getModules(content)),
  Ef.tap(({ content, modules }) => writeModulePackageJson(modules, content)),
  Ef.foldM(onLeft, onRight("package copy succeeded!")),
  runMain
)

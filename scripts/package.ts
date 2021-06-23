import * as ROA from "fp-ts/Array"
import * as E from "fp-ts/Either"
import { flow, pipe } from "fp-ts/function"
import * as J from "fp-ts/Json"
import * as TE from "fp-ts/TaskEither"

import { copy, onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = copy("./README.md", "./build", { update: true })

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((y) => typeof y === "string")

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  TE.chainEitherK(J.parse),
  TE.mapLeft(E.toError)
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
        module: "./esm/index.js",
        typings: "./index.d.ts",
        publishConfig: {
          access: "public"
        },
        bin: content["bin"]
      },
      null,
      2
    ),
    (str) => writeFile("./build/package.json", str)
  )

const getModules = flow(
  (content: any) => content?.config?.modules,
  TE.fromPredicate(isStringArray, () => new Error("missing modules config"))
)

const getSide = flow(
  (content: any) => content?.config?.side,
  (x): string[] => (isStringArray(x) ? x : [])
)
const buildModulePath = (m: string) => `${ROA.range(1, m.split("/").length)
  .map(() => "../")
  .join("")}esm/${m}/index.js
`

const writeModulePackageJson = (modules: string[], content: any) => {
  const side = getSide(content)
  return pipe(
    modules,
    TE.traverseArray((m) =>
      writeFile(
        `./build/${m}/package.json`,
        JSON.stringify(
          {
            sideEffects: side.includes(m),
            main: "./index.js",
            module: buildModulePath(m),
            typings: `./index.d.ts`
          },
          null,
          2
        )
      )
    )
  )
}

pipe(
  copyReadme,
  TE.apSecond(loadPackageJson),
  TE.chainFirst(writePackageJsonContent),
  TE.bindTo("content"),
  TE.bind("modules", ({ content }) => getModules(content)),
  TE.chainFirst(({ content, modules }) => writeModulePackageJson(modules, content)),
  TE.fold(onLeft, onRight("package copy succeeded!")),
  runMain
)

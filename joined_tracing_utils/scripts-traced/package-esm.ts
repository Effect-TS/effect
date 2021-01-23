import * as A from "fp-ts/lib/Array"
import { parseJSON } from "fp-ts/lib/Either"
import { flow } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import * as TE from "fp-ts/lib/TaskEither"

import { copy, onLeft, onRight, readFile, runMain, writeFile } from "../scripts/_common"

const copyReadme = copy("./README.md", "./build/_traced", { update: true })

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  TE.chainEitherK((content) => parseJSON(content, () => new Error("json parse error")))
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
    (str) => writeFile("./build/_traced/esm/package.json", str)
  )

const getModules = flow(
  (content: any) => content?.config?.modules,
  TE.fromPredicate(
    (x): x is string[] => Array.isArray(x) && x.every((y) => typeof y === "string"),
    () => new Error("missing modules config")
  )
)

const writeModulePackageJson = (modules: string[]) =>
  A.array.traverse(TE.taskEither)(modules, (m) =>
    writeFile(
      `./build/_traced/esm/${m}/package.json`,
      JSON.stringify(
        {
          sideEffects: false,
          main: "./index.js",
          type: "module",
          typings: `./index.d.ts`
        },
        null,
        2
      )
    )
  )

pipe(
  copyReadme,
  TE.apSecond(loadPackageJson),
  TE.chainFirst(writePackageJsonContent),
  TE.chain(getModules),
  TE.chainFirst(writeModulePackageJson),
  TE.fold(onLeft, onRight("package copy succeeded!")),
  runMain
)

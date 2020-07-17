import * as A from "fp-ts/lib/Array"
import { parseJSON } from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import { flow } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import { onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = pipe(
  readFile("./README.md", "utf8"),
  TE.chain((content: any) => writeFile("./build/README.md", content))
)

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
        module: "./esm/index.js",
        typings: "./index.d.ts",
        publishConfig: {
          access: "public"
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

const writeModulePackageJson = (modules: string[]) =>
  A.array.traverse(TE.taskEither)(modules, (m) =>
    writeFile(
      `./build/${m}/package.json`,
      JSON.stringify(
        {
          sideEffects: false,
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

pipe(
  copyReadme,
  TE.apSecond(loadPackageJson),
  TE.chainFirst(writePackageJsonContent),
  TE.chain(getModules),
  TE.chain(writeModulePackageJson),
  TE.fold(onLeft, onRight("package copy succeeded!")),
  runMain
)

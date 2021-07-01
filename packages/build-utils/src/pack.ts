import * as TE from "@effect-ts/core/Effect"
import { parseJSON_ } from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as fs from "fs"

import { copy, exec, onLeft, onRight, readFile, runMain, writeFile } from "./_common"

const copyReadme = copy("./README.md", "./build", { update: true })

const loadPackageJson = pipe(
  readFile("./package.json", "utf8"),
  TE.chain((content) =>
    TE.fromEither(() => parseJSON_(content, () => new Error("json parse error")))
  )
)

const writePackageJsonContent = pipe(
  loadPackageJson,
  TE.map((content: any) =>
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
        publishConfig: {
          access: "public"
        },
        bin: content["bin"],
        type: "module",
        exports: content["exports"]
      },
      null,
      2
    )
  ),
  TE.chain((str) => writeFile("./dist/package.json", str))
)

pipe(
  exec("rm -rf build/dist"),
  TE.tap(() => exec("mkdir -p dist")),
  TE.tap(() =>
    pipe(
      ["build/cjs", "build/esm", "src-imports", "src"],
      TE.forEach((s) =>
        TE.when(() => fs.existsSync(`./${s}`))(
          exec(`mkdir -p ./dist/${s}/ && cp -r ./${s}/* ./dist/${s}`)
        )
      )
    )
  ),
  TE.tap(() =>
    TE.when(() => fs.existsSync(`./build/dts`))(exec(`cp -r ./build/dts/* ./dist`))
  ),
  TE.tap(() => writePackageJsonContent),
  TE.tap(() => copyReadme),
  TE.foldM(onLeft, onRight("package copy succeeded!")),
  runMain
)

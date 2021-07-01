import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
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
  TE.chainFirst(() => exec("mkdir -p dist")),
  TE.chainFirst(() =>
    pipe(
      ["build/cjs", "build/esm", "src-imports", "src"],
      TE.traverseArray((s) =>
        fs.existsSync(`./${s}`)
          ? exec(`mkdir -p ./dist/${s}/ && cp -r ./${s}/* ./dist/${s}`)
          : TE.right(void 0)
      )
    )
  ),
  TE.chainFirst(() =>
    fs.existsSync(`./build/dts`) ? exec(`cp -r ./build/dts/* ./dist`) : TE.right(void 0)
  ),
  TE.chainFirst(() => writePackageJsonContent),
  TE.chainFirst(() => copyReadme),
  TE.fold(onLeft, onRight("pack succeeded!")),
  runMain
)

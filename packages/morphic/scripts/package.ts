import * as fs from "fs"

import chalk from "chalk"
import * as A from "fp-ts/lib/Array"
import { log } from "fp-ts/lib/Console"
import { parseJSON } from "fp-ts/lib/Either"
import * as IO from "fp-ts/lib/IO"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/pipeable"

const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

const modules: string[] = [
  "adt",
  "adt/ctors",
  "adt/matcher",
  "adt/monocle",
  "adt/predicates",
  "adt/utils",
  "model",
  "model/interpreter",
  "model/hkt",
  "model/config",
  "model/create",
  "eq",
  "eq/interpreter",
  "eq/hkt",
  "eq/config",
  "fc",
  "fc/interpreter",
  "fc/hkt",
  "fc/config",
  "batteries",
  "batteries/interpreter",
  "batteries/program",
  "batteries/summoner",
  "batteries/usage",
  "batteries/usage/interpreter-result",
  "batteries/usage/materializer",
  "batteries/usage/program-infer",
  "batteries/usage/program-type",
  "batteries/usage/tagged-union",
  "batteries/usage/utils",
  "utils"
]

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

function onLeft(e: NodeJS.ErrnoException): T.Task<void> {
  return T.fromIO(
    pipe(
      log(e),
      IO.chain(() => exit(1))
    )
  )
}

function onRight(): T.Task<void> {
  return T.fromIO(log(chalk.bold.green("package copy succeeded!")))
}

pipe(
  readFile("./package.json", "utf8"),
  TE.chain((content) =>
    TE.fromEither(parseJSON(content, () => new Error("json parse error")))
  ),
  TE.chain((content: any) =>
    writeFile(
      "./build/package.json",
      JSON.stringify(
        {
          name: content["name"],
          version: content["version"],
          private: false,
          license: content["license"],
          repository: content["repository"],
          sideEffects: content["sideEffects"],
          dependencies: content["dependencies"],
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
      )
    )
  ),
  TE.chain(() => readFile("./README.md", "utf8")),
  TE.chain((content: any) => writeFile("./build/README.md", content)),
  TE.chain(() =>
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
  ),
  TE.fold(onLeft, onRight)
)().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)))

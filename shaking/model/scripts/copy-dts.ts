/**
 * @since 0.0.1
 */
import * as fs from "fs"

import chalk from "chalk"
import * as A from "fp-ts/lib/Array"
import { log } from "fp-ts/lib/Console"
import * as IO from "fp-ts/lib/IO"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
//import { Endomorphism } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import * as glob from "glob"

const DTS_GLOB_PATTERN = "types/**/*.@(ts|js)"

const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

function getDest(s: string) {
  return s.replace("types", "build")
}

function getDestEsm(s: string) {
  return s.replace("types", "build/esm")
}

function modifyGlob(pattern: string): TE.TaskEither<NodeJS.ErrnoException, void> {
  return pipe(
    glob.sync(pattern),
    (s) =>
      A.array.traverse(TE.taskEither)(s, (x) =>
        pipe(
          readFile(x, "utf8"),
          TE.chain((c) => TE.taskEither.map(writeFile(getDest(x), c), () => c)),
          TE.chain((c) => TE.taskEither.map(writeFile(getDestEsm(x), c), () => c))
        )
      ),
    TE.map(() => {
      return
    })
  )
}

const copyDts = modifyGlob(DTS_GLOB_PATTERN)

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
  return T.fromIO(log(chalk.bold.green("dts copy succeeded!")))
}

const main = pipe(copyDts, TE.fold(onLeft, onRight))

main().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)))

import * as fs from "fs"

import chalk from "chalk"
import * as A from "fp-ts/lib/Array"
import { log } from "fp-ts/lib/Console"
import * as IO from "fp-ts/lib/IO"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import { Endomorphism } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import * as glob from "glob"

const GLOB_PATTERN = "build/**/*.@(ts|js)"

const packages = [
  "aio",
  "contrib",
  "core",
  "test-jest",
  "test",
  "graceful",
  "orm",
  "tracing",
  "uuid",
  "zoo",
  "browser",
  "epics",
  "rxjs",
  "apollo",
  "express",
  "http-client-libcurl",
  "http-client-fetch",
  "http-client",
  "koa",
  "rpc-client",
  "rpc",
  "cqrs-es",
  "cqrs",
  "fancy",
  "console",
  "logger-pino",
  "logger-winston",
  "logger",
  "morphic"
]

export const replace: Endomorphism<string> = (s) => {
  let ns = s

  pipe(
    packages,
    A.map((p) => {
      ns = ns.replace(
        new RegExp(
          `(\\.\\./)+(packages|packages_be|packages_fe|packages_http|packages_sys|packages_inc)/${p}/build`,
          "gm"
        ),
        `@matechs/${p}`
      )
    })
  )

  return ns
}

const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

function modifyFile(
  f: Endomorphism<string>
): (path: string) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (path) =>
    pipe(
      readFile(path, "utf8"),
      TE.map(f),
      TE.chain((content) => writeFile(path, content))
    )
}

function modifyFiles(
  f: Endomorphism<string>
): (paths: Array<string>) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (paths) =>
    pipe(
      A.array.traverse(TE.taskEither)(paths, modifyFile(f)),
      TE.map(() => undefined)
    )
}

function modifyGlob(
  f: Endomorphism<string>
): (pattern: string) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (pattern) => pipe(glob.sync(pattern), TE.right, TE.chain(modifyFiles(f)))
}

const replaceFiles = modifyGlob(replace)(GLOB_PATTERN)

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
  return T.fromIO(log(chalk.bold.green("locals rewrite succeeded!")))
}

export const main = pipe(replaceFiles, TE.fold(onLeft, onRight))

main().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)))

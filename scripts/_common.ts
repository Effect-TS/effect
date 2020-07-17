import fs from "fs"

import chalk from "chalk"
import { copy as copy_, AsyncOptions } from "cpx"
import * as A from "fp-ts/lib/Array"
import { log } from "fp-ts/lib/Console"
import * as IO from "fp-ts/lib/IO"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import { Endomorphism, FunctionN } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import glob_ from "glob"

export const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

export const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

const glob = (
  glob: string,
  opts: glob_.IOptions = {}
): TE.TaskEither<Error, string[]> =>
  TE.tryCatch(
    () =>
      new Promise<string[]>((resolve, reject) => {
        glob_(glob, opts, (err, result) =>
          err == null ? resolve(result) : reject(err)
        )
      }),
    (err) => (err instanceof Error ? err : new Error("could not run glob"))
  )

export function onLeft(e: NodeJS.ErrnoException): T.Task<void> {
  return T.fromIO(
    pipe(
      log(e),
      IO.chain(() => exit(1))
    )
  )
}

export function onRight(msg: string) {
  return (): T.Task<void> => T.fromIO(log(chalk.bold.green(msg)))
}

function modifyFile(
  f: Endomorphism<string>
): (path: string) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (path) =>
    pipe(
      readFile(path, "utf8"),
      TE.map((original) => ({ original, updated: f(original) })),
      TE.chain(({ original, updated }) =>
        original === updated ? TE.of(undefined) : writeFile(path, updated)
      )
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

export function modifyGlob(
  f: Endomorphism<string>
): (pattern: string) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (pattern) => pipe(glob(pattern), TE.chain(modifyFiles(f)))
}

export function runMain(t: T.Task<void>): Promise<void> {
  return t().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)))
}

export const copy: FunctionN<
  [string, string, AsyncOptions?],
  TE.TaskEither<Error, void>
> = TE.taskify<string, string, AsyncOptions | undefined, Error, void>(copy_)

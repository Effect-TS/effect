import chalk from "chalk"
import type { AsyncOptions } from "cpx"
import { copy as copy_ } from "cpx"
import { log } from "fp-ts/lib/Console"
import * as E from "fp-ts/lib/Either"
import type { FunctionN } from "fp-ts/lib/function"
import * as IO from "fp-ts/lib/IO"
import { pipe } from "fp-ts/lib/pipeable"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import fs from "fs"
import glob_ from "glob"

export const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

export const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

export const glob = (
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
  f: (content: string, path: string) => string
): (path: string) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (path) =>
    pipe(
      readFile(path, "utf8"),
      TE.map((original) => ({ original, updated: f(original, path) })),
      TE.chain(({ original, updated }) =>
        original === updated ? TE.of(undefined) : writeFile(path, updated)
      )
    )
}

function modifyFiles(
  f: (content: string, path: string) => string
): (paths: Array<string>) => TE.TaskEither<NodeJS.ErrnoException, void> {
  return (paths) => {
    return async () => {
      for (const path of paths) {
        const r = await modifyFile(f)(path)()

        if (r._tag === "Left") {
          return r
        }
      }
      return E.right(undefined)
    }
  }
}

export function modifyGlob(
  f: (content: string, path: string) => string
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

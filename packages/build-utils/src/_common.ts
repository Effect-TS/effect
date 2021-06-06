import * as Ef from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import chalk from "chalk"
import type { AsyncOptions } from "cpx"
import { copy as copy_ } from "cpx"
import fs from "fs"
import glob_ from "glob"

export const log = (message: unknown) =>
  Ef.succeedWith(() => {
    console.log(message)
  })

export const readFile = Ef.fromNodeCb<
  fs.PathLike,
  string,
  NodeJS.ErrnoException,
  string
>(fs.readFile)

export const writeFile = Ef.fromNodeCb<
  fs.PathLike,
  string,
  NodeJS.ErrnoException,
  void
>(fs.writeFile)

export const glob = (glob: string, opts: glob_.IOptions = {}) =>
  Ef.tryCatchPromise(
    () =>
      new Promise<string[]>((resolve, reject) => {
        glob_(glob, opts, (err, result) =>
          err == null ? resolve(result) : reject(err)
        )
      }),
    (err) => (err instanceof Error ? err : new Error("could not run glob"))
  )

export function onLeft(e: NodeJS.ErrnoException) {
  return pipe(
    log(e),
    Ef.chain(() =>
      Ef.succeedWith(() => {
        process.exit(1)
      })
    )
  )
}

export function onRight(msg: string) {
  return () => log(chalk.bold.green(msg))
}

function modifyFile(f: (content: string, path: string) => string) {
  return (path: string) =>
    pipe(
      readFile(path, "utf8"),
      Ef.map((original) => ({ original, updated: f(original, path) })),
      Ef.chain(({ original, updated }) =>
        original === updated ? Ef.unit : writeFile(path, updated)
      )
    )
}

function modifyFiles(f: (content: string, path: string) => string) {
  return (paths: Array<string>) => {
    return Ef.forEach_(paths, modifyFile(f))
  }
}

export function modifyGlob(f: (content: string, path: string) => string) {
  return (pattern: string) => pipe(glob(pattern), Ef.chain(modifyFiles(f)))
}

export async function runMain(t: Ef.UIO<void>): Promise<void> {
  try {
    return Ef.runPromise(t)
  } catch (e) {
    return console.log(chalk.bold.red(`Unexpected error: ${e}`))
  }
}

export const copy = Ef.fromNodeCb<
  string,
  string,
  AsyncOptions | undefined,
  Error,
  void
>(copy_)

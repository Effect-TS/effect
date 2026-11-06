/**
 * The composition root for the twenty-operation program: it provides exactly
 * the twenty operation layers the program requires. Remove any name from the
 * import below and `Effect.runPromise` stops compiling with the missing key in
 * the error; `typetest/errors/missing-twenty.ts` pins what that looks like.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  access,
  copy,
  copyFile,
  exists,
  lstat,
  makeDirectory,
  makeTempDirectory,
  readDirectory,
  readDirectoryEntries,
  readFile,
  readFileString,
  realPath,
  remove,
  rename,
  stat,
  symlink,
  truncate,
  utimes,
  writeFile,
  writeFileString
} from "./NodeFileSystem.ts"
import { exercise } from "./program-twenty.ts"

export const twenty = Layer.mergeAll(
  access,
  copy,
  copyFile,
  exists,
  lstat,
  makeDirectory,
  makeTempDirectory,
  readDirectory,
  readDirectoryEntries,
  readFile,
  readFileString,
  realPath,
  remove,
  rename,
  stat,
  symlink,
  truncate,
  utimes,
  writeFile,
  writeFileString
)

Effect.runPromise(exercise(process.cwd()).pipe(Effect.provide(twenty))).then(
  (result) => process.stdout.write(`${JSON.stringify(result)}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)

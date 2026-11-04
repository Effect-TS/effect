/**
 * The composition root for the twenty-operation program: it provides exactly
 * the twenty operation layers the program requires. Remove any import below
 * and `Effect.runPromise` stops compiling with the missing key in the error;
 * `typetest/errors/missing-twenty.ts` pins what that looks like.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { access } from "./node/access.ts"
import { copy } from "./node/copy.ts"
import { copyFile } from "./node/copyFile.ts"
import { exists } from "./node/exists.ts"
import { lstat } from "./node/lstat.ts"
import { makeDirectory } from "./node/makeDirectory.ts"
import { makeTempDirectory } from "./node/makeTempDirectory.ts"
import { readDirectory } from "./node/readDirectory.ts"
import { readDirectoryEntries } from "./node/readDirectoryEntries.ts"
import { readFile } from "./node/readFile.ts"
import { readFileString } from "./node/readFileString.ts"
import { realPath } from "./node/realPath.ts"
import { remove } from "./node/remove.ts"
import { rename } from "./node/rename.ts"
import { stat } from "./node/stat.ts"
import { symlink } from "./node/symlink.ts"
import { truncate } from "./node/truncate.ts"
import { utimes } from "./node/utimes.ts"
import { writeFile } from "./node/writeFile.ts"
import { writeFileString } from "./node/writeFileString.ts"
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

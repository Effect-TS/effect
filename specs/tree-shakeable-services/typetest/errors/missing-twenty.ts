// The twenty-operation composition root with three implementations left out: the error names the three keys.
// The second run uses the program with the stable `FileSystem` annotation, provided with all twenty: the error
// lists the ten operations that annotation requires beyond the twenty the program calls.
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
} from "../../src/NodeFileSystem.ts"
import { exercise, exerciseStable } from "../../src/program-twenty.ts"

const seventeen = Layer.mergeAll(
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
  symlink,
  truncate,
  writeFile,
  writeFileString
)

Effect.runPromise(exercise("/").pipe(Effect.provide(seventeen)))

const twenty = Layer.mergeAll(seventeen, rename, stat, utimes)

Effect.runPromise(exerciseStable("/").pipe(Effect.provide(twenty)))

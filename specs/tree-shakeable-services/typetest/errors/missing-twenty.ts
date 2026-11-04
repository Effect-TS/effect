// The twenty-operation composition root with three implementations left out: the error names the three keys.
// The second run uses the program with the stable `FileSystem` annotation, provided with all twenty: the error
// lists the ten operations that annotation requires beyond the twenty the program calls.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { access } from "../../src/node/access.ts"
import { copy } from "../../src/node/copy.ts"
import { copyFile } from "../../src/node/copyFile.ts"
import { exists } from "../../src/node/exists.ts"
import { lstat } from "../../src/node/lstat.ts"
import { makeDirectory } from "../../src/node/makeDirectory.ts"
import { makeTempDirectory } from "../../src/node/makeTempDirectory.ts"
import { readDirectory } from "../../src/node/readDirectory.ts"
import { readDirectoryEntries } from "../../src/node/readDirectoryEntries.ts"
import { readFile } from "../../src/node/readFile.ts"
import { readFileString } from "../../src/node/readFileString.ts"
import { realPath } from "../../src/node/realPath.ts"
import { remove } from "../../src/node/remove.ts"
import { rename } from "../../src/node/rename.ts"
import { stat } from "../../src/node/stat.ts"
import { symlink } from "../../src/node/symlink.ts"
import { truncate } from "../../src/node/truncate.ts"
import { utimes } from "../../src/node/utimes.ts"
import { writeFile } from "../../src/node/writeFile.ts"
import { writeFileString } from "../../src/node/writeFileString.ts"
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

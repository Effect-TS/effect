/**
 * A program that uses twenty of the thirty operations, the composition root
 * the spec uses to show what a missing implementation looks like at that
 * scale (`typetest/errors/missing-twenty.ts`).
 *
 * Its inferred requirements list the twenty keys. The exported alias below
 * shows the other choice an author has: annotating with `FileSystem` keeps
 * the public type stable when an internal call is added, at the cost of
 * requiring every operation.
 */
import * as Effect from "effect/Effect"
import * as FileSystem from "./FileSystem.ts"

export const exercise = (root: string) =>
  Effect.gen(function*() {
    const directory = yield* FileSystem.makeTempDirectory({ prefix: "twenty-" })
    yield* FileSystem.makeDirectory(`${directory}/nested`, { recursive: true })
    const file = `${directory}/nested/file.txt`
    yield* FileSystem.writeFileString(file, "twenty")
    yield* FileSystem.writeFile(`${file}.bin`, new TextEncoder().encode("bin"))
    yield* FileSystem.access(file, { readable: true })
    const text = yield* FileSystem.readFileString(file)
    const bytes = yield* FileSystem.readFile(`${file}.bin`)
    const present = yield* FileSystem.exists(file)
    const info = yield* FileSystem.stat(file)
    yield* FileSystem.copyFile(file, `${file}.copy`)
    yield* FileSystem.copy(`${directory}/nested`, `${directory}/copied`)
    yield* FileSystem.rename(`${file}.copy`, `${file}.renamed`)
    yield* FileSystem.symlink(file, `${directory}/link`)
    const linkInfo = yield* FileSystem.lstat(`${directory}/link`)
    const real = yield* FileSystem.realPath(`${directory}/link`)
    yield* FileSystem.truncate(`${file}.renamed`, 3)
    yield* FileSystem.utimes(file, new Date(0), new Date(0))
    const names = yield* FileSystem.readDirectory(`${directory}/nested`)
    const entries = yield* FileSystem.readDirectoryEntries(directory)
    yield* FileSystem.remove(directory, { recursive: true })
    return {
      root,
      text,
      bytes: bytes.length,
      present,
      size: info.size,
      link: linkInfo.type,
      real,
      names: names.length,
      entries: entries.length
    }
  })

/**
 * The same program with a stable public requirement.
 */
export const exerciseStable = (
  root: string
): Effect.Effect<unknown, FileSystem.FileSystemError, FileSystem.FileSystem> => exercise(root)

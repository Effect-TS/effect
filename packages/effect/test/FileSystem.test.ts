import { assert, describe, it } from "@effect/vitest"
import { ByteSize, Effect, Exit, FileSystem, Option, PlatformError } from "effect"

const info = (type: FileSystem.File.Type): FileSystem.File.Info => ({
  type,
  mtime: Option.none(),
  atime: Option.none(),
  birthtime: Option.none(),
  dev: 0n,
  ino: Option.none(),
  mode: 0,
  nlink: Option.none(),
  uid: Option.none(),
  gid: Option.none(),
  rdev: Option.none(),
  size: ByteSize.bytes(0),
  blksize: Option.none(),
  blocks: Option.none()
})

const failure = (_tag: PlatformError.SystemErrorTag, method: string, path: string) =>
  PlatformError.systemError({ _tag, module: "FileSystem", method, pathOrDescriptor: path })

// A directory `a` containing `x.ts`, with `glob` derived by `FileSystem.make`
// from untyped listings, so entry types come from `stat` and `readLink`.
const makeFileSystem = (overrides: {
  readonly stat?: (path: string) => Effect.Effect<FileSystem.File.Info, PlatformError.PlatformError> | undefined
  readonly readLink?: (path: string) => Effect.Effect<string, PlatformError.PlatformError>
}) => {
  const directories: Record<string, ReadonlyArray<string>> = { ".": ["a"], "a": ["x.ts"] }
  return FileSystem.make({
    ...FileSystem.makeNoop({}),
    glob: undefined,
    readDirectory: (path) =>
      path in directories
        ? Effect.succeed([...directories[path]])
        : Effect.fail(failure("NotFound", "readDirectory", path)),
    stat: (path) =>
      overrides.stat?.(path) ??
        (path in directories
          ? Effect.succeed(info("Directory"))
          : path === "a/x.ts"
          ? Effect.succeed(info("File"))
          : Effect.fail(failure("NotFound", "stat", path))),
    // Node and Deno report EINVAL as "Unknown" for a path that is not a link
    readLink: overrides.readLink ?? ((path) => Effect.fail(failure("Unknown", "readLink", path)))
  })
}

describe("FileSystem", () => {
  describe("derived glob", () => {
    it.effect("traverses directories whose readLink reports that they are not links", () =>
      Effect.gen(function*() {
        const fs = makeFileSystem({})
        assert.deepStrictEqual(yield* fs.glob("**"), ["a", "a/x.ts"])
      }))

    it.effect.each([".", "../*", "/x"])(
      "fails when probing %s fails unexpectedly",
      (pattern) =>
        Effect.gen(function*() {
          const error = failure("Unknown", "stat", pattern)
          const fs = makeFileSystem({
            stat: (path) => [".", "..", "/"].includes(path) ? Effect.fail(error) : undefined
          })
          assert.deepStrictEqual(yield* Effect.exit(fs.glob(pattern)), Exit.fail(error))
        })
    )

    it.effect("fails when readLink fails unexpectedly", () =>
      Effect.gen(function*() {
        const error = failure("Busy", "readLink", "a")
        const fs = makeFileSystem({ readLink: () => Effect.fail(error) })
        assert.deepStrictEqual(yield* Effect.exit(fs.glob("**")), Exit.fail(error))
      }))

    it.effect("propagates defects from probing stat", () =>
      Effect.gen(function*() {
        const fs = makeFileSystem({ stat: (path) => path === "." ? Effect.die("boom") : undefined })
        assert.isTrue(Exit.hasDies(yield* Effect.exit(fs.glob("."))))
      }))

    it.effect("propagates defects from readLink", () =>
      Effect.gen(function*() {
        const fs = makeFileSystem({ readLink: () => Effect.die("boom") })
        assert.isTrue(Exit.hasDies(yield* Effect.exit(fs.glob("**"))))
      }))
  })
})

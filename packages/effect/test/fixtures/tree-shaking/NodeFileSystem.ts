/**
 * A provider in one module: three implementations of `effect/FileSystem`
 * operations as top-level exports, and `layer`, the three merged. The root
 * reads two of them off this namespace; the test proves the third, and
 * `layer`, are dropped from the bundle although the module is kept.
 *
 * Each `Layer.succeed(…)` here is a top-level call, which a bundler treats as
 * a side effect until it is annotated pure. The test bundles this module as a
 * platform package ships it, with `babel-plugin-annotate-pure-calls` run over
 * it, and once as written, to show that without the annotation the unused
 * implementation stays.
 */
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PlatformError from "effect/PlatformError"
import * as fs from "node:fs/promises"

/** The error every implementation fails with; `marker` is a literal in each, so the bundle text shows which it carries. */
const failure = (method: string, marker: string, pathOrDescriptor: string) => (cause: unknown) =>
  new PlatformError.PlatformError(
    new PlatformError.SystemError({
      module: "FileSystem",
      method,
      _tag: "Unknown",
      pathOrDescriptor,
      description: marker,
      cause
    })
  )

/** The implementation of `FileSystem.readFile`, as a layer for its operation. */
export const readFile = Layer.succeed(
  FileSystem.readFile,
  (path) =>
    Effect.tryPromise({ try: () => fs.readFile(path), catch: failure("readFile", "fixture/FileSystem/readFile", path) })
      .pipe(Effect.map((buffer) => new Uint8Array(buffer)))
)

/** The implementation of `FileSystem.stat`, as a layer for its operation; no root in this fixture uses it. */
export const stat = Layer.succeed(
  FileSystem.stat,
  (path) =>
    Effect.tryPromise({ try: () => fs.stat(path), catch: failure("stat", "fixture/FileSystem/stat", path) }).pipe(
      Effect.map((stats): FileSystem.File.Info => ({
        type: stats.isDirectory() ? "Directory" : stats.isSymbolicLink() ? "SymbolicLink" : "File",
        mtime: Option.some(stats.mtime),
        atime: Option.some(stats.atime),
        birthtime: Option.some(stats.birthtime),
        dev: BigInt(stats.dev),
        ino: Option.some(BigInt(stats.ino)),
        mode: stats.mode,
        nlink: Option.some(BigInt(stats.nlink)),
        uid: Option.some(stats.uid),
        gid: Option.some(stats.gid),
        rdev: Option.some(BigInt(stats.rdev)),
        size: ByteSize.bytes(stats.size),
        blksize: Option.some(ByteSize.bytes(stats.blksize)),
        blocks: Option.some(BigInt(stats.blocks))
      }))
    )
)

/** The implementation of `FileSystem.writeFile`, as a layer for its operation. */
export const writeFile = Layer.succeed(
  FileSystem.writeFile,
  (path, data) =>
    Effect.tryPromise({
      try: () => fs.writeFile(path, data),
      catch: failure("writeFile", "fixture/FileSystem/writeFile", path)
    })
)

/** The three merged: the coarse-grained form, which no root in this fixture uses either. */
export const layer = Layer.mergeAll(readFile, stat, writeFile)

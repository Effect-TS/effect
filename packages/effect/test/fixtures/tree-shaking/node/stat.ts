import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as fs from "node:fs/promises"
import { failure } from "./internal.ts"

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

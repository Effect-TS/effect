import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import type * as NFS from "node:fs"
import { beforeEach, vi } from "vitest"

const state = vi.hoisted(() => ({
  values: {} as Record<string, bigint>,
  positions: [] as Array<number | bigint | undefined>
}))

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof NFS>()
  // Model Node's default numeric Stats as well as its opt-in BigIntStats.
  // No real file descriptor or oversized sparse file is involved.
  const stat = (
    _pathOrFd: string | number,
    optionsOrCallback: { bigint?: boolean } | ((error: null, stats: object) => void),
    callback?: (error: null, stats: object) => void
  ) => {
    const bigint = typeof optionsOrCallback === "object" && optionsOrCallback.bigint
    const done = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!
    done(null, {
      ...Object.fromEntries(Object.entries(state.values).map(([key, value]) => [key, bigint ? value : Number(value)])),
      mtime: new Date(0),
      atime: new Date(0),
      birthtime: new Date(0),
      isFile: () => true
    })
  }
  return {
    ...original,
    open: (_path: string, _flags: string, _mode: unknown, callback: (error: null, fd: number) => void) =>
      callback(null, 42),
    close: (_fd: number, callback: (error: null) => void) => callback(null),
    stat,
    fstat: stat,
    write: (
      _fd: number,
      _buffer: Uint8Array,
      _offset: unknown,
      _length: unknown,
      position: number | bigint | undefined,
      callback: (error: null, bytesWritten: number) => void
    ) => {
      state.positions.push(position)
      callback(null, 1)
    }
  }
})

const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
const oversized = maxSafe + 2n

describe("NodeFileSystem precision", { concurrent: false }, () => {
  beforeEach(() => {
    state.positions = []
    state.values = {
      size: 4n,
      blksize: 4096n,
      dev: 1n,
      ino: 2n,
      mode: 33188n,
      nlink: 1n,
      uid: 1000n,
      gid: 1000n,
      rdev: 0n,
      blocks: 8n
    }
  })

  for (const method of ["write", "writeAll"] as const) {
    for (const start of [0n, maxSafe, oversized]) {
      it.effect(`${method} keeps exact positions from ${start} or fails with BadArgument`, () =>
        Effect.gen(function*() {
          const fs = yield* FileSystem.FileSystem
          const file = yield* fs.open("precision.bin", { flag: "r+" })
          yield* file.seek(start, "start")
          // The double writes one byte at a time, exercising writeAll's retry cursor.
          const result = yield* Effect.result(
            method === "write"
              ? Effect.forEach([0, 1, 2], () => file.write(new Uint8Array([1])))
              : file.writeAll(new Uint8Array([1, 2, 3]))
          )

          for (const [index, position] of state.positions.entries()) {
            assert.isDefined(position)
            assert.strictEqual(BigInt(position!), start + BigInt(index))
          }
          if (start === 0n) {
            assert.isTrue(Result.isSuccess(result))
          }
          if (Result.isFailure(result)) {
            assert.strictEqual(result.failure._tag, "PlatformError")
            assert.strictEqual(result.failure.reason._tag, "BadArgument")
          } else {
            assert.strictEqual(state.positions.length, 3)
            assert.strictEqual(yield* file.seek(0n, "current"), start + 3n)
          }
        }).pipe(Effect.provide(NodeFileSystem.layer)))
    }
  }

  for (const method of ["stat", "fstat"] as const) {
    const getInfo = Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      return yield* method === "stat" ? fs.stat("precision.bin") : (yield* fs.open("precision.bin")).stat
    })

    for (const field of ["size", "blksize"] as const) {
      it.effect(`${method} preserves oversized ${field} exactly`, () =>
        Effect.gen(function*() {
          state.values[field] = oversized
          const info = yield* getInfo
          assert.strictEqual(field === "size" ? info.size : Option.getOrThrow(info.blksize), ByteSize.bytes(oversized))
        }).pipe(Effect.provide(NodeFileSystem.layer)))
    }

    it.effect(`${method} preserves safe numeric metadata, dates and file type`, () =>
      Effect.gen(function*() {
        state.values.ino = maxSafe
        state.values.dev = maxSafe
        state.values.blocks = maxSafe
        const info = yield* getInfo
        assert.deepStrictEqual(info, {
          type: "File",
          mtime: Option.some(new Date(0)),
          atime: Option.some(new Date(0)),
          birthtime: Option.some(new Date(0)),
          dev: Number.MAX_SAFE_INTEGER,
          ino: Option.some(Number.MAX_SAFE_INTEGER),
          mode: 33188,
          nlink: Option.some(1),
          uid: Option.some(1000),
          gid: Option.some(1000),
          rdev: Option.some(0),
          size: ByteSize.bytes(4),
          blksize: Option.some(ByteSize.bytes(4096)),
          blocks: Option.some(Number.MAX_SAFE_INTEGER)
        })
      }).pipe(Effect.provide(NodeFileSystem.layer)))

    for (const field of ["dev", "ino", "mode", "nlink", "uid", "gid", "rdev", "blocks"] as const) {
      it.effect(`${method} rejects unsafe numeric ${field} with BadArgument`, () =>
        Effect.gen(function*() {
          state.values[field] = oversized
          const error = yield* Effect.flip(getInfo)
          assert.strictEqual(error._tag, "PlatformError")
          assert.strictEqual(error.reason._tag, "BadArgument")
        }).pipe(Effect.provide(NodeFileSystem.layer)))
    }
  }
})

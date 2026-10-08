import * as DenoFileSystem from "@effect/platform-deno/DenoFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import { afterEach } from "vitest"
import { testLayer } from "../../../effect/test/FileSystem.test-utils.ts"

describe("FileSystem", () =>
  testLayer(DenoFileSystem.layer, {
    accessOnDirectory: false,
    tempFileScopedRemovesDirectory: false,
    noFollow: false
  }))

describe("truncate", () => {
  it.effect.each([1.5, NaN])(
    "rejects length %s at the call site without changing the file",
    (length) =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const path = yield* fs.makeTempFileScoped()
        yield* fs.writeFileString(path, "contents")
        const file = yield* fs.open(path, { flag: "r+" })
        yield* file.seek(BigInt(4), "start")
        let threwAtCall = false

        yield* Effect.exit(Effect.suspend(() => {
          try {
            return file.truncate(length)
          } catch (error) {
            threwAtCall = error instanceof RangeError
            return Effect.die(error)
          }
        }))

        assert.deepStrictEqual({
          threwAtCall,
          content: yield* fs.readFileString(path),
          position: yield* file.seek(BigInt(0), "current")
        }, {
          threwAtCall: true,
          content: "contents",
          position: BigInt(4)
        })
      }).pipe(Effect.provide(DenoFileSystem.layer))
  )
})

describe.skipIf(Deno.build.os === "windows")("writeFile", () => {
  it.effect("applies the mode when creating a file", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const path = `${directory}/created`

      yield* fs.writeFileString(path, "content", { mode: 0o600 })

      assert.strictEqual((yield* fs.stat(path)).mode & 0o777, 0o600)
    }).pipe(Effect.provide(DenoFileSystem.layer)))

  it.effect("preserves the mode of an existing file", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* fs.makeTempFileScoped()
      yield* fs.chmod(path, 0o640)

      yield* fs.writeFileString(path, "content", { mode: 0o600 })

      assert.strictEqual((yield* fs.stat(path)).mode & 0o777, 0o640)
    }).pipe(Effect.provide(DenoFileSystem.layer)))
})

describe("File native I/O under interruption", { concurrent: false }, () => {
  const { read, write } = Deno.FsFile.prototype
  afterEach(() => {
    Deno.FsFile.prototype.read = read
    Deno.FsFile.prototype.write = write
  })

  // Holds the first native read until `release` is called.
  const holdFirstNativeRead = () => {
    const started = Promise.withResolvers<void>()
    const released = Promise.withResolvers<void>()
    const finished = Promise.withResolvers<void>()
    let calls = 0
    Deno.FsFile.prototype.read = async function(this: Deno.FsFile, p: Uint8Array) {
      if (calls++ > 0) {
        return read.call(this, p)
      }
      started.resolve()
      await released.promise
      try {
        return await read.call(this, p)
      } finally {
        // Let the caller's continuation run before reporting completion.
        setTimeout(() => finished.resolve(), 0)
      }
    }
    return {
      started: Effect.promise(() => started.promise),
      release: Effect.sync(() => released.resolve()),
      finished: Effect.promise(() => finished.promise)
    }
  }

  const countNativeWrites = () => {
    const counter = { calls: 0 }
    Deno.FsFile.prototype.write = function(this: Deno.FsFile, p: Uint8Array) {
      counter.calls++
      return write.call(this, p)
    }
    return counter
  }

  it.effect.each(["write", "read"] as const)(
    "an interrupted %s waiting behind another operation never reaches the file",
    (operation) =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const path = yield* fs.makeTempFileScoped()
        yield* fs.writeFileString(path, "abcdefghij")
        const file = yield* fs.open(path, { flag: "r+" })
        const held = holdFirstNativeRead()
        const nativeWrites = countNativeWrites()
        const buffer = new Uint8Array(3)

        const first = yield* Effect.forkChild(file.read(new Uint8Array(5), { position: BigInt(0) }))
        yield* held.started
        const queued = yield* Effect.forkChild(
          operation === "write"
            ? file.write(new TextEncoder().encode("XYZ"))
            : file.read(buffer, { position: BigInt(5) }),
          { startImmediately: true }
        )
        yield* Fiber.interrupt(queued)
        yield* held.release
        yield* Fiber.join(first)
        // Anything still queued settles before this read does.
        yield* file.read(new Uint8Array(1), { position: BigInt(0) })

        assert.deepStrictEqual({
          content: yield* fs.readFileString(path),
          buffer: Array.from(buffer),
          nativeWrites: nativeWrites.calls
        }, {
          content: "abcdefghij",
          buffer: [0, 0, 0],
          nativeWrites: 0
        })
      }).pipe(Effect.provide(DenoFileSystem.layer))
  )

  it.effect("reads after an interrupted in-flight read see the right bytes", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* fs.makeTempFileScoped()
      yield* fs.writeFileString(path, "abcdefghijklmnop")
      const file = yield* fs.open(path)
      const held = holdFirstNativeRead()
      const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

      const first = yield* Effect.forkChild(file.read(new Uint8Array(5), { position: BigInt(0) }))
      yield* held.started
      yield* Fiber.interrupt(first)
      const second = yield* Effect.forkChild(
        file.readAlloc(5, { position: BigInt(5) }).pipe(Effect.flatMap(Effect.fromOption)),
        { startImmediately: true }
      )
      yield* held.release
      const secondBytes = yield* Fiber.join(second)
      yield* held.finished
      const thirdBytes = yield* file.readAlloc(5, { position: BigInt(5) }).pipe(Effect.flatMap(Effect.fromOption))

      assert.deepStrictEqual([decode(secondBytes), decode(thirdBytes)], ["fghij", "fghij"])
    }).pipe(Effect.provide(DenoFileSystem.layer)))
})

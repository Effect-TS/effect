import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Option, PlatformError, Ref } from "effect"
import * as Logger from "effect/Logger"
import { TestClock } from "effect/testing"

const path = "synthetic-memory.log"
const encoder = new TextEncoder()
const messageLogger = Logger.make<unknown, string>((options) => String(options.message))

const makeFileSystem = (limit: number, failWrites = false) =>
  Effect.gen(function*() {
    assert.isAbove(limit, 0)
    const state = yield* Ref.make({
      bytes: new Uint8Array(0),
      position: 0,
      append: false,
      mode: 0o644,
      writeSizes: [] as Array<number>,
      failures: 0,
      closes: 0,
      syncs: 0,
      opens: [] as Array<readonly [string, Parameters<FileSystem.FileSystem["open"]>[1]]>
    })
    const write: FileSystem.File["write"] = (buffer) =>
      Effect.gen(function*() {
        assert.strictEqual((yield* Ref.get(state)).closes, 0)
        if (failWrites) {
          yield* Ref.update(state, (s) => ({ ...s, failures: s.failures + 1 }))
          return yield* Effect.fail(PlatformError.systemError({
            _tag: "PermissionDenied",
            module: "FileSystem",
            method: "write",
            pathOrDescriptor: path
          }))
        }
        return yield* Ref.modify(state, (s) => {
          const size = Math.min(limit, buffer.length)
          const start = s.append ? s.bytes.length : s.position
          const bytes = new Uint8Array(Math.max(s.bytes.length, start + size))
          bytes.set(s.bytes)
          bytes.set(buffer.subarray(0, size), start)
          return [FileSystem.Size(size), {
            ...s,
            bytes,
            position: start + size,
            writeSizes: [...s.writeSizes, size]
          }]
        })
      })
    const read: FileSystem.File["read"] = (buffer) =>
      Ref.modify(state, (s) => {
        const bytes = s.bytes.subarray(s.position, s.position + buffer.length)
        buffer.set(bytes)
        return [FileSystem.Size(bytes.length), { ...s, position: s.position + bytes.length }]
      })
    // Full File interface: no cast-only partial handle. writeAll really loops
    // over write, advancing by the actual count, including inside UTF-8 characters.
    const file: FileSystem.File = {
      [FileSystem.FileTypeId]: FileSystem.FileTypeId,
      stat: Ref.get(state).pipe(Effect.map((s): FileSystem.File.Info => ({
        type: "File",
        mtime: Option.none(),
        atime: Option.none(),
        birthtime: Option.none(),
        dev: 0,
        ino: Option.none(),
        mode: s.mode,
        nlink: Option.none(),
        uid: Option.none(),
        gid: Option.none(),
        rdev: Option.none(),
        size: FileSystem.Size(s.bytes.length),
        blksize: Option.none(),
        blocks: Option.none()
      }))),
      seek: (offset, from) =>
        Ref.modify(state, (s) => {
          const position = (from === "start" ? 0 : s.position) + Number(offset)
          return [FileSystem.Size(position), { ...s, position }]
        }),
      sync: Ref.update(state, (s) => ({ ...s, syncs: s.syncs + 1 })),
      read,
      readAlloc: (size) =>
        Effect.gen(function*() {
          const buffer = new Uint8Array(Number(size))
          const count = Number(yield* read(buffer))
          return count === 0 ? Option.none() : Option.some(buffer.subarray(0, count))
        }),
      truncate: (length = 0) =>
        Ref.update(state, (s) => {
          const bytes = new Uint8Array(Number(length))
          bytes.set(s.bytes.subarray(0, bytes.length))
          return { ...s, bytes, position: Math.min(s.position, bytes.length) }
        }),
      write,
      writeAll: (buffer) =>
        Effect.gen(function*() {
          let offset = 0
          while (offset < buffer.length) {
            offset += Number(yield* write(buffer.subarray(offset)))
          }
        })
    }
    const fs = FileSystem.makeNoop({
      open: (filePath, options) =>
        Effect.acquireRelease(
          Ref.update(state, (s) => ({
            ...s,
            append: options?.flag?.startsWith("a") ?? false,
            mode: options?.mode ?? s.mode,
            opens: [...s.opens, [filePath, options] as const]
          })).pipe(Effect.as(file)),
          () => Ref.update(state, (s) => ({ ...s, closes: s.closes + 1 }))
        )
    })
    return { file, fs, state }
  })

const logMessages = (logger: Logger.Logger<unknown, void>, messages: ReadonlyArray<string>) =>
  Effect.forEach(messages, (message) => Effect.log(message), { discard: true }).pipe(
    Effect.provide(Logger.layer([logger]))
  )

describe("Logger.toFile", () => {
  const cases = [
    { name: "ASCII with a final newline", messages: ["abc"], limit: 2 },
    { name: "a split multibyte UTF-8 character", messages: ["é🙂"], limit: 1 },
    { name: "multiple messages and newlines", messages: ["first", "café", "🙂 last"], limit: 2 },
    { name: "full-write control", messages: ["first", "café", "🙂 last"], limit: Infinity }
  ]

  for (const { limit, messages, name } of cases) {
    it.effect(`flushes complete bytes on scope close: ${name}`, () =>
      Effect.gen(function*() {
        const { fs, state } = yield* makeFileSystem(limit)
        // This nested scope is the behavior under test: no clock advancement.
        yield* Effect.scoped(Effect.gen(function*() {
          const logger = yield* Logger.toFile(messageLogger, path, { batchWindow: "1 hour" })
          yield* logMessages(logger, messages)
          const before = yield* Ref.get(state)
          assert.strictEqual(before.bytes.length, 0)
          assert.strictEqual(before.closes, 0)
        })).pipe(Effect.provideService(FileSystem.FileSystem, fs))

        const after = yield* Ref.get(state)
        assert.strictEqual(after.closes, 1)
        assert.strictEqual(after.syncs, 0)
        assert.deepStrictEqual(after.bytes, encoder.encode(messages.join("\n") + "\n"))
        assert.isTrue(after.writeSizes.every((size) => size > 0 && size <= limit))
      }))
  }

  it.effect("uses the complete-write contract of the fixture", () =>
    Effect.gen(function*() {
      const { file, state } = yield* makeFileSystem(2)
      const bytes = encoder.encode("café🙂\n")
      assert.strictEqual(yield* file.write(bytes), FileSystem.Size(2))
      assert.deepStrictEqual((yield* Ref.get(state)).bytes, bytes.subarray(0, 2))
      yield* file.writeAll(bytes.subarray(2))
      assert.deepStrictEqual((yield* Ref.get(state)).bytes, bytes)
    }))

  it.effect("forwards the default append flag and path", () =>
    Effect.gen(function*() {
      const { fs, state } = yield* makeFileSystem(Infinity)
      yield* Effect.scoped(Logger.toFile(messageLogger, path)).pipe(
        Effect.provideService(FileSystem.FileSystem, fs)
      )
      const result = yield* Ref.get(state)
      assert.deepStrictEqual(result.opens, [[path, { flag: "a+" }]])
      assert.strictEqual(result.closes, 1)
      assert.deepStrictEqual(result.writeSizes, [])
    }))

  it.effect("forwards an explicit flag, mode and path through the curried API", () =>
    Effect.gen(function*() {
      const { fs, state } = yield* makeFileSystem(Infinity)
      yield* Effect.scoped(Effect.gen(function*() {
        const logger = yield* messageLogger.pipe(Logger.toFile("synthetic-other.log", { flag: "w", mode: 0o600 }))
        yield* logMessages(logger, ["entry"])
      })).pipe(Effect.provideService(FileSystem.FileSystem, fs))
      const result = yield* Ref.get(state)
      assert.deepStrictEqual(result.opens, [["synthetic-other.log", { flag: "w", mode: 0o600 }]])
      assert.deepStrictEqual(result.bytes, encoder.encode("entry\n"))
      assert.strictEqual(result.closes, 1)
    }))

  for (const limit of [2, Infinity]) {
    it.effect(`flushes on schedule without duplicating bytes on close (limit ${limit})`, () =>
      Effect.gen(function*() {
        const { fs, state } = yield* makeFileSystem(limit)
        yield* Effect.scoped(Effect.gen(function*() {
          const logger = yield* Logger.toFile(messageLogger, path, { batchWindow: "1 second" })
          yield* logMessages(logger, ["café", "🙂"])
          yield* TestClock.adjust("1 second")
          const first = yield* Ref.get(state)
          assert.deepStrictEqual(first.bytes, encoder.encode("café\n🙂\n"))
          assert.strictEqual(first.closes, 0)
          yield* TestClock.adjust("1 second")
          assert.deepStrictEqual((yield* Ref.get(state)).bytes, first.bytes)
          yield* logMessages(logger, ["last"])
        })).pipe(Effect.provideService(FileSystem.FileSystem, fs))
        const result = yield* Ref.get(state)
        assert.deepStrictEqual(result.bytes, encoder.encode("café\n🙂\nlast\n"))
        assert.strictEqual(result.closes, 1)
      }))
  }

  it.effect("ignores typed write failures and still cleans up exactly once", () =>
    Effect.gen(function*() {
      const { fs, state } = yield* makeFileSystem(2, true)
      yield* Effect.scoped(Effect.gen(function*() {
        const logger = yield* Logger.toFile(messageLogger, path, { batchWindow: "1 hour" })
        yield* logMessages(logger, ["synthetic event"])
      })).pipe(Effect.provideService(FileSystem.FileSystem, fs))
      const result = yield* Ref.get(state)
      assert.strictEqual(result.failures, 1)
      assert.strictEqual(result.closes, 1)
      assert.strictEqual(result.bytes.length, 0)
      assert.strictEqual(result.syncs, 0)
    }))
})

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import { assert, it } from "@effect/vitest"
import * as FileSystemTest from "effect-test/FileSystemTest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as PlatformError from "effect/PlatformError"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

type NodeFile = FileSystem.File & { readonly fd: number }

const assertNodeFileError = (error: PlatformError.PlatformError, method: string, fd: number) => {
  assert.strictEqual(error._tag, "PlatformError")
  if (!(error.reason instanceof PlatformError.SystemError)) {
    return assert.fail("Expected a SystemError")
  }
  assert.strictEqual(error.reason.module, "FileSystem")
  assert.strictEqual(error.reason.method, method)
  assert.strictEqual(error.reason.pathOrDescriptor, fd)
}

const startWatch = <E, R>(
  fs: FileSystem.FileSystem,
  root: string,
  watch: () => Stream.Stream<FileSystem.WatchEvent, E, R>
) =>
  Effect.gen(function*() {
    const ready = yield* Deferred.make<void>()
    const readyName = ".watch-ready"
    const fiber = yield* watch().pipe(
      Stream.tap((event) =>
        event.path === readyName
          ? Deferred.succeed(ready, undefined)
          : Effect.void
      ),
      Stream.dropUntil((event) => event.path === readyName),
      Stream.filter((event) => event.path !== readyName),
      Stream.runHead,
      Effect.flatMap(Effect.fromOption),
      Effect.forkChild
    )
    const signalFiber = yield* Effect.sleep("10 millis").pipe(
      TestClock.withLive,
      Effect.andThen(fs.writeFileString(`${root}/${readyName}`, "")),
      Effect.forever,
      Effect.forkChild
    )
    yield* Deferred.await(ready).pipe(
      Effect.raceFirst(Fiber.join(fiber).pipe(Effect.asVoid)),
      Effect.ensuring(Fiber.interrupt(signalFiber))
    )
    return fiber
  })

FileSystemTest.suite("node", NodeFileSystem.layer)

it.layer(NodeFileSystem.layer)("FileSystem (node-specific)", (it) => {
  it.effect("should report the descriptor when a file-handle scope closes", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* fs.makeTempFileScoped()
      yield* fs.writeFileString(path, "content")

      const file = yield* Effect.scoped(fs.open(path, { flag: "r+" }))
      const nodeFile = file as NodeFile
      const operations = [
        ["stat", file.stat],
        ["sync", file.sync],
        ["read", file.read(new Uint8Array(1))],
        ["readAlloc", file.readAlloc(1)],
        ["truncate", file.truncate(0)],
        ["write", file.write(new Uint8Array([1]))],
        ["writeAll", file.writeAll(new Uint8Array([1]))]
      ] as const

      for (const [method, operation] of operations) {
        assertNodeFileError(yield* Effect.flip(operation), method, nodeFile.fd)
      }
    }))

  it.effect("should report the descriptor for invalid file-handle access", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* fs.makeTempFileScoped()

      const readable = yield* fs.open(path, { flag: "r" })
      const readableFile = readable as NodeFile
      assertNodeFileError(
        yield* Effect.flip(readable.writeAll(encoder.encode("x"))),
        "writeAll",
        readableFile.fd
      )

      const writable = yield* fs.open(path, { flag: "w" })
      const writableFile = writable as NodeFile
      assertNodeFileError(yield* Effect.flip(writable.readAlloc(1)), "readAlloc", writableFile.fd)
    }))

  it.effect("writeAll accepts an empty buffer", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* fs.makeTempFileScoped()
      const file = yield* fs.open(path, { flag: "r+" })

      yield* file.writeAll(new Uint8Array(0))
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    ))

  it.effect("watch reports Create for a new file outside the current directory", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const name = "created.txt"
      const path = `${root}/${name}`
      assert.strictEqual(yield* fs.exists(name), false)

      const fiber = yield* startWatch(fs, root, () => fs.watch(root))
      yield* fs.writeFileString(path, "")

      const event = yield* Fiber.join(fiber)
      assert.strictEqual(yield* fs.exists(path), true)
      assert.deepStrictEqual(event, { _tag: "Create", path: name })
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    ))

  it.effect("watch does not report nested changes when recursive is false", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const nested = `${root}/nested`
      yield* fs.makeDirectory(nested)

      const fiber = yield* startWatch(fs, root, () => fs.watch(root, { recursive: false }))

      yield* fs.writeFileString(`${nested}/nested.txt`, "")
      yield* fs.writeFileString(`${root}/direct.txt`, "")

      const event = yield* Fiber.join(fiber)
      assert.strictEqual(event.path, "direct.txt")
    }).pipe(Effect.scoped))

  it.effect("watch is non-recursive when options are omitted", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const nested = `${root}/nested`
      yield* fs.makeDirectory(nested)

      const fiber = yield* startWatch(fs, root, () => fs.watch(root))

      yield* fs.writeFileString(`${nested}/nested.txt`, "")
      yield* fs.writeFileString(`${root}/direct.txt`, "")

      const event = yield* Fiber.join(fiber)
      assert.strictEqual(event.path, "direct.txt")
    }).pipe(Effect.scoped))

  it.effect("watch reports nested changes when recursive is true", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const nested = `${root}/nested`
      yield* fs.makeDirectory(nested)

      const fiber = yield* startWatch(fs, root, () => fs.watch(root, { recursive: true }))

      yield* fs.writeFileString(`${nested}/nested.txt`, "")

      const event = yield* Fiber.join(fiber)
      assert(event.path.endsWith("nested.txt"))
    }).pipe(Effect.scoped))

  it.effect("should read a pre-existing host file when the fixture exists", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const data = yield* fs.readFile(`${__dirname}/../../../effect/test/fixtures/text.txt`)

      assert.strictEqual(decoder.decode(data).trim(), "lorem ipsum dolar sit amet")
    }))
})

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import { EventEmitter } from "node:events"
import * as NFS from "node:fs"
import * as Path from "node:path"
import { vi } from "vitest"
import { testLayer } from "../../../effect/test/FileSystem.test-utils.ts"

vi.mock("node:fs", async (importOriginal) => ({
  ...await importOriginal<typeof NFS>()
}))

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

describe("FileSystem", () => {
  testLayer(NodeFileSystem.layer)

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

  it.effect("watch reports Remove for a deleted file outside the current directory", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped()
      const name = "removed.txt"
      const path = `${root}/${name}`
      yield* fs.writeFileString(path, "")

      const fiber = yield* startWatch(fs, root, () => fs.watch(root))
      yield* fs.remove(path)

      const event = yield* Fiber.join(fiber)
      assert.strictEqual(yield* fs.exists(path), false)
      assert.deepStrictEqual(event, { _tag: "Remove", path: name })
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    ))

  it.effect.each([false, true])(
    "watch resolves a relative directory with recursive %s",
    (recursive) =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const root = yield* fs.makeTempDirectoryScoped()
        yield* fs.makeDirectory(`${root}/nested`)
        const name = recursive ? Path.join("nested", "created.txt") : "created.txt"
        const path = Path.join(root, name)

        const fiber = yield* startWatch(fs, root, () => fs.watch(Path.relative(process.cwd(), root), { recursive }))
        yield* fs.writeFileString(path, "")

        const event = yield* Fiber.join(fiber)
        assert.strictEqual(yield* fs.exists(path), true)
        assert.deepStrictEqual(event, { _tag: "Create", path: name })
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
  )

  it.effect.each([false, true])(
    "watch resolves file events with a relative target %s",
    (relative) =>
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const path = yield* fs.makeTempFileScoped()
        const name = Path.basename(path)
        const target = relative ? Path.relative(process.cwd(), path) : path
        const watcher = new class extends EventEmitter implements NFS.FSWatcher {
          close() {}
          ref() {
            return this
          }
          unref() {
            return this
          }
        }()
        const watch = yield* Effect.acquireRelease(
          Effect.sync(() => vi.spyOn(NFS, "watch")),
          (watch) => Effect.sync(() => watch.mockRestore())
        )
        // Inject a rename notification while the file exists, without a native rename race.
        watch.mockImplementationOnce((
          filename: NFS.PathLike,
          options: NFS.WatchOptions | NFS.WatchListener<string>,
          listener?: NFS.WatchListener<string>
        ) => {
          assert.strictEqual(filename, target)
          assert.deepStrictEqual(options, { recursive: false })
          listener?.("rename", name)
          return watcher
        })

        const event = yield* fs.watch(target).pipe(Stream.runHead, Effect.flatMap(Effect.fromOption))
        assert.deepStrictEqual(event, { _tag: "Create", path: name })
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
  )

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
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    ))

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
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    ))

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
    }).pipe(
      Effect.provide(NodeFileSystem.layer)
    ))
})

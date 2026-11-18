import { assert, describe, it } from "@effect/vitest"
import { BytePath, Deferred, Effect, Exit, Fiber, Option, Result, Scope, Stream } from "effect"
import { fromCaller } from "effect/internal/memoryFileSystem"
import * as MemoryFileSystem from "effect/MemoryFileSystem"
import * as Vfs from "effect/virtual-file-system/VirtualFileSystem"

const credentials = { uid: 0, gid: 0, privileged: true }
const bytes = (value: string) => new TextEncoder().encode(value)
const scope = Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

it.effect("should reject service operations but retain open file grants when the service scope closes", () =>
  Effect.gen(function*() {
    const lifetime = yield* scope
    const fs = yield* Scope.provide(MemoryFileSystem.make, lifetime)
    yield* fs.writeFileString("/file", "retained")
    const file = yield* fs.open("/file")
    yield* Scope.close(lifetime, Exit.void)
    assert.strictEqual((yield* Effect.flip(fs.stat("/file"))).reason._tag, "BadResource")
    assert.strictEqual(new TextDecoder().decode(Option.getOrThrow(yield* file.readAlloc(8))), "retained")
  }))

it.effect("should use distinct device identities when independent filesystems are created", () =>
  Effect.gen(function*() {
    const first = yield* MemoryFileSystem.make
    const second = yield* MemoryFileSystem.make
    assert.notStrictEqual((yield* first.stat("/")).dev, (yield* second.stat("/")).dev)
  }))

it.effect("should return a platform error when paths exceed the underlying VFS limit", () =>
  Effect.gen(function*() {
    const fs = yield* MemoryFileSystem.make
    const error = yield* Effect.flip(fs.makeDirectory("/d".repeat(6000), { recursive: true }))
    assert.strictEqual(error.reason._tag, "InvalidData")
    assert.isFalse(yield* fs.exists("/d"))
  }))

it.effect("should list each entry's own type when symbolic links are dangling or point to directories", () =>
  Effect.gen(function*() {
    const fs = yield* MemoryFileSystem.make
    yield* fs.makeDirectory("/entries/directory", { recursive: true })
    yield* fs.writeFileString("/entries/file", "text")
    yield* fs.symlink("directory", "/entries/link")
    yield* fs.symlink("missing", "/entries/dangling")
    assert.deepStrictEqual(yield* fs.readDirectoryEntries("/entries"), [
      { name: "dangling", type: "SymbolicLink" },
      { name: "directory", type: "Directory" },
      { name: "file", type: "File" },
      { name: "link", type: "SymbolicLink" }
    ])
  }))

it.effect("should preserve replacement paths when scoped temporary cleanup runs", () =>
  Effect.gen(function*() {
    const fs = yield* MemoryFileSystem.make
    let replaced = ""
    yield* Effect.scoped(Effect.gen(function*() {
      replaced = yield* fs.makeTempDirectoryScoped()
      yield* fs.rename(replaced, `${replaced}-moved`)
      yield* fs.makeDirectory(replaced)
      yield* fs.writeFileString(`${replaced}/keep`, "safe")
    }))
    assert.strictEqual(yield* fs.readFileString(`${replaced}/keep`), "safe")
  }))

for (const outcome of ["success", "failure", "interruption"] as const) {
  it.effect(`should release watch subscriptions when the consumer ends by ${outcome}`, () =>
    Effect.gen(function*() {
      const owner = yield* Vfs.make()
      const caller = yield* owner.authorize({ credentials })
      const fs = fromCaller(caller)
      const ready = yield* Deferred.make<void>()
      const watching = yield* fs.watch("/", {
        onReady: () => {
          Deferred.doneUnsafe(ready, Effect.void)
        }
      }).pipe(
        Stream.mapEffect(() => outcome === "failure" ? Effect.fail("expected") : Effect.void),
        outcome === "success" ? Stream.take(1) : (stream) => stream,
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true })
      )
      yield* Deferred.await(ready)
      assert.strictEqual((yield* owner.usage).watchers, 1)
      if (outcome === "interruption") yield* Fiber.interrupt(watching)
      else {
        yield* caller.makeDirectory("/from-vfs")
        const exit = yield* Fiber.await(watching)
        assert.strictEqual(exit._tag, outcome === "success" ? "Success" : "Failure")
      }
      assert.strictEqual((yield* owner.usage).watchers, 0)
    }))
}

it.effect("should fail with WatchOverflow when a subscribed consumer cannot keep up", () =>
  Effect.gen(function*() {
    const owner = yield* Vfs.make({ limits: { watchEvents: 2 } })
    const caller = yield* owner.authorize({ credentials })
    const fs = fromCaller(caller)
    const ready = yield* Deferred.make<void>()
    const first = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const watching = yield* fs.watch("/", {
      onReady: () => {
        Deferred.doneUnsafe(ready, Effect.void)
      }
    }).pipe(
      Stream.tap(() => Deferred.succeed(first, undefined).pipe(Effect.andThen(Deferred.await(release)))),
      Stream.runDrain,
      Effect.forkChild({ startImmediately: true })
    )
    yield* Deferred.await(ready)
    yield* caller.makeDirectory("/first")
    yield* Deferred.await(first)
    for (const name of ["second", "third", "fourth"]) yield* caller.makeDirectory(`/${name}`)
    yield* Deferred.succeed(release, undefined)
    const error = yield* Effect.flip(Fiber.join(watching))
    assert.isTrue(MemoryFileSystem.isWatchOverflow(error))
    assert.strictEqual((yield* owner.usage).watchers, 0)
  }))

it.effect("should follow only the selected alias when a watched file is renamed", () =>
  Effect.gen(function*() {
    const fs = yield* MemoryFileSystem.make
    yield* fs.writeFileString("/file", "old")
    yield* fs.link("/file", "/alias")
    const watching = yield* fs.watch("/file").pipe(Stream.runCollect, Effect.forkChild({ startImmediately: true }))
    yield* fs.rename("/file", "/moved")
    yield* fs.writeFileString("/alias", "new")
    yield* fs.remove("/moved")
    assert.deepStrictEqual(yield* Fiber.join(watching), [
      { _tag: "Remove", path: "/file" },
      { _tag: "Create", path: "/moved" },
      { _tag: "Update", path: "/moved" },
      { _tag: "Remove", path: "/moved" }
    ])
  }))

describe("community copy behavior", () => {
  it.effect("should retain hard-link topology, literal links, modes, and timestamps when copying trees", () =>
    Effect.gen(function*() {
      const fs = yield* MemoryFileSystem.make
      yield* fs.makeDirectory("/source/nested", { recursive: true })
      yield* fs.writeFileString("/source/nested/a", "run")
      yield* fs.chmod("/source/nested/a", 0o4755)
      yield* fs.link("/source/nested/a", "/source/nested/b")
      yield* fs.symlink("missing", "/source/dangling")
      yield* fs.utimes("/source/nested", 100, 200)
      yield* fs.chmod("/source/nested", 0)
      yield* fs.copy("/source", "/copy", { preserveTimestamps: true })
      assert.deepStrictEqual((yield* fs.stat("/copy/nested/a")).ino, (yield* fs.stat("/copy/nested/b")).ino)
      assert.strictEqual((yield* fs.stat("/copy/nested/a")).mode & 0o7777, 0o4755)
      assert.strictEqual((yield* fs.stat("/copy/nested")).mode & 0o7777, 0)
      assert.strictEqual(Option.getOrThrow((yield* fs.stat("/copy/nested")).mtime).getTime(), 200000)
      assert.strictEqual(yield* fs.readLink("/copy/dangling"), "missing")
    }))

  it.effect("should keep existing destination aliases and handles when copyFile replaces contents", () =>
    Effect.gen(function*() {
      const fs = yield* MemoryFileSystem.make
      yield* fs.writeFileString("/source", "copied", { mode: 0o600 })
      yield* fs.writeFileString("/destination", "old", { mode: 0o777 })
      yield* fs.link("/destination", "/alias")
      const handle = yield* fs.open("/destination")
      const before = yield* fs.stat("/destination")
      yield* fs.copyFile("/source", "/destination")
      assert.deepStrictEqual((yield* fs.stat("/destination")).ino, before.ino)
      assert.strictEqual((yield* fs.stat("/alias")).mode & 0o7777, 0o600)
      assert.strictEqual(new TextDecoder().decode(Option.getOrThrow(yield* handle.readAlloc(6))), "copied")
    }))

  it.effect("should clean the claimed destination when a bounded copy fails", () =>
    Effect.gen(function*() {
      const owner = yield* Vfs.make({ limits: { entries: 5 } })
      const caller = yield* owner.authorize({ credentials })
      const fs = fromCaller(caller)
      yield* fs.makeDirectory("/source")
      yield* fs.writeFileString("/source/a", "a")
      yield* fs.writeFileString("/source/b", "b")
      const error = yield* Effect.flip(fs.copy("/source", "/copy"))
      assert.strictEqual(error.reason._tag, "Unknown")
      assert.isFalse(yield* fs.exists("/copy"))
      assert.strictEqual(yield* fs.readFileString("/source/b"), "b")
      assert.strictEqual((yield* owner.usage).handles, 0)
    }))

  it.effect("should preserve raw byte names and empty link targets when copying trees", () =>
    Effect.gen(function*() {
      const owner = yield* Vfs.make()
      const caller = yield* owner.authorize({ credentials })
      const fs = fromCaller(caller)
      yield* caller.makeDirectory("/source")
      const name = Result.getOrThrow(BytePath.fromBytes(new Uint8Array([255])))
      yield* caller.writeFile({ directory: "/source", name }, bytes("raw"))
      yield* caller.makeSymlink("/source/empty", "")
      yield* fs.copy("/source", "/copy")
      assert.deepStrictEqual(yield* caller.readFile({ directory: "/copy", name }), bytes("raw"))
      assert.strictEqual(BytePath.byteLength(yield* caller.readLink("/copy/empty")), 0)
    }))
})

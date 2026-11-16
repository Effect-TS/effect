import { assert, it } from "@effect/vitest"
import { Clock, Effect, Exit, Result, Scope } from "effect"
import { TestClock } from "effect/testing"
import { installStorage } from "effect/virtual-file-system/internal/engine"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"

it.effect("removes the scope finalizer after explicit durable handle close", () =>
  Effect.gen(function*() {
    const owner = yield* VFS.make()
    const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
    yield* installStorage(owner, () => Effect.void, () => false)
    const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
    const file = yield* Scope.provide(caller.open("/file", { create: "ifmissing" }), scope)
    yield* file.close()
    assert.strictEqual(scope.state._tag, "Empty")
  }))

it.effect("rejects storage installation on an owner that permits synchronous publication", () =>
  Effect.gen(function*() {
    const owner = yield* VFS.make({ limits: { synchronous: true } })
    const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
    const sync = yield* caller.acquireSync
    assert.throws(() => installStorage(owner, () => Effect.void, () => false), /synchronous/)
    Result.getOrThrow(sync.createFile("/local"))
    yield* caller.stat("/local")
  }))

it.effect("keeps the cursor, destination, and stored access time together on borrowed reads", () =>
  Effect.gen(function*() {
    const owner = yield* VFS.make().pipe(Effect.provideService(Clock.Clock, yield* Clock.Clock))
    const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
    yield* caller.writeFile("/file", new Uint8Array([1, 2]))
    const file = yield* caller.open("/file")
    const atime = (yield* file.stat()).metadata.atime
    const offered: Array<bigint> = []
    yield* installStorage(owner, (nodes, changed) =>
      Effect.sync(() => {
        for (const id of changed) offered.push(nodes.get(id)!.atime)
      }), () => false)
    yield* TestClock.adjust("1 second")
    const destination = new Uint8Array([9])
    const error = yield* Effect.flip(file.read(destination))
    assert.strictEqual(error._tag, "Busy")
    if (error._tag === "Busy") assert.strictEqual(error.reason, "accessTimeUpdate")
    assert.deepStrictEqual(destination, new Uint8Array([9]))
    assert.strictEqual(yield* file.position(), 0n)
    assert.strictEqual((yield* file.stat()).metadata.atime, atime)
    assert.deepStrictEqual(offered, [])

    assert.deepStrictEqual(yield* file.readAlloc(1), new Uint8Array([1]))
    assert.deepStrictEqual(offered, [(yield* file.stat()).metadata.atime])
    assert.strictEqual(yield* file.read(destination), 1)
    assert.deepStrictEqual(destination, new Uint8Array([2]))
    assert.strictEqual(yield* file.position(), 2n)
    assert.strictEqual(offered.length, 1)
  }))

for (const last of ["caller", "handle", "concurrent"] as const) {
  it.effect(`offers a detached directory once when its final pins close (${last})`, () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const admin = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
      const directory = yield* admin.makeDirectory("/directory")
      const id = directory.metadata.objectNumber
      const scope = yield* Scope.make()
      const closeCaller = Scope.close(scope, Exit.void)
      yield* Effect.addFinalizer(() => closeCaller)
      yield* admin.withRoot("/directory").pipe(Scope.provide(scope))
      const handle = yield* admin.openDirectory("/directory")
      const offers: Array<boolean> = []
      yield* installStorage(owner, (nodes) =>
        Effect.sync(() => {
          offers.push(nodes.has(id))
        }), () => false)

      yield* admin.removeDirectory("/directory")
      assert.deepStrictEqual(offers, [true])
      if (last === "concurrent") {
        yield* Effect.all([closeCaller, handle.close()], { concurrency: "unbounded" })
      } else {
        yield* (last === "caller" ? handle.close() : closeCaller)
        assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 1)
        assert.deepStrictEqual(offers, [true])
        yield* (last === "caller" ? closeCaller : handle.close())
      }
      assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 0)
      assert.deepStrictEqual(offers, [true, false])
    }))
}

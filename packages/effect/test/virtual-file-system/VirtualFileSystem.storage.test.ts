import { assert, it } from "@effect/vitest"
import { Clock, Effect, Result } from "effect"
import { TestClock } from "effect/testing"
import { installStorage } from "effect/virtual-file-system/internal/engine"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"

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

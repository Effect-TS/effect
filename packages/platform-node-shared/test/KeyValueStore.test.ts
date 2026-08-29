import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as KvN from "@effect/platform-node-shared/NodeKeyValueStore"
import * as PlatformError from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
// @ts-ignore
import { testLayer } from "../../platform/test/KeyValueStore.test.js"

const KeyValueLive = KvN.layerFileSystem(`${__dirname}/fixtures/kv`)

describe.sequential("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))

it.effect("rejects invalid keys without modifying the file system", () =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const root = yield* fs.makeTempDirectoryScoped()
    const directory = `${root}/store`
    const sibling = `${root}/sibling.txt`
    yield* fs.makeDirectory(directory)
    yield* fs.writeFileString(sibling, "sibling")

    yield* Effect.gen(function*() {
      const store = yield* KeyValueStore.KeyValueStore

      for (const key of ["", ".", ".."]) {
        const operations = [
          ["get", Effect.asVoid(store.get(key))],
          ["getUint8Array", Effect.asVoid(store.getUint8Array(key))],
          ["set", Effect.asVoid(store.set(key, "value"))],
          ["remove", Effect.asVoid(store.remove(key))],
          ["has", Effect.asVoid(store.has(key))]
        ] as const

        for (const [method, operation] of operations) {
          const error = yield* Effect.flip(operation)
          assert.instanceOf(error, PlatformError.BadArgument)
          assert.strictEqual(error.method, method)
        }
      }
    }).pipe(Effect.provide(KvN.layerFileSystem(directory)))

    assert.isTrue(yield* fs.exists(directory))
    assert.deepStrictEqual(yield* fs.readDirectory(directory), [])
    assert.strictEqual(yield* fs.readFileString(sibling), "sibling")
  }).pipe(
    Effect.scoped,
    Effect.provide(NodeFileSystem.layer)
  ))

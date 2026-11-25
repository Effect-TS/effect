import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, FileSystem, Layer } from "effect"
import * as PersistedQueueTest from "effect-test/persistence/PersistedQueueTest"
import { PersistedQueue } from "effect/persistence"
import { Reactivity } from "effect/reactivity"

const ClientLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
}).pipe(
  Layer.unwrap,
  Layer.provide([NodeFileSystem.layer, Reactivity.layer])
)

PersistedQueueTest.suite(
  "sql-sqlite-node",
  PersistedQueue.layerStoreSql().pipe(Layer.provide(ClientLayer)),
  { nonDeliveryWait: "250 millis" }
)

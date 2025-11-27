import { Reactivity } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect } from "effect"
import * as Layer from "effect/Layer"
import * as SqlPersistedQueueTest from "../../sql/test/SqlPersistedQueueTest.js"

const SqliteClientLayer = Layer.unwrapScoped(Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
})).pipe(Layer.provide([NodeFileSystem.layer, Reactivity.layer]))

SqlPersistedQueueTest.suite(SqliteClientLayer)

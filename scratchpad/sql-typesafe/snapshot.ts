// Run from the repository root: node scratchpad/sql-typesafe/snapshot.ts
// Regenerate this snapshot whenever the migrations change.
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as Effect from "effect/Effect"
import * as Migrator from "effect/sql/Migrator"
import { fileURLToPath } from "node:url"
import { migrations } from "./migrations.ts"

await Migrator.runWithSnapshot({
  loader: migrations,
  schemaDirectory: fileURLToPath(new URL("./", import.meta.url))
}).pipe(
  Effect.provide([NodeFileSystem.layer, SqliteClient.layer({ filename: ":memory:" })]),
  Effect.runPromise
)

console.log("Generated scratchpad/sql-typesafe/_schema.json from the migrated SQLite database.")

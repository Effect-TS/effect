import { MssqlClient } from "@effect/sql-mssql"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema, Stream } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { Model } from "effect/schema"
import { SqlClient, SqlModel } from "effect/sql"
import type * as SqlConnection from "effect/sql/SqlConnection"

class User extends Model.Class<User>("User")({
  id: Schema.Int.pipe(Model.FieldExcept(["insert"])),
  name: Schema.String
}) {}

describe("SqlModel", () => {
  it.effect("makeRepository update uses OUTPUT on mssql", () =>
    Effect.gen(function*() {
      const queries: Array<string> = []
      const execute = (sql: string): Effect.Effect<ReadonlyArray<any>> =>
        Effect.sync(() => {
          queries.push(sql)
          return [{ id: 1, name: "Grace" }]
        })
      const connection: SqlConnection.Connection = {
        execute,
        executeRaw: execute,
        executeValues: execute,
        executeUnprepared: execute,
        executeValuesUnprepared: execute,
        executeStream: (sql) => Stream.fromEffect(execute(sql))
      }
      const sql = yield* SqlClient.make({
        driver: "test",
        acquirer: Effect.succeed(connection),
        compiler: MssqlClient.makeCompiler(),
        spanAttributes: []
      })
      const repo = yield* SqlModel.makeRepository(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "Users"
      }).pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const user = yield* repo.update(User.update.make({ id: 1, name: "Grace" }))

      assert.deepStrictEqual(queries, ["update [users] set [name] = @1 OUTPUT INSERTED.* where [id] = @2"])
      assert.strictEqual(user.name, "Grace")
    }).pipe(Effect.provide(Reactivity.layer)))
})

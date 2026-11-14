import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as SqlClient from "effect/sql/SqlClient"
import * as Coordinator from "./TrinoCoordinator.ts"

const reasonTag = (replies: ReadonlyArray<Coordinator.Reply>) =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    const error = yield* Effect.flip(sql`SELECT 1 AS n`)
    return error.reason._tag
  }).pipe(Effect.provide(Coordinator.layer(replies)))

const queryFailure = (name: string, code: number, type?: string) =>
  reasonTag([Coordinator.page({ next: 1 }), Coordinator.page({ error: Coordinator.queryError(name, code, type) })])

describe("TrinoClient SqlError classification", () => {
  it.effect("classifies query errors by Trino error name", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* queryFailure("SYNTAX_ERROR", 1), "SqlSyntaxError")
      assert.strictEqual(yield* queryFailure("PERMISSION_DENIED", 4), "AuthorizationError")
      assert.strictEqual(
        yield* queryFailure("EXCEEDED_TIME_LIMIT", 131075, "INSUFFICIENT_RESOURCES"),
        "StatementTimeoutError"
      )
      assert.strictEqual(yield* queryFailure("TABLE_NOT_FOUND", 46), "UnknownError")
    }))

  it.effect("classifies rejected credentials and access by HTTP status", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* reasonTag([Coordinator.status(401)]), "AuthenticationError")
      assert.strictEqual(yield* reasonTag([Coordinator.status(403)]), "AuthorizationError")
    }))
})

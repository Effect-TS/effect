import { TrinoClient } from "@effect/sql-trino"
import { Effect, Layer } from "effect"
import type * as HttpClient from "effect/http/HttpClient"
import { SqlClient } from "effect/sql"
import type { SqlError } from "effect/sql/SqlError"
import { describe, expect, it } from "tstyche"

const program = Effect.service(TrinoClient.TrinoClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("TrinoClient", () => {
  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<
      Effect.Effect<void, never, TrinoClient.TrinoClient>
    >()
  })

  it("yields a client that is also a SqlClient", () => {
    expect(Effect.service(TrinoClient.TrinoClient)).type.toBeAssignableTo<
      Effect.Effect<TrinoClient.TrinoClient & SqlClient.SqlClient, never, TrinoClient.TrinoClient>
    >()
  })

  it("requires an HttpClient to build the layer", () => {
    expect(TrinoClient.layer({ url: "http://localhost:8080", user: "test" })).type.toBe<
      Layer.Layer<TrinoClient.TrinoClient | SqlClient.SqlClient, SqlError, HttpClient.HttpClient>
    >()
  })
})

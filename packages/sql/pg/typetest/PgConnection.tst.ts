import { PgClient, PgConnection } from "@effect/sql-pg"
import { Effect, Redacted } from "effect"
import { describe, expect, it } from "tstyche"

describe("PostgreSQL passwords", () => {
  it("accepts static passwords and infallible providers", () => {
    const password = Redacted.make("secret")
    expect(PgConnection.make).type.toBeCallableWith({ password })
    expect(PgClient.make).type.toBeCallableWith({ password })
    expect(PgConnection.make).type.toBeCallableWith({ password: Effect.succeed(password) })
    expect(PgClient.make).type.toBeCallableWith({ password: Effect.succeed(password) })
  })

  it("rejects fallible providers", () => {
    const password = Effect.fail("token fetch failed")
    expect(PgConnection.make).type.not.toBeCallableWith({ password })
    expect(PgClient.make).type.not.toBeCallableWith({ password })
  })
})

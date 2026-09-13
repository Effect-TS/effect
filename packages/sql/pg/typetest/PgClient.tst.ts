import type { PgClient, PgConnection } from "@effect/sql-pg"
import type { Effect, Queue, Scope } from "effect"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { describe, expect, it } from "tstyche"

describe("listen", () => {
  it("preserves SqlError in connection and client notification queues", () => {
    type Listen = (channel: string) => Effect.Effect<
      Queue.Dequeue<PgConnection.Notification, SqlError>,
      SqlError,
      Scope.Scope
    >
    expect<PgConnection.PgConnection["listen"]>().type.toBe<Listen>()
    expect<PgClient.PgClient["listen"]>().type.toBe<Listen>()
  })
})

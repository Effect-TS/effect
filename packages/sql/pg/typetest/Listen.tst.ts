import type { PgClient, PgConnection } from "@effect/sql-pg"
import { type Effect, Queue, type Scope, Stream } from "effect"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { describe, expect, it } from "tstyche"

describe("LISTEN errors", () => {
  it("preserves SqlError in connection and client notification queues", () => {
    type Listen = (channel: string) => Effect.Effect<
      Queue.Dequeue<PgConnection.Notification, SqlError>,
      SqlError,
      Scope.Scope
    >
    expect<PgConnection.PgConnection["listen"]>().type.toBe<Listen>()
    expect<PgClient.PgClient["listen"]>().type.toBe<Listen>()
  })

  it("preserves SqlError when consuming a notification queue", () => {
    const notifications = {} as Effect.Success<ReturnType<PgClient.PgClient["listen"]>>
    expect(Queue.take(notifications)).type.toBe<Effect.Effect<PgConnection.Notification, SqlError>>()
    expect(Stream.fromQueue(notifications)).type.toBe<Stream.Stream<PgConnection.Notification, SqlError>>()
  })
})

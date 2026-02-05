import { PgClient } from "@effect/sql-pg"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Data, Effect, Layer, Redacted, String } from "effect"
import * as Pg from "pg"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class PgContainer extends Effect.Service<PgContainer>()("test/PgContainer", {
  scoped: Effect.acquireRelease(
    Effect.tryPromise({
      try: () => new PostgreSqlContainer("postgres:alpine").start(),
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) => Effect.promise(() => container.stop())
  )
}) {
  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri())
      })
    })
  ).pipe(Layer.provide(this.Default))

  static ClientTransformLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        transformResultNames: String.snakeToCamel,
        transformQueryNames: String.camelToSnake
      })
    })
  ).pipe(Layer.provide(this.Default))

  static ClientFromPoolLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const container = yield* PgContainer
      const acquire = Effect.acquireRelease(
        Effect.sync(() => new Pg.Pool({ connectionString: container.getConnectionUri() })),
        (pool) => Effect.promise(() => pool.end())
      )
      return PgClient.layerFromPool({
        acquire,
        transformResultNames: String.snakeToCamel,
        transformQueryNames: String.camelToSnake
      })
    })
  ).pipe(Layer.provide(this.Default))
}

import { MysqlClient } from "@effect/sql-mysql2"
import type { StartedMySqlContainer } from "@testcontainers/mysql"
import { MySqlContainer } from "@testcontainers/mysql"
import { Context, Data, Effect, Layer, Redacted, String } from "effect"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class MysqlContainer extends Context.Tag("test/MysqlContainer")<
  MysqlContainer,
  StartedMySqlContainer
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => new MySqlContainer("mysql:lts").start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static LiveVitess = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          new MySqlContainer("vitess/vttestserver:mysql80").withEnvironment({
            KEYSPACES: "test,unsharded",
            NUM_SHARDS: "1,1",
            MYSQL_BIND_HOST: "0.0.0.0",
            PORT: "3303"
          }).start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static Client = Layer.unwrapEffect(
    Effect.gen(function*() {
      const container = yield* MysqlContainer
      return MysqlClient.layer({
        url: Redacted.make(container.getConnectionUri())
      })
    })
  )

  static ClientLive = this.Client.pipe(Layer.provide(this.Live))

  static ClientLiveVitess = this.Client.pipe(Layer.provide(this.LiveVitess))

  static ClientWithTransformsLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const container = yield* MysqlContainer
      return MysqlClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        transformQueryNames: String.camelToSnake,
        transformResultNames: String.snakeToCamel
      })
    })
  ).pipe(Layer.provide(this.Live))
}

import * as MysqlDrizzle from "@effect/sql-drizzle/Mysql"
import * as PgDrizzle from "@effect/sql-drizzle/Pg"
import { PgClient } from "@effect/sql-pg"
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Config, Context, Data, Effect, Layer, Redacted } from "effect"
import { MysqlContainer } from "./utils-mysql.js"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class PgContainer extends Context.Tag("test/PgContainer")<
  PgContainer,
  StartedPostgreSqlContainer
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => new PostgreSqlContainer("postgres:alpine").start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*(_) {
      const container = yield* _(PgContainer)
      return PgClient.layer({
        url: Config.succeed(Redacted.make(container.getConnectionUri()))
      })
    })
  ).pipe(Layer.provide(this.Live))

  static DrizzleLive = PgDrizzle.layer.pipe(Layer.provideMerge(this.ClientLive))
}

export const DrizzleMysqlLive = MysqlDrizzle.layer.pipe(Layer.provideMerge(MysqlContainer.ClientLive))

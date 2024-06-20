import * as MysqlDrizzle from "@effect/sql-drizzle/Mysql"
import * as PgDrizzle from "@effect/sql-drizzle/Pg"
import * as Mysql from "@effect/sql-mysql2"
import * as Pg from "@effect/sql-pg"
import type { StartedMySqlContainer } from "@testcontainers/mysql"
import { MySqlContainer } from "@testcontainers/mysql"
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Config, Context, Data, Effect, Layer, Redacted } from "effect"

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
      return Pg.client.layer({
        url: Config.succeed(Redacted.make(container.getConnectionUri()))
      })
    })
  ).pipe(Layer.provide(this.Live))

  static DrizzleLive = PgDrizzle.layer.pipe(Layer.provideMerge(this.ClientLive))
}

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

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*(_) {
      const container = yield* _(MysqlContainer)
      return Mysql.client.layer({
        url: Config.succeed(Redacted.make(container.getConnectionUri()))
      })
    })
  ).pipe(Layer.provide(this.Live))

  static DrizzleLive = MysqlDrizzle.layer.pipe(Layer.provideMerge(this.ClientLive))
}

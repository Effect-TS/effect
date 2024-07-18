import * as Mssql from "@effect/sql-mssql"
import * as Mysql from "@effect/sql-mysql2"
import * as Pg from "@effect/sql-pg"
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import type { StartedMySqlContainer } from "@testcontainers/mysql"
import { MySqlContainer } from "@testcontainers/mysql"
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Config, Context, Effect, Layer, Redacted } from "effect"

export class PgContainer extends Context.Tag("test/PgContainer")<
  PgContainer,
  StartedPostgreSqlContainer
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.promise(() => new PostgreSqlContainer("postgres:alpine").start()),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*(_) {
      const container = yield* _(PgContainer)
      return Pg.PgClient.layer({
        url: Config.succeed(Redacted.make(container.getConnectionUri()))
      })
    })
  ).pipe(Layer.provide(this.Live))
}

export class MssqlContainer extends Context.Tag("test/MssqlContainer")<
  MssqlContainer,
  StartedMSSQLServerContainer
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.promise(() => new MSSQLServerContainer().acceptLicense().start()),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*(_) {
      const container = yield* _(MssqlContainer)
      return Mssql.MssqlClient.layer({
        server: Config.succeed(container.getHost()),
        port: Config.succeed(container.getPort()),
        username: Config.succeed(container.getUsername()),
        password: Config.succeed(Redacted.make(container.getPassword())),
        database: Config.succeed(container.getDatabase())
      })
    })
  ).pipe(Layer.provide(this.Live))
}

export class MysqlContainer extends Context.Tag("test/MysqlContainer")<
  MysqlContainer,
  StartedMySqlContainer
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.promise(() => new MySqlContainer("mysql:lts").start()),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*(_) {
      const container = yield* _(MysqlContainer)
      return Mysql.MysqlClient.layer({
        url: Config.succeed(Redacted.make(container.getConnectionUri()))
      })
    })
  ).pipe(Layer.provide(this.Live))
}

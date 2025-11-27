import * as Mssql from "@effect/sql-mssql"
import * as Mysql from "@effect/sql-mysql2"
import * as Pg from "@effect/sql-pg"
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import type { StartedMySqlContainer } from "@testcontainers/mysql"
import { MySqlContainer } from "@testcontainers/mysql"
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Effect, Layer, Redacted } from "effect"

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
    Effect.gen(function*() {
      const container = yield* PgContainer
      return Pg.PgClient.layer({
        url: Redacted.make(container.getConnectionUri())
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
    Effect.gen(function*() {
      const container = yield* MssqlContainer
      return Mssql.MssqlClient.layer({
        server: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: Redacted.make(container.getPassword()),
        database: container.getDatabase()
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
    Effect.gen(function*() {
      const container = yield* MysqlContainer
      return Mysql.MysqlClient.layer({
        url: Redacted.make(container.getConnectionUri())
      })
    })
  ).pipe(Layer.provide(this.Live))
}

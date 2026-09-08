import { MssqlClient } from "@effect/sql-mssql"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import { Context, Data, Effect, Layer, Redacted } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { randomUUID } from "node:crypto"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class MssqlContainer extends Context.Service<MssqlContainer>()("test/MssqlContainer", {
  make: Effect.acquireRelease(
    Effect.tryPromise({
      try: () =>
        new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2022-latest")
          .acceptLicense()
          .start(),
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) => Effect.promise(() => container.stop())
  )
}) {
  static readonly layer = Layer.effect(this)(this.make)

  static layerClient = process.env.MSSQL_PORT ?
    Layer.unwrap(Effect.gen(function*() {
      const config = {
        server: process.env.MSSQL_HOST ?? "127.0.0.1",
        port: Number(process.env.MSSQL_PORT),
        username: process.env.MSSQL_USERNAME ?? "sa",
        password: Redacted.make(process.env.MSSQL_PASSWORD ?? "Effect_Tds_Test_7426!"),
        database: process.env.MSSQL_DATABASE ?? "master",
        trustServer: true
      }
      const admin = yield* MssqlClient.make(config)
      // These suites assume fresh storage and use a TestClock. Reusing the
      // container must not reuse persisted values from earlier test runs.
      const database = `effect_tds_test_${randomUUID().replaceAll("-", "")}`
      yield* admin`CREATE DATABASE ${admin(database)}`
      yield* Effect.addFinalizer(() => Effect.orDie(admin`DROP DATABASE ${admin(database)}`))
      return MssqlClient.layer({ ...config, database })
    })).pipe(Layer.provide(Reactivity.layer)) :
    Layer.unwrap(
      Effect.gen(function*() {
        const container = yield* MssqlContainer
        return MssqlClient.layer({
          server: container.getHost(),
          port: container.getPort(),
          database: container.getDatabase(),
          username: container.getUsername(),
          password: Redacted.make(container.getPassword()),
          trustServer: true
        })
      })
    ).pipe(Layer.provide(this.layer))
}

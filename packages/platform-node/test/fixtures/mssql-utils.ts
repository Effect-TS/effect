import { MssqlClient } from "@effect/sql-mssql"
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import { Context, Data, Effect, Layer, Redacted } from "effect"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class MssqlContainer extends Context.Service<
  MssqlContainer,
  StartedMSSQLServerContainer
>()("test/MssqlContainer") {
  static readonly layer = Layer.effect(this)(
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2022-latest")
            .acceptLicense()
            .start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static client = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* MssqlContainer
      return MssqlClient.layer({
        server: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: Redacted.make(container.getPassword()),
        database: container.getDatabase()
      })
    })
  )

  static layerClient = this.client.pipe(Layer.provide(this.layer))
}

import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as NodeSocketConnector from "@effect/platform-node/NodeSocketConnector"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Data, Effect, Layer, Redacted, String } from "effect"
import { PgClient } from "effect/postgres"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class PgContainer extends Context.Service<PgContainer>()("test/PgContainer", {
  make: Effect.acquireRelease(
    Effect.tryPromise({
      try: () => new PostgreSqlContainer("postgres:alpine").start(),
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) => Effect.promise(() => container.stop())
  )
}) {
  static readonly layer = Layer.effect(this)(this.make)

  static layerClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri())
      })
    })
  ).pipe(Layer.provide(this.layer), Layer.provide(Layer.merge(NodeSocketConnector.layer, NodeCrypto.layer)))

  static layerClientWithTransforms = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        transformResultNames: String.snakeToCamel,
        transformQueryNames: String.camelToSnake
      })
    })
  ).pipe(Layer.provide(this.layer), Layer.provide(Layer.merge(NodeSocketConnector.layer, NodeCrypto.layer)))
}

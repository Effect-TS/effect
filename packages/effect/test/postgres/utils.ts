import { Context, Data, Effect, Layer, Redacted, String } from "effect"
import { layerClient, layerClientFrom, makeSingleClient } from "./transport.ts"
import { startPostgres } from "./utils/postgres-server.ts"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class PgContainer extends Context.Service<PgContainer>()("test/PgContainer", {
  make: Effect.acquireRelease(
    Effect.tryPromise({
      try: startPostgres,
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) =>
      Effect.promise(async () => {
        await container.stop()
      })
  )
}) {
  static readonly layer = Layer.effect(this)(this.make)

  static layerClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return layerClient({
        url: Redacted.make(container.getConnectionUri())
      })
    })
  ).pipe(Layer.provide(this.layer))

  static layerMakeClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return layerClientFrom(makeSingleClient({
        url: Redacted.make(container.getConnectionUri())
      }))
    })
  ).pipe(Layer.provide(this.layer))

  static layerMakeClientUnprepared = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return layerClientFrom(makeSingleClient({
        url: Redacted.make(container.getConnectionUri()),
        prepare: false
      }))
    })
  ).pipe(Layer.provide(this.layer))

  static layerMakeClientAcquireForStream = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return layerClientFrom(makeSingleClient({
        url: Redacted.make(container.getConnectionUri()),
        applicationName: "side-default",
        acquireForStream: true
      }))
    })
  ).pipe(Layer.provide(this.layer))

  static layerClientWithTransforms = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return layerClient({
        url: Redacted.make(container.getConnectionUri()),
        transformResultNames: String.snakeToCamel,
        transformQueryNames: String.camelToSnake
      })
    })
  ).pipe(Layer.provide(this.layer))

  static layerClientForListen = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return layerClient({
        url: Redacted.make(container.getConnectionUri()),
        maxConnections: 2,
        multiplex: true
      })
    })
  ).pipe(Layer.provide(this.layer))
}

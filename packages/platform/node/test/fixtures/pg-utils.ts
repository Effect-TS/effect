import { PgClient } from "@effect/sql-pg"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Data, Effect, Layer, Redacted, String } from "effect"
import { getContainerRuntimeClient } from "testcontainers"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class PgContainer extends Context.Service<PgContainer>()("test/PgContainer", {
  make: Effect.acquireRelease(
    Effect.tryPromise({
      try: () => new PostgreSqlContainer("postgres:alpine").start(),
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) =>
      Effect.gen(function*() {
        yield* Effect.promise(() => container.stop({ remove: false }))
        const client = yield* Effect.promise(() => getContainerRuntimeClient())
        const handle = client.container.getById(container.getId())
        // Stop can return before the daemon processes the exit event; wait before removing.
        // docker-modem can leave an aborted response pending forever. Abort each
        // timed-out request and retry only this read-only wait, not stop or remove.
        yield* Effect.tryPromise((signal) => handle.wait({ condition: "not-running", abortSignal: signal })).pipe(
          Effect.timeout("2 seconds"),
          Effect.retry({ times: 2 })
        )
        yield* Effect.promise(() => client.container.remove(handle, { removeVolumes: true }))
      }).pipe(
        // Allow up to six seconds of waits within an eight-second release budget,
        // leaving headroom under Vitest's ten-second cancellation-hook deadline.
        // Cleanup failures remain visible defects rather than being suppressed.
        Effect.timeout("8 seconds"),
        Effect.orDie
      )
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
  ).pipe(Layer.provide(this.layer))

  static layerClientWithTransforms = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* PgContainer
      return PgClient.layer({
        url: Redacted.make(container.getConnectionUri()),
        transformResultNames: String.snakeToCamel,
        transformQueryNames: String.camelToSnake
      })
    })
  ).pipe(Layer.provide(this.layer))
}

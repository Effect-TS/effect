import type { StartedClickHouseContainer } from "@testcontainers/clickhouse"
import { ClickHouseContainer } from "@testcontainers/clickhouse"
import { Context, Data, Effect, Layer } from "effect"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class ClickhouseContainer extends Context.Service<
  ClickhouseContainer,
  StartedClickHouseContainer
>()("test/ClickhouseContainer") {
  static readonly layer = Layer.effect(this)(
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => new ClickHouseContainer("clickhouse/clickhouse-server:25.8").start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )

  /** Connection options shared by the Node and the web client. */
  static readonly options = Effect.gen(function*() {
    const container = yield* ClickhouseContainer
    return {
      url: container.getHttpUrl(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase()
    }
  })
}

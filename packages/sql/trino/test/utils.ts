import { TrinoClient } from "@effect/sql-trino"
import { Context, Effect, Layer } from "effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers"

// The stock image ships the memory and tpch catalogs used by these tests.
export class TrinoContainer extends Context.Service<TrinoContainer, StartedTestContainer>()("test/TrinoContainer") {
  static readonly layer = Layer.effect(this)(
    Effect.acquireRelease(
      Effect.promise(() =>
        new GenericContainer("trinodb/trino:484")
          .withExposedPorts(8080)
          .withWaitStrategy(Wait.forLogMessage("SERVER STARTED"))
          .withStartupTimeout(120_000)
          .start()
      ),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static readonly layerClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* TrinoContainer
      return TrinoClient.layer({
        url: `http://${container.getHost()}:${container.getMappedPort(8080)}`,
        user: "effect",
        catalog: "memory",
        schema: "default"
      })
    })
  ).pipe(Layer.provide([this.layer, FetchHttpClient.layer]))
}

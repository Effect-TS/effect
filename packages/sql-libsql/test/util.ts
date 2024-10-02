import { Config, Context, Effect, Layer } from "effect"
import { GenericContainer, type StartedTestContainer } from "testcontainers"
import { LibsqlClient } from "../src/index.js"

export class LibsqlContainer extends Context.Tag("test/LibsqlContainer")<
  LibsqlContainer,
  StartedTestContainer
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.promise(() =>
        new GenericContainer("ghcr.io/tursodatabase/libsql-server:main")
          .withExposedPorts(8080)
          .withEnvironment({ SQLD_NODE: "primary" })
          .withCommand(["sqld", "--no-welcome", "--http-listen-addr", "0.0.0.0:8080"]).start()
      ),
      (container) => Effect.promise(() => container.stop())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const container = yield* LibsqlContainer
      return LibsqlClient.layer({
        url: Config.succeed(`http://localhost:${container.getMappedPort(8080)}`)
      })
    })
  ).pipe(Layer.provide(this.Live))
}

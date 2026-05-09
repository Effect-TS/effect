import type { StartedRedisContainer } from "@testcontainers/redis"
import * as Redis from "@testcontainers/redis"
import { Context, Data, Effect, Layer } from "effect"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

export class RedisContainer extends Context.Tag("test/RedisContainer")<
  RedisContainer,
  StartedRedisContainer
>() {
  static layer = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => new Redis.RedisContainer("redis").start(),
        catch: (cause) => new ContainerError({ cause })
      }),
      (container) => Effect.promise(() => container.stop())
    )
  )
}

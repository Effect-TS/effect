import { it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { Persistence, Redis } from "effect/unstable/persistence"

const redis = Redis.Redis.of({
  send: (command, ...args) => {
    if (command.toUpperCase() === "KEYS") return Effect.succeed([])
    if (command.toUpperCase() === "DEL" && args.length === 0) {
      return Effect.fail(new Redis.RedisError({ cause: "ERR wrong number of arguments for 'del' command" }))
    }
    return Effect.void
  },
  eval: () => () => Effect.die("unused")
})

it.effect("clearing an empty Redis persistence store succeeds", () =>
  Effect.gen(function*() {
    const backing = yield* Persistence.BackingPersistence
    const store = yield* backing.make("empty")
    yield* store.clear
  }).pipe(
    Effect.scoped,
    Effect.provide(Persistence.layerBackingRedis.pipe(Layer.provide(Layer.succeed(Redis.Redis, redis))))
  ))

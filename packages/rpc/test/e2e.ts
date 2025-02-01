import { RpcClient } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import type { Layer } from "effect"
import { Effect, Stream } from "effect"
import { User, UsersClient } from "./fixtures/schemas.js"

export const e2eSuite = <E>(name: string, layer: Layer.Layer<UsersClient, E>) => {
  describe(name, () => {
    it.effect("should get user", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const user = yield* client.GetUser({ id: "1" })
        assert.instanceOf(user, User)
        assert.deepStrictEqual(user, new User({ id: "1", name: "Logged in user" }))
      }).pipe(Effect.provide(layer)))

    it.effect("headers", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const user = yield* client.GetUser({ id: "1" })
        assert.instanceOf(user, User)
        assert.deepStrictEqual(user, new User({ id: "1", name: "John" }))
      }).pipe(
        RpcClient.withHeaders({ name: "John" }),
        Effect.provide(layer)
      ))

    it.live("Stream", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const users: Array<User> = []
        yield* client.StreamUsers({ id: "1" }).pipe(
          Stream.take(5),
          Stream.runForEach((user) =>
            Effect.sync(() => {
              users.push(user)
            })
          ),
          Effect.fork
        )

        yield* Effect.sleep(1000)
        assert.lengthOf(users, 5)

        const interrupts = yield* client.GetInterrupts({})
        assert.equal(interrupts, 1)
      }).pipe(Effect.provide(layer)), { timeout: 20000 })
  })
}

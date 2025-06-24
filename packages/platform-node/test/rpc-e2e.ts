import { RpcClient, RpcServer } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import type { Layer } from "effect"
import { Cause, Effect, Fiber, Option, Stream } from "effect"
import { User, UsersClient } from "./fixtures/rpc-schemas.js"

export const e2eSuite = <E>(
  name: string,
  layer: Layer.Layer<UsersClient | RpcServer.Protocol, E>,
  concurrent = true
) => {
  describe(name, { concurrent, timeout: 30_000 }, () => {
    it.effect("should get user", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const user = yield* client.GetUser({ id: "1" })
        assert.instanceOf(user, User)
        assert.deepStrictEqual(user, new User({ id: "1", name: "Logged in user" }))
      }).pipe(Effect.provide(layer)))

    it.effect("nested method", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        yield* client.nested.test()
      }).pipe(Effect.provide(layer)))

    it.effect("should not flatten Option", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const user = yield* client.GetUserOption({ id: "1" })
        assert.deepStrictEqual(user, Option.some(new User({ id: "1", name: "John" })))
      }).pipe(Effect.provide(layer)))

    it.effect("headers", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const user = yield* client.GetUser({ id: "1" })
        assert.instanceOf(user, User)
        assert.deepStrictEqual(user, new User({ id: "123", name: "Logged in user" }))
      }).pipe(
        RpcClient.withHeaders({ userId: "123" }),
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

        yield* Effect.sleep(2000)
        assert.lengthOf(users, 5)

        // test interrupts
        const interrupts = yield* client.GetInterrupts()
        assert.equal(interrupts, 1)

        const { supportsAck } = yield* RpcServer.Protocol

        // test backpressure
        if (supportsAck) {
          const emits = yield* client.GetEmits()
          assert.equal(emits, 5)
        }
      }).pipe(Effect.provide(layer)), { timeout: 20000 })

    it.effect("defect", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const cause = yield* client.ProduceDefect().pipe(
          Effect.sandbox,
          Effect.flip
        )
        assert.deepStrictEqual(cause, Cause.die("boom"))
      }).pipe(
        RpcClient.withHeaders({ userId: "123" }),
        Effect.provide(layer)
      ))

    it.live("never", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const fiber = yield* client.Never().pipe(
          Effect.fork
        )
        yield* Effect.sleep(500)
        assert.isNull(fiber.unsafePoll())

        yield* Fiber.interrupt(fiber)
        yield* Effect.sleep(100)

        const { supportsAck } = yield* RpcServer.Protocol
        if (supportsAck) {
          const interrupts = yield* client.GetInterrupts()
          assert.equal(interrupts, 1)
        }
      }).pipe(
        RpcClient.withHeaders({ userId: "123" }),
        Effect.provide(layer)
      ))

    it.effect("server wrap middleware", () =>
      Effect.gen(function*() {
        const client = yield* UsersClient
        const result = yield* client.TimedMethod({ shouldFail: false })
        assert.equal(result, 1)
        yield* client.TimedMethod({ shouldFail: true }).pipe(Effect.exit)
        const { count, defect, success } = yield* client.GetTimingMiddlewareMetrics()
        assert.notEqual(count, 0)
        assert.notEqual(defect, 0)
        assert.notEqual(success, 0)
      }).pipe(Effect.provide(layer)))
  })
}

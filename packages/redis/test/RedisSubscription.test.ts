import { makeConnector } from "@effect/platform-node/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Subscription from "@effect/redis/RedisSubscription"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Queue, Scope } from "effect"
import { array, bulk, type ScriptedRedis, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)
const makeClient = (fixture: ScriptedRedis) =>
  Effect.gen(function*() {
    const acquiring = yield* Client.make(makeConnector(), {
      topology: { _tag: "Standalone", endpoint: fixture },
      reconnectDelay: "1 millis"
    }).pipe(Effect.forkChild)
    const ping = yield* Effect.promise(fixture.nextRequest)
    ping.connection.send("+PONG\r\n")
    return yield* Fiber.join(acquiring)
  })
const ack = (kind: string, channel: string | Uint8Array, count = 1) =>
  Buffer.concat([Buffer.from("*3\r\n"), bulk(kind), bulk(channel), Buffer.from(`:${count}\r\n`)])

describe("Redis subscriptions", () => {
  it.live("fails waiting consumers when the client closes before the subscription scope", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const clientScope = yield* Scope.fork(yield* Effect.scope)
      const client = yield* makeClient(fixture).pipe(Effect.provideService(Scope.Scope, clientScope))
      const acquiring = yield* Subscription.make(client, "channel").pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(ack("subscribe", "channel"))
      const subscription = yield* Fiber.join(acquiring)
      const waiting = yield* Queue.take(subscription.messages).pipe(Effect.result, Effect.forkChild)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      yield* Scope.close(clientScope, Exit.void)
      const result = yield* Fiber.join(waiting).pipe(Effect.timeout("2 seconds"))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") assert.strictEqual(result.failure.reason, "Closed")
      yield* Effect.promise(() => closed).pipe(Effect.timeout("2 seconds"))
      assert.isTrue(request.connection.socket.destroyed)
      assert.strictEqual(fixture.connections.length, 2)
      yield* subscription.close
    }))

  it.live("interrupts an unacknowledged reconnection when the client closes", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const clientScope = yield* Scope.fork(yield* Effect.scope)
      const client = yield* makeClient(fixture).pipe(Effect.provideService(Scope.Scope, clientScope))
      const acquiring = yield* Subscription.make(client, "channel").pipe(Effect.forkChild)
      const initial = yield* Effect.promise(fixture.nextRequest)
      initial.connection.send(ack("subscribe", "channel"))
      const subscription = yield* Fiber.join(acquiring)
      initial.connection.disconnect()
      const restoring = yield* Effect.promise(fixture.nextRequest)
      const closed = new Promise<void>((resolve) => restoring.connection.socket.once("close", () => resolve()))
      yield* Scope.close(clientScope, Exit.void)
      const result = yield* Queue.take(subscription.messages).pipe(Effect.result, Effect.timeout("2 seconds"))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") assert.strictEqual(result.failure.reason, "Closed")
      yield* Effect.promise(() => closed).pipe(Effect.timeout("2 seconds"))
      assert.strictEqual(fixture.connections.length, 3)
      yield* subscription.close
    }))

  it.live("propagates a reconnection defect to message consumers", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const original = yield* makeClient(fixture)
      const defect = new Error("Unexpected reconnect failure")
      let attempts = 0
      const client: Client.RedisClient = {
        ...original,
        reserve: (affinity) => ++attempts === 1 ? original.reserve(affinity) : Effect.die(defect)
      }
      const acquiring = yield* Subscription.make(client, "channel").pipe(Effect.forkChild)
      const initial = yield* Effect.promise(fixture.nextRequest)
      initial.connection.send(ack("subscribe", "channel"))
      const subscription = yield* Fiber.join(acquiring)
      initial.connection.disconnect()
      const result = yield* Queue.take(subscription.messages).pipe(Effect.exit, Effect.timeout("2 seconds"))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") assert.strictEqual(Cause.squash(result.cause), defect)
      yield* subscription.close
    }))

  it.live("closes an unacknowledged acquisition when interrupted", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const acquiring = yield* Subscription.make(client, "channel").pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      yield* Fiber.interrupt(acquiring)
      yield* Effect.promise(() => closed)
      assert.isTrue(request.connection.socket.destroyed)
    }))

  it.live("keeps ASKING and redirected sharded subscription on the same exclusive connection", () =>
    Effect.gen(function*() {
      const source = yield* server
      const target = yield* server
      const original = yield* makeClient(source)
      const client: Client.RedisClient = {
        ...original,
        config: {
          ...original.config,
          topology: { _tag: "Cluster", seeds: [source] }
        }
      }
      const acquiring = yield* Subscription.make(client, "{foo}:channel", { mode: "sharded" }).pipe(Effect.forkChild)
      const initial = yield* Effect.promise(source.nextRequest)
      initial.connection.send(`-ASK 12182 ${target.host}:${target.port}\r\n`)
      const asking = yield* Effect.promise(target.nextRequest)
      assert.strictEqual(asking.args[0].toString(), "ASKING")
      asking.connection.send("+OK\r\n")
      const subscribed = yield* Effect.promise(target.nextRequest)
      assert.strictEqual(subscribed.args[0].toString(), "SSUBSCRIBE")
      assert.strictEqual(subscribed.connection.number, asking.connection.number)
      subscribed.connection.send(ack("ssubscribe", "{foo}:channel"))
      const subscription = yield* Fiber.join(acquiring)
      subscribed.connection.send(array("smessage", "{foo}:channel", "asked"))
      assert.strictEqual(new TextDecoder().decode((yield* Queue.take(subscription.messages)).message), "asked")
    }))

  it.live("waits for acknowledgement and preserves binary patterns, channels and payloads", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const pattern = new Uint8Array([255, 42])
      let ready = false
      const acquiring = yield* Subscription.make(client, pattern, { mode: "pattern" }).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            ready = true
          })
        ),
        Effect.forkChild
      )
      const request = yield* Effect.promise(fixture.nextRequest)
      assert.deepStrictEqual([...request.args[1]], [...pattern])
      assert.strictEqual(request.args[0].toString(), "PSUBSCRIBE")
      assert.isFalse(ready)
      request.connection.send(ack("psubscribe", pattern))
      const subscription = yield* Fiber.join(acquiring)
      const channel = new Uint8Array([255, 0])
      const payload = new Uint8Array([0, 13, 10, 255])
      request.connection.send(array("pmessage", pattern, channel, payload))
      const message = yield* Queue.take(subscription.messages)
      assert.deepStrictEqual(message, { channel, message: payload, pattern })
    }))

  it.live("reconnects after a disconnect and retains the owned binary subscription target", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const target = new Uint8Array([255, 0, 254])
      const acquiring = yield* Subscription.make(client, target).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(ack("subscribe", target))
      const subscription = yield* Fiber.join(acquiring)
      target.fill(1)
      request.connection.disconnect()
      const restored = yield* Effect.promise(fixture.nextRequest)
      assert.deepStrictEqual([...restored.args[1]], [255, 0, 254])
      assert.notStrictEqual(restored.connection.number, request.connection.number)
      restored.connection.send(ack("subscribe", restored.args[1]))
      restored.connection.send(array("message", restored.args[1], "restored"))
      assert.strictEqual(new TextDecoder().decode((yield* Queue.take(subscription.messages)).message), "restored")
    }))

  it.live("fails bounded overflow and closes its dedicated connection", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const acquiring = yield* Subscription.make(client, "channel", { capacity: 1 }).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(ack("subscribe", "channel"))
      const subscription = yield* Fiber.join(acquiring)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      request.connection.send(
        Buffer.concat([array("message", "channel", "first"), array("message", "channel", "second")])
      )
      yield* Effect.promise(() => closed).pipe(Effect.timeout("2 seconds"))
      const first = yield* Effect.result(Queue.take(subscription.messages))
      const terminal = first._tag === "Failure" ? first : yield* Effect.result(Queue.take(subscription.messages))
      assert.strictEqual(terminal._tag, "Failure")
      if (terminal._tag === "Failure") assert.strictEqual(terminal.failure.reason, "Capacity")
      assert.isTrue(request.connection.socket.destroyed)
    }))

  it.live("closing a subscription wakes waiting consumers and prevents reconnect", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const acquiring = yield* Subscription.make(client, "channel").pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(ack("subscribe", "channel"))
      const subscription = yield* Fiber.join(acquiring)
      const pending = yield* Queue.take(subscription.messages).pipe(Effect.forkChild)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      yield* subscription.close
      yield* Effect.promise(() => closed)
      assert.strictEqual((yield* Fiber.await(pending))._tag, "Failure")
      assert.isTrue(request.connection.socket.destroyed)
      assert.strictEqual(fixture.connections.length, 2)
    }))

  it.live("recovers an initial sharded MOVED on an exclusive redirected connection", () =>
    Effect.gen(function*() {
      const source = yield* server
      const target = yield* server
      const original = yield* makeClient(source)
      const client: Client.RedisClient = {
        ...original,
        config: {
          ...original.config,
          topology: { _tag: "Cluster", seeds: [source] }
        }
      }
      const acquiring = yield* Subscription.make(client, "{foo}:channel", { mode: "sharded" }).pipe(Effect.forkChild)
      const initial = yield* Effect.promise(source.nextRequest)
      initial.connection.send(`-MOVED 12182 ${target.host}:${target.port}\r\n`)
      const redirected = yield* Effect.promise(target.nextRequest)
      assert.strictEqual(redirected.args[0].toString(), "SSUBSCRIBE")
      redirected.connection.send(ack("ssubscribe", "{foo}:channel"))
      const subscription = yield* Fiber.join(acquiring)
      redirected.connection.send(array("smessage", "{foo}:channel", "redirected"))
      assert.strictEqual(new TextDecoder().decode((yield* Queue.take(subscription.messages)).message), "redirected")
      assert.isTrue(initial.connection.socket.destroyed)
    }))

  it.live("restarts an unsolicited sharded unsubscribe without requiring socket failure", () =>
    Effect.gen(function*() {
      const source = yield* server
      const target = yield* server
      const original = yield* makeClient(source)
      let moved = false
      const client: Client.RedisClient = {
        ...original,
        config: { ...original.config, topology: { _tag: "Cluster", seeds: [source] } },
        reserve: (affinity) => original.reserve(moved ? { node: target } : affinity)
      }
      const acquiring = yield* Subscription.make(client, "{foo}:channel", { mode: "sharded" }).pipe(Effect.forkChild)
      const initial = yield* Effect.promise(source.nextRequest)
      initial.connection.send(ack("ssubscribe", "{foo}:channel"))
      const subscription = yield* Fiber.join(acquiring)
      moved = true
      initial.connection.send(ack("sunsubscribe", "{foo}:channel", 0))
      const restored = yield* Effect.promise(target.nextRequest)
      restored.connection.send(ack("ssubscribe", "{foo}:channel"))
      restored.connection.send(array("smessage", "{foo}:channel", "migrated"))
      assert.strictEqual(new TextDecoder().decode((yield* Queue.take(subscription.messages)).message), "migrated")
    }))
})

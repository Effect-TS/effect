import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Subscription from "@effect/redis/RedisSubscription"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Queue, Scope } from "effect"
import type { Socket } from "node:net"
import { array, bulk, type ScriptedRedis, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)

const makeClient = Effect.fnUntraced(function*(fixture: ScriptedRedis) {
  const acquiring = yield* Client.make(makeConnector(), {
    topology: { _tag: "Standalone", endpoint: fixture },
    reconnectDelay: "1 millis"
  }).pipe(Effect.forkChild)
  const ping = yield* Effect.promise(fixture.nextRequest)
  ping.connection.send("+PONG\r\n")
  return yield* Fiber.join(acquiring)
})

const asCluster = (client: Client.RedisClient, seed: ScriptedRedis, maxRedirects?: number): Client.RedisClient => ({
  ...client,
  config: { ...client.config, topology: { _tag: "Cluster", seeds: [seed], maxRedirects } }
})

const ack = (kind: string, channel: string, count = 1) =>
  Buffer.concat([Buffer.from("*3\r\n"), bulk(kind), bulk(channel), Buffer.from(`:${count}\r\n`)])

const onClose = (socket: Socket): Effect.Effect<void> => {
  const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()))
  return Effect.promise(() => closed)
}

const text = (message: Subscription.Message) => new TextDecoder().decode(message.message)

const subscribe = Effect.fnUntraced(function*(fixture: ScriptedRedis, client: Client.RedisClient, options?: {
  readonly capacity?: number
}) {
  const acquiring = yield* Subscription.make(client, "channel", options).pipe(Effect.forkChild)
  const request = yield* Effect.promise(fixture.nextRequest)
  request.connection.send(ack("subscribe", "channel"))
  return { subscription: yield* Fiber.join(acquiring), connection: request.connection }
})

describe("RedisSubscription", () => {
  it.live("completes acquisition only after the subscription is acknowledged", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const acquiring = yield* Subscription.make(client, "news.*", { mode: "pattern" }).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      assert.deepStrictEqual(request.args.map(String), ["PSUBSCRIBE", "news.*"])
      assert.isUndefined(acquiring.pollUnsafe())
      request.connection.send(ack("psubscribe", "news.*"))
      const subscription = yield* Fiber.join(acquiring)
      request.connection.send(array("pmessage", "news.*", "news.sport", "goal"))
      const message = yield* Queue.take(subscription.messages)
      assert.strictEqual(new TextDecoder().decode(message.channel), "news.sport")
      assert.strictEqual(text(message), "goal")
    }))

  it.live("resubscribes on a new connection after a disconnect", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const { connection, subscription } = yield* subscribe(fixture, client)
      connection.disconnect()
      const restored = yield* Effect.promise(fixture.nextRequest)
      assert.deepStrictEqual(restored.args.map(String), ["SUBSCRIBE", "channel"])
      assert.notStrictEqual(restored.connection.number, connection.number)
      restored.connection.send(ack("subscribe", "channel"))
      restored.connection.send(array("message", "channel", "restored"))
      assert.strictEqual(text(yield* Queue.take(subscription.messages)), "restored")
    }))

  it.live("fails with Capacity on overflow and closes its connection", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const { connection, subscription } = yield* subscribe(fixture, client, { capacity: 1 })
      const socketClosed = onClose(connection.socket)
      connection.send(Buffer.concat([array("message", "channel", "first"), array("message", "channel", "second")]))
      yield* socketClosed.pipe(Effect.timeout("2 seconds"))
      const first = yield* Effect.result(Queue.take(subscription.messages))
      const terminal = first._tag === "Failure" ? first : yield* Effect.result(Queue.take(subscription.messages))
      assert.strictEqual(terminal._tag, "Failure")
      if (terminal._tag === "Failure") assert.strictEqual(terminal.failure.reason, "Capacity")
    }))

  it.live("close wakes waiting consumers and does not reconnect", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const { connection, subscription } = yield* subscribe(fixture, client)
      const pending = yield* Queue.take(subscription.messages).pipe(Effect.forkChild)
      const socketClosed = onClose(connection.socket)
      yield* subscription.close
      yield* socketClosed
      assert.strictEqual((yield* Fiber.await(pending))._tag, "Failure")
      assert.strictEqual(fixture.connections.length, 2)
    }))

  it.live("fails waiting consumers with Closed when the client closes", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const clientScope = yield* Scope.fork(yield* Effect.scope)
      const client = yield* makeClient(fixture).pipe(Effect.provideService(Scope.Scope, clientScope))
      const { connection, subscription } = yield* subscribe(fixture, client)
      const waiting = yield* Queue.take(subscription.messages).pipe(Effect.result, Effect.forkChild)
      const socketClosed = onClose(connection.socket)
      yield* Scope.close(clientScope, Exit.void)
      const result = yield* Fiber.join(waiting).pipe(Effect.timeout("2 seconds"))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") assert.strictEqual(result.failure.reason, "Closed")
      yield* socketClosed.pipe(Effect.timeout("2 seconds"))
    }))

  it.live("closes the connection when acquisition is interrupted", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = yield* makeClient(fixture)
      const acquiring = yield* Subscription.make(client, "channel").pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      const socketClosed = onClose(request.connection.socket)
      yield* Fiber.interrupt(acquiring)
      yield* socketClosed.pipe(Effect.timeout("2 seconds"))
    }))

  it.live("follows MOVED for a sharded subscription", () =>
    Effect.gen(function*() {
      const source = yield* server
      const target = yield* server
      const client = asCluster(yield* makeClient(source), source)
      const acquiring = yield* Subscription.make(client, "{foo}:channel", { mode: "sharded" }).pipe(Effect.forkChild)
      const initial = yield* Effect.promise(source.nextRequest)
      initial.connection.send(`-MOVED 12182 ${target.host}:${target.port}\r\n`)
      const redirected = yield* Effect.promise(target.nextRequest)
      assert.deepStrictEqual(redirected.args.map(String), ["SSUBSCRIBE", "{foo}:channel"])
      redirected.connection.send(ack("ssubscribe", "{foo}:channel"))
      const subscription = yield* Fiber.join(acquiring)
      redirected.connection.send(array("smessage", "{foo}:channel", "redirected"))
      assert.strictEqual(text(yield* Queue.take(subscription.messages)), "redirected")
    }))

  it.live("sends ASKING and the sharded subscription on the same connection", () =>
    Effect.gen(function*() {
      const source = yield* server
      const target = yield* server
      const client = asCluster(yield* makeClient(source), source)
      const acquiring = yield* Subscription.make(client, "{foo}:channel", { mode: "sharded" }).pipe(Effect.forkChild)
      const initial = yield* Effect.promise(source.nextRequest)
      initial.connection.send(`-ASK 12182 ${target.host}:${target.port}\r\n`)
      const asking = yield* Effect.promise(target.nextRequest)
      assert.deepStrictEqual(asking.args.map(String), ["ASKING"])
      asking.connection.send("+OK\r\n")
      const subscribed = yield* Effect.promise(target.nextRequest)
      assert.strictEqual(subscribed.args[0].toString(), "SSUBSCRIBE")
      assert.strictEqual(subscribed.connection.number, asking.connection.number)
      subscribed.connection.send(ack("ssubscribe", "{foo}:channel"))
      const subscription = yield* Fiber.join(acquiring)
      subscribed.connection.send(array("smessage", "{foo}:channel", "asked"))
      assert.strictEqual(text(yield* Queue.take(subscription.messages)), "asked")
    }))

  it.live("fails a sharded subscription once its redirect limit is exhausted", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const client = asCluster(yield* makeClient(fixture), fixture, 1)
      const acquiring = yield* Subscription.make(client, "{foo}:channel", { mode: "sharded" }).pipe(
        Effect.flip,
        Effect.forkChild
      )
      for (let attempt = 0; attempt < 2; attempt++) {
        const request = yield* Effect.promise(fixture.nextRequest)
        assert.strictEqual(request.args[0].toString(), "SSUBSCRIBE")
        request.connection.send(`-MOVED 12182 ${fixture.host}:${fixture.port}\r\n`)
      }
      const error = yield* Fiber.join(acquiring)
      assert.strictEqual(error.reason, "Routing")
      assert.strictEqual(error.code, "MOVED")
    }))

  it.live("fails consumers with a defect raised while reconnecting", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const original = yield* makeClient(fixture)
      const defect = new Error("reconnect defect")
      let reservations = 0
      const client: Client.RedisClient = {
        ...original,
        reserve: (affinity) => ++reservations === 1 ? original.reserve(affinity) : Effect.die(defect)
      }
      const { connection, subscription } = yield* subscribe(fixture, client)
      connection.disconnect()
      const result = yield* Queue.take(subscription.messages).pipe(Effect.exit, Effect.timeout("2 seconds"))
      assert.isTrue(Exit.isFailure(result) && Cause.squash(result.cause) === defect)
    }))
})

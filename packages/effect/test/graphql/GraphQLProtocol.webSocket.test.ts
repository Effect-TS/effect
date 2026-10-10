import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Queue, Ref, Stream } from "effect"
import { GraphQLClient, GraphQLMiddleware, GraphQLProtocol } from "effect/graphql"
import { TransportError } from "effect/graphql/GraphQLClientError"
import { TestClock } from "effect/testing"
import { expectReason, IssuesGroup, IssueUpdated, Viewer, wsServer } from "./fixtures.ts"

const url = "ws://localhost/graphql"

const event = (title: string) => ({ data: { issueUpdated: { title } } })

const subscription = (id: string): GraphQLProtocol.GraphQLRequest => ({
  query: IssueUpdated.document,
  operationName: "IssueUpdated",
  variables: { id },
  headers: {}
})

const makeProtocol = (
  server: Effect.Success<typeof wsServer>,
  options?: Omit<Parameters<typeof GraphQLProtocol.makeWebSocket>[0], "url">
) => GraphQLProtocol.makeWebSocket({ url, ...options }).pipe(Effect.provide(server.layer))

describe("GraphQLProtocol.makeWebSocket", () => {
  it.effect("subscribes only after connection_ack and routes events by operation id", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server, { connectionParams: Effect.succeed({ token: "t1" }) })
      const a = yield* protocol.subscribe(subscription("A")).pipe(Stream.runCollect, Effect.forkChild)
      const b = yield* protocol.subscribe(subscription("B")).pipe(Stream.runCollect, Effect.forkChild)

      const connection = yield* Queue.take(server.connections)
      assert.strictEqual(connection.url, url)
      assert.deepStrictEqual(connection.options, "graphql-transport-ws")
      assert.deepStrictEqual(yield* Queue.take(connection.received), {
        type: "connection_init",
        payload: { token: "t1" }
      })
      yield* TestClock.adjust("1 second")
      assert.strictEqual(yield* Queue.size(connection.received), 0)

      yield* connection.send({ type: "connection_ack" })
      const subscribes = [yield* Queue.take(connection.received), yield* Queue.take(connection.received)]
      const ids: Record<string, string> = {}
      for (const message of subscribes) {
        assert.strictEqual(message.type, "subscribe")
        const payload = message.payload as { variables: { id: string } }
        ids[payload.variables.id] = message.id!
      }
      assert.deepStrictEqual(subscribes.find((message) => message.id === ids.A)!.payload, {
        query: IssueUpdated.document,
        operationName: "IssueUpdated",
        variables: { id: "A" }
      })
      assert.notStrictEqual(ids.A, ids.B)

      yield* connection.send({ id: "unknown", type: "next", payload: event("x") })
      yield* connection.send({ id: ids.B, type: "next", payload: event("b") })
      yield* connection.send({ id: ids.A, type: "next", payload: event("a") })
      yield* connection.send({ id: ids.A, type: "complete" })
      yield* connection.send({ id: ids.B, type: "complete" })
      assert.deepStrictEqual(yield* Fiber.join(a), [event("a")])
      assert.deepStrictEqual(yield* Fiber.join(b), [event("b")])
    }))

  it.effect("a missing connection_ack is a TransportError", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server, { connectionAckTimeout: "5 seconds" })
      const fiber = yield* protocol.subscribe(subscription("A")).pipe(Stream.runDrain, Effect.flip, Effect.forkChild)
      yield* Queue.take(server.connections)
      yield* TestClock.adjust("5 seconds")
      assert.instanceOf(yield* Fiber.join(fiber), TransportError)
    }))

  it.effect("a close while connectionParams is pending fails the waiting operation", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server, { connectionParams: Effect.never })
      const fiber = yield* protocol.subscribe(subscription("A")).pipe(Stream.runDrain, Effect.flip, Effect.forkChild)
      const connection = yield* Queue.take(server.connections)
      yield* connection.close(1006)
      yield* TestClock.adjust("1 minute")
      assert.isDefined(fiber.pollUnsafe())
      assert.strictEqual((yield* Fiber.join(fiber)).closeCode, 1006)
    }))

  for (const invalid of [{ type: "not-a-graphql-message" }, { type: "next", payload: event("a") }]) {
    it.effect(`an invalid message ${JSON.stringify(invalid)} closes the connection with 4400`, () =>
      Effect.gen(function*() {
        const server = yield* wsServer
        const protocol = yield* makeProtocol(server)
        const fiber = yield* protocol.subscribe(subscription("A")).pipe(Stream.runDrain, Effect.flip, Effect.forkChild)
        const { connection } = yield* server.accept
        yield* Queue.take(connection.received)
        yield* connection.send(invalid)
        yield* TestClock.adjust("1 second")
        assert.isDefined(fiber.pollUnsafe())
        const error = yield* Fiber.join(fiber)
        assert.strictEqual(error.closeCode, 4400)
        assert.isFalse(error.isRetryable)
        assert.strictEqual(yield* Deferred.await(connection.closed), 4400)
      }))
  }

  it.effect("a server pong is a valid message", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server)
      const fiber = yield* protocol.subscribe(subscription("A")).pipe(Stream.runCollect, Effect.forkChild)
      const { connection } = yield* server.accept
      const subscribe = yield* Queue.take(connection.received)
      yield* connection.send({ type: "pong" })
      yield* connection.send({ id: subscribe.id, type: "next", payload: event("a") })
      yield* connection.send({ id: subscribe.id, type: "complete" })
      assert.deepStrictEqual(yield* Fiber.join(fiber), [event("a")])
    }))

  it.effect("answers ping with pong, pings every keepAlive and treats a missed frame as a retryable close", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server, { keepAlive: "10 seconds" })
      const fiber = yield* protocol.subscribe(subscription("A")).pipe(Stream.runDrain, Effect.flip, Effect.forkChild)
      const { connection } = yield* server.accept
      assert.strictEqual((yield* Queue.take(connection.received)).type, "subscribe")

      yield* connection.send({ type: "ping" })
      assert.deepStrictEqual(yield* Queue.take(connection.received), { type: "pong" })

      yield* TestClock.adjust("10 seconds")
      assert.deepStrictEqual(yield* Queue.take(connection.received), { type: "ping" })
      yield* TestClock.adjust("10 seconds")
      const error = yield* Fiber.join(fiber)
      assert.instanceOf(error, TransportError)
      assert.isTrue(error.isRetryable)
    }))

  // 1002 is how a server that does not speak graphql-transport-ws refuses it.
  for (const [code, retryable] of [[1002, false], [4401, false], [4406, false], [1006, true], [4500, true]] as const) {
    it.effect(`close code ${code} is a ${retryable ? "retryable" : "fatal"} TransportError`, () =>
      Effect.gen(function*() {
        const server = yield* wsServer
        const protocol = yield* makeProtocol(server)
        const fiber = yield* protocol.subscribe(subscription("A")).pipe(
          Stream.runDrain,
          Effect.flip,
          Effect.forkChild
        )
        const { connection } = yield* server.accept
        yield* Queue.take(connection.received)
        yield* connection.close(code)
        const error = yield* Fiber.join(fiber)
        assert.strictEqual(error.closeCode, code)
        assert.strictEqual(error.isRetryable, retryable)
      }))
  }

  it.effect("interrupting a subscription sends a client complete", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server)
      const fiber = yield* protocol.subscribe(subscription("A")).pipe(Stream.runDrain, Effect.forkChild)
      const { connection } = yield* server.accept
      const subscribe = yield* Queue.take(connection.received)
      yield* Fiber.interrupt(fiber)
      assert.deepStrictEqual(yield* Queue.take(connection.received), { id: subscribe.id, type: "complete" })
    }))

  it.effect("a lost connection fails in-flight queries, and the next operation reconnects with fresh connectionParams", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const tokens = yield* Ref.make(0)
      const protocol = yield* makeProtocol(server, {
        connectionParams: Effect.map(Ref.updateAndGet(tokens, (n) => n + 1), (n) => ({ token: n }))
      })
      const query: GraphQLProtocol.GraphQLRequest = {
        query: Viewer.document,
        operationName: "Viewer",
        variables: {},
        headers: {}
      }

      const inFlight = yield* protocol.execute(query).pipe(Effect.flip, Effect.forkChild)
      const first = yield* server.accept
      assert.deepStrictEqual(first.init.payload, { token: 1 })
      yield* Queue.take(first.connection.received)
      yield* first.connection.close(1006)
      const error = yield* Fiber.join(inFlight)
      assert.isTrue(error.isRetryable)

      const retried = yield* protocol.execute(query).pipe(Effect.forkChild)
      const second = yield* server.accept
      assert.deepStrictEqual(second.init.payload, { token: 2 })
      const subscribe = yield* Queue.take(second.connection.received)
      yield* second.connection.send({ id: subscribe.id, type: "next", payload: { data: { viewer: { login: "tim" } } } })
      yield* second.connection.send({ id: subscribe.id, type: "complete" })
      assert.deepStrictEqual(yield* Fiber.join(retried), { data: { viewer: { login: "tim" } } })
    }))

  it.effect("connects on the first operation, ignores per-call headers and closes idleTimeout after the last one", () =>
    Effect.gen(function*() {
      const server = yield* wsServer
      const protocol = yield* makeProtocol(server, { idleTimeout: "30 seconds", keepAlive: false })
      yield* TestClock.adjust("1 minute")
      assert.strictEqual(yield* Queue.size(server.connections), 0)

      const fiber = yield* protocol.subscribe({ ...subscription("A"), headers: { authorization: "Bearer t" } }).pipe(
        Stream.runCollect,
        Effect.forkChild
      )
      const { connection } = yield* server.accept
      const subscribe = yield* Queue.take(connection.received)
      assert.deepStrictEqual(subscribe.payload, {
        query: IssueUpdated.document,
        operationName: "IssueUpdated",
        variables: { id: "A" }
      })
      yield* connection.send({ id: subscribe.id, type: "complete" })
      assert.deepStrictEqual(yield* Fiber.join(fiber), [])

      yield* TestClock.adjust("29 seconds")
      assert.isFalse(yield* Deferred.isDone(connection.closed))
      yield* TestClock.adjust("1 second")
      assert.strictEqual(yield* Deferred.await(connection.closed), 1000)
    }))
})

describe("GraphQLProtocol.layerWebSocket with GraphQLClient", () => {
  it.effect("a retryable close resubscribes through the middleware chain; a server error is a ResponseError", () =>
    Effect.gen(function*() {
      class Count extends GraphQLMiddleware.Service<Count>()("test/Count") {}
      const subscribes = yield* Ref.make(0)
      const CountLive = Layer.succeed(Count, {
        execute: ({ next, request }) => next(request),
        subscribe: ({ next, request }) => Stream.unwrap(Effect.as(Ref.update(subscribes, (n) => n + 1), next(request)))
      })
      const server = yield* wsServer
      const context = yield* Layer.build(
        Layer.merge(GraphQLProtocol.layerWebSocket({ url }).pipe(Layer.provide(server.layer)), CountLive)
      )
      const client = yield* GraphQLClient.make(IssuesGroup.middleware(Count)).pipe(Effect.provide(context))
      const fiber = yield* client.IssueUpdated({ id: "I_1" }).pipe(
        Stream.runCollect,
        expectReason("ResponseError"),
        Effect.forkChild
      )

      const first = yield* server.accept
      yield* Queue.take(first.connection.received)
      yield* first.connection.close(4500)
      // The client's default schedule waits 500ms before resubscribing.
      yield* TestClock.adjust("500 millis")

      const second = yield* server.accept
      const subscribe = yield* Queue.take(second.connection.received)
      yield* second.connection.send({ id: subscribe.id, type: "error", payload: [{ message: "denied" }] })
      const reason = yield* Fiber.join(fiber)
      assert.deepStrictEqual(reason.errors, [{ message: "denied" }])
      assert.isUndefined(reason.data)
      assert.strictEqual(yield* Ref.get(subscribes), 2)
    }))
})

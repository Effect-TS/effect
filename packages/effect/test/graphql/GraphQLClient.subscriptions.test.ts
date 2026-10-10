import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Fiber, Layer, Ref, Schedule, Stream } from "effect"
import { GraphQLClient, GraphQLMiddleware } from "effect/graphql"
import { TransportError } from "effect/graphql/GraphQLClientError"
import { TestClock } from "effect/testing"
import { expectReason, IssuesGroup, protocolLayer } from "./fixtures.ts"

const event = (title: string) => ({ data: { issueUpdated: { title } } })

const lost = (fields?: Partial<ConstructorParameters<typeof TransportError>[0]>) =>
  Stream.fail(new TransportError({ description: "connection lost", ...fields }))

/**
 * A protocol whose `subscribe` hands out one scripted stream per attempt and
 * counts the attempts.
 */
const scriptedLayer = (attempts: ReadonlyArray<Stream.Stream<unknown, TransportError>>) =>
  Effect.gen(function*() {
    const count = yield* Ref.make(0)
    const layer = protocolLayer({
      subscribe: () =>
        Stream.unwrap(
          Effect.map(
            Ref.updateAndGet(count, (n) => n + 1),
            (n) => attempts[n - 1] ?? Stream.die(`attempt ${n} not scripted`)
          )
        )
    })
    return { layer, attempts: Ref.get(count) }
  })

const subscribe = (
  layer: Layer.Layer<any>,
  options?: Parameters<typeof GraphQLClient.make>[1]
) =>
  GraphQLClient.make(IssuesGroup, options).pipe(
    Effect.map((client) => client.IssueUpdated({ id: "I_1" })),
    Effect.provide(layer),
    Stream.unwrap
  )

describe("GraphQLClient subscriptions", () => {
  it.effect("emits each decoded event and ends when the transport completes", () =>
    Effect.gen(function*() {
      const { layer } = yield* scriptedLayer([Stream.make(event("a"), event("b"))])
      const events = yield* Stream.runCollect(subscribe(layer))
      assert.deepStrictEqual(events, [{ issueUpdated: { title: "a" } }, { issueUpdated: { title: "b" } }])
    }))

  it.effect("an event with errors fails the stream with ResponseError after emitting earlier events", () =>
    Effect.gen(function*() {
      const received = yield* Ref.make<Array<string>>([])
      const { layer, attempts } = yield* scriptedLayer([
        Stream.make(event("a"), { data: null, errors: [{ message: "gone" }] }, event("c"))
      ])
      const reason = yield* Stream.runForEach(
        subscribe(layer),
        (e) => Ref.update(received, (all) => [...all, e.issueUpdated.title])
      ).pipe(expectReason("ResponseError"))
      assert.deepStrictEqual(reason.errors, [{ message: "gone" }])
      assert.deepStrictEqual(yield* Ref.get(received), ["a"])
      // Errors in an event are not retried.
      assert.strictEqual(yield* attempts, 1)
    }))

  it.effect("retries a retryable TransportError on the default schedule (500ms, then x1.5)", () =>
    Effect.gen(function*() {
      const { layer, attempts } = yield* scriptedLayer([lost(), lost(), Stream.make(event("a"))])
      const fiber = yield* Stream.runCollect(subscribe(layer)).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      assert.strictEqual(yield* attempts, 1)

      yield* TestClock.adjust("499 millis")
      assert.strictEqual(yield* attempts, 1)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(yield* attempts, 2)

      yield* TestClock.adjust("749 millis")
      assert.strictEqual(yield* attempts, 2)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(yield* attempts, 3)

      assert.deepStrictEqual(yield* Fiber.join(fiber), [{ issueUpdated: { title: "a" } }])
    }))

  it.effect("waits for retryAfter when the transport reports one", () =>
    Effect.gen(function*() {
      const { layer, attempts } = yield* scriptedLayer([
        lost({ retryAfter: Duration.seconds(2) }),
        Stream.make(event("a"))
      ])
      const fiber = yield* Stream.runCollect(subscribe(layer)).pipe(Effect.forkChild)
      yield* TestClock.adjust("1999 millis")
      assert.strictEqual(yield* attempts, 1)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(yield* attempts, 2)
      assert.deepStrictEqual(yield* Fiber.join(fiber), [{ issueUpdated: { title: "a" } }])
    }))

  it.effect("a fatal close code fails the stream without retrying", () =>
    Effect.gen(function*() {
      const { layer, attempts } = yield* scriptedLayer([lost({ closeCode: 4401 }), Stream.make(event("a"))])
      const reason = yield* Stream.runCollect(subscribe(layer)).pipe(expectReason("TransportError"))
      assert.strictEqual(reason.closeCode, 4401)
      assert.strictEqual(yield* attempts, 1)
    }))

  it.effect("a non-retryable status fails the stream without retrying", () =>
    Effect.gen(function*() {
      const { layer, attempts } = yield* scriptedLayer([lost({ status: 401 }), Stream.make(event("a"))])
      const reason = yield* Stream.runCollect(subscribe(layer)).pipe(expectReason("TransportError"))
      assert.strictEqual(reason.status, 401)
      assert.strictEqual(yield* attempts, 1)
    }))

  it.effect("subscriptionRetry replaces the default schedule", () =>
    Effect.gen(function*() {
      const { layer, attempts } = yield* scriptedLayer([lost(), Stream.make(event("a"))])
      const fiber = yield* Stream.runCollect(subscribe(layer, { subscriptionRetry: Schedule.spaced("3 seconds") }))
        .pipe(Effect.forkChild)
      yield* TestClock.adjust("2999 millis")
      assert.strictEqual(yield* attempts, 1)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(yield* attempts, 2)
      assert.deepStrictEqual(yield* Fiber.join(fiber), [{ issueUpdated: { title: "a" } }])
    }))

  it.effect("fails with the last TransportError once the schedule is exhausted", () =>
    Effect.gen(function*() {
      const { layer, attempts } = yield* scriptedLayer([lost(), lost({ description: "lost again" }), lost()])
      const fiber = yield* Stream.runCollect(subscribe(layer, { subscriptionRetry: Schedule.recurs(1) }))
        .pipe(expectReason("TransportError"), Effect.forkChild)
      yield* TestClock.adjust("1 minute")
      const reason = yield* Fiber.join(fiber)
      assert.strictEqual(reason.description, "lost again")
      assert.strictEqual(yield* attempts, 2)
    }))

  it.effect("middleware subscribe runs again on every attempt", () =>
    Effect.gen(function*() {
      class Count extends GraphQLMiddleware.Service<Count>()("test/Count") {}
      const subscribes = yield* Ref.make(0)
      const executes = yield* Ref.make(0)
      const CountLive = Layer.succeed(Count, {
        execute: ({ next, request }) => Effect.andThen(Ref.update(executes, (n) => n + 1), next(request)),
        subscribe: ({ next, request }) => Stream.unwrap(Effect.as(Ref.update(subscribes, (n) => n + 1), next(request)))
      })
      const { layer } = yield* scriptedLayer([lost(), lost(), Stream.make(event("a"))])
      const stream = GraphQLClient.make(IssuesGroup.middleware(Count)).pipe(
        Effect.map((client) => client.IssueUpdated({ id: "I_1" })),
        Effect.provide([layer, CountLive]),
        Stream.unwrap
      )
      const fiber = yield* Stream.runCollect(stream).pipe(Effect.forkChild)
      yield* TestClock.adjust("1 minute")
      assert.deepStrictEqual(yield* Fiber.join(fiber), [{ issueUpdated: { title: "a" } }])
      assert.strictEqual(yield* Ref.get(subscribes), 3)
      assert.strictEqual(yield* Ref.get(executes), 0)
    }))
})

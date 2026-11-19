import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Option, PubSub, Queue, Schema, Stream, Tracer } from "effect"
import { Rpc, RpcClient, RpcGroup, RpcServer } from "effect/rpc"
import type { FromClient } from "effect/rpc/RpcMessage"

const Watch = Rpc.make("Watch", { success: Schema.Number, stream: true }).annotate(Rpc.TracingEnabled, "none")
const group = RpcGroup.make(Watch)

describe("shared RPC stream tracing", () => {
  for (const handler of ["Stream", "Effect<Dequeue>"] as const) {
    it.effect(`a silent ${handler} ends each acquisition span without releasing its subscription`, () => {
      const spans: Array<Tracer.Span> = []
      const tracer = Tracer.make({
        span(options) {
          const span = new Tracer.NativeSpan(options)
          spans.push(span)
          return span
        }
      })
      return Effect.gen(function*() {
        const feed = yield* PubSub.unbounded<number>()
        const acquired = yield* Queue.unbounded<PubSub.Subscription<number>>()
        const released = yield* Queue.unbounded<void>()
        const requests = yield* Queue.unbounded<FromClient<typeof Watch>>()
        const { client, write } = yield* RpcClient.makeNoSerialization(group, {
          onFromClient: ({ message }) => Queue.offer(requests, message)
        })
        const server = yield* RpcServer.makeNoSerialization(group, { onFromServer: write }).pipe(
          Effect.provide(group.toLayer({
            Watch: (_, { remoteParentSpan }) => {
              const subscribe = Effect.gen(function*() {
                yield* Effect.addFinalizer(() => Queue.offer(released, undefined))
                const sub = yield* PubSub.subscribe(feed).pipe(
                  Effect.withSpan("Watch.subscribe", { parent: remoteParentSpan })
                )
                yield* Queue.offer(acquired, sub)
                return Stream.fromSubscription(sub)
              })
              return handler === "Stream"
                ? Stream.unwrap(subscribe)
                : Effect.flatMap(subscribe, Stream.toQueue({ capacity: 1 }))
            }
          }))
        )
        // Dispatch from a separate fiber so the server cannot inherit either caller's span.
        yield* Stream.fromQueue(requests).pipe(Stream.runForEach((msg) => server.write(0, msg)), Effect.forkScoped)

        const listen = Effect.fnUntraced(function*(id: string) {
          const parent = Tracer.externalSpan({ traceId: `trace-${id}`, spanId: id })
          const values = yield* Queue.unbounded<number>()
          const fiber = yield* client.Watch().pipe(
            Stream.runForEach((value) => Queue.offer(values, value)),
            Effect.withParentSpan(parent),
            Effect.forkScoped
          )
          const subscription = yield* Queue.take(acquired)
          return { fiber, parent, subscription, values }
        })
        const first = yield* listen("first")
        const second = yield* listen("second")

        assert.deepStrictEqual(spans.map((s) => s.name), ["Watch.subscribe", "Watch.subscribe"])
        for (const [index, { parent }] of [first, second].entries()) {
          const span = spans[index]!
          assert.strictEqual(span.status._tag, "Ended")
          assert.strictEqual(span.traceId, parent.traceId)
          assert.strictEqual(Option.getOrThrow(span.parent).spanId, parent.spanId)
        }

        yield* PubSub.publish(feed, 1)
        assert.strictEqual(yield* Queue.take(first.values), 1)
        assert.strictEqual(yield* Queue.take(second.values), 1)
        yield* Fiber.interrupt(first.fiber)
        yield* Queue.take(released)
        assert.isTrue(Option.isNone(PubSub.remainingUnsafe(first.subscription)))
        yield* PubSub.publish(feed, 2)
        assert.strictEqual(yield* Queue.take(second.values), 2)
        yield* Fiber.interrupt(second.fiber)
        yield* Queue.take(released)
        assert.isTrue(Option.isNone(PubSub.remainingUnsafe(second.subscription)))
      }).pipe(Effect.withTracer(tracer))
    })
  }
})

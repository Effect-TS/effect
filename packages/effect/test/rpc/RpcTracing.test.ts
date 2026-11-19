import { assert, describe, it } from "@effect/vitest"
import { type Cause, Effect, Option, Queue, Stream, Tracer } from "effect"
import { Rpc, RpcClient, RpcGroup, type RpcMessage, RpcMiddleware, RpcServer } from "effect/rpc"

class Observe extends RpcMiddleware.Service<Observe>()("Observe") {}

const stream = { stream: true } as const
const group = RpcGroup.make(
  Rpc.make("Queue", stream),
  Rpc.make("Both").annotate(Rpc.TracingEnabled, "both"),
  Rpc.make("None").annotate(Rpc.TracingEnabled, "none")
).merge(
  RpcGroup.make(
    Rpc.make("Client", stream),
    Rpc.make("Server", stream).annotate(Rpc.TracingEnabled, "server")
  ).annotateRpcs(Rpc.TracingEnabled, "client")
).middleware(Observe)

type Rpcs = RpcGroup.Rpcs<typeof group>
const caller = Tracer.externalSpan({ traceId: "caller-trace", spanId: "caller-span", sampled: false })

const runCall = (tag: Rpcs["_tag"], options: {
  omitId?: "traceId" | "spanId"
  noCaller?: boolean
  disableClient?: boolean
  disableServer?: boolean
  disablePropagation?: boolean
  tracerDisabled?: boolean
} = {}) => {
  const spans: Array<Tracer.NativeSpan> = []
  const sent: Array<RpcMessage.Request<Rpcs>> = []
  const handlers: Array<Tracer.ExternalSpan | undefined> = []
  const middleware: Array<Tracer.ExternalSpan | undefined> = []
  const observe = (_: unknown, { remoteParent }: { remoteParent: Tracer.ExternalSpan | undefined }) => {
    handlers.push(remoteParent)
    return Effect.void
  }
  const observeStream = (...args: Parameters<typeof observe>) => Stream.fromEffect(observe(...args))
  return Effect.gen(function*() {
    const inbox = yield* Queue.unbounded<RpcMessage.FromClient<Rpcs>>()
    const client = yield* RpcClient.makeNoSerialization(group, {
      disableTracing: options.disableClient,
      onFromClient: ({ message }) => Queue.offer(inbox, message)
    })
    const server = yield* RpcServer.makeNoSerialization(group, {
      disableTracing: options.disableServer,
      disableSpanPropagation: options.disablePropagation,
      onFromServer: client.write
    })
    // Start the transport reader before installing the caller span. The server
    // can only recover that span from the message, not the caller's fiber.
    yield* Queue.take(inbox).pipe(
      Effect.flatMap((message) => {
        if (message._tag === "Request") {
          sent.push(message)
          if (options.omitId) return server.write(0, { ...message, [options.omitId]: undefined })
        }
        return server.write(0, message)
      }),
      Effect.forever,
      Effect.forkScoped
    )
    const result = client.client[tag]()
    const call = Stream.isStream(result) ? Stream.runDrain(result) : result
    yield* (options.noCaller ? call : Effect.withParentSpan(call, caller)).pipe(
      Effect.withTracerEnabled(!options.tracerDisabled)
    )
    assert.lengthOf(sent, 1)
    assert.lengthOf(handlers, 1)
    assert.lengthOf(middleware, 1)
    return { spans, request: sent[0], handler: handlers[0], middleware: middleware[0] }
  }).pipe(
    Effect.provide(group.toLayer({
      Both: observe,
      None: observe,
      Client: observeStream,
      Server: observeStream,
      Queue: Effect.fnUntraced(function*(...args) {
        yield* observe(...args)
        const queue = yield* Queue.unbounded<void, Cause.Done>()
        yield* Queue.end(queue)
        return queue
      })
    })),
    Effect.provideService(Observe, (effect, { remoteParent }) => {
      middleware.push(remoteParent)
      return effect
    }),
    Effect.provideService(
      Tracer.Tracer,
      Tracer.make({
        span(options) {
          const span = new Tracer.NativeSpan(options)
          spans.push(span)
          return span
        }
      })
    )
  )
}

const traceFields = (span: { traceId?: string; spanId?: string; sampled?: boolean }) => ({
  traceId: span.traceId,
  spanId: span.spanId,
  sampled: span.sampled
})

describe("Rpc.TracingEnabled", () => {
  for (
    const [tag, kinds] of [
      ["Queue", ["client", "server"]],
      ["Both", ["client", "server"]],
      ["Client", ["client"]],
      ["Server", ["server"]],
      ["None", []]
    ] as const
  ) {
    it.effect(`${tag}: creates ${kinds.join(" and ") || "no"} spans and propagates the sending span`, () =>
      Effect.gen(function*() {
        const { handler, middleware, request, spans } = yield* runCall(tag)
        assert.deepStrictEqual(spans.map((span) => span.kind), [...kinds])
        const client = spans.find((span) => span.kind === "client")
        const server = spans.find((span) => span.kind === "server")
        if (client) assert.deepStrictEqual(Option.getOrUndefined(client.parent), caller)
        const expected = traceFields(client ?? caller)
        assert.deepStrictEqual(traceFields(request), expected)
        const remote = Tracer.externalSpan(client ?? caller)
        assert.deepStrictEqual(handler, remote)
        assert.deepStrictEqual(middleware, remote)
        if (server) assert.deepStrictEqual(Option.getOrUndefined(server.parent), remote)
      }))
  }

  for (
    const [label, tag, options, kinds] of [
      ["unary call without a caller", "None", { noCaller: true }, []],
      ["client-wide opt-out", "Both", { disableClient: true }, ["server"]],
      ["disabled tracer without a client span", "None", { tracerDisabled: true }, []],
      ["disabled tracer with a client span", "Client", { tracerDisabled: true }, []]
    ] as const
  ) {
    it.effect(`${label}: sends no trace fields`, () =>
      Effect.gen(function*() {
        const { handler, middleware, request, spans } = yield* runCall(tag, options)
        assert.deepStrictEqual(spans.map((span) => span.kind), [...kinds])
        for (const key of ["traceId", "spanId", "sampled"]) assert.notProperty(request, key)
        assert.isUndefined(handler)
        assert.isUndefined(middleware)
      }))
  }

  it.effect("server-wide opt-out suppresses the server span but preserves remoteParent", () =>
    Effect.gen(function*() {
      const { handler, middleware, spans } = yield* runCall("Both", { disableServer: true })
      assert.deepStrictEqual(spans.map((span) => span.kind), ["client"])
      const remote = Tracer.externalSpan(spans[0])
      assert.deepStrictEqual(handler, remote)
      assert.deepStrictEqual(middleware, remote)
    }))

  it.effect("an incomplete ID pair does not create a remote parent", () =>
    Effect.gen(function*() {
      for (const omitId of ["traceId", "spanId"] as const) {
        const { handler, middleware, spans } = yield* runCall("Server", { omitId })
        assert.isUndefined(handler)
        assert.isUndefined(middleware)
        assert.deepStrictEqual(spans[0].parent, Option.none())
      }
    }))

  it.effect("a protocol without propagation ignores incoming trace fields", () =>
    Effect.gen(function*() {
      const { handler, middleware, request, spans } = yield* runCall("Server", { disablePropagation: true })
      assert.deepStrictEqual(traceFields(request), traceFields(caller))
      assert.isUndefined(handler)
      assert.isUndefined(middleware)
      assert.deepStrictEqual(spans.map((span) => span.kind), ["server"])
      assert.deepStrictEqual(spans[0].parent, Option.none())
    }))
})

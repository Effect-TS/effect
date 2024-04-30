/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import type { Scope } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import * as MetricState from "effect/MetricState"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import * as Ndjson from "../Ndjson.js"
import * as Domain from "./Domain.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ClientImpl {
  readonly unsafeAddSpan: (_: Domain.Span | Domain.SpanEvent) => void
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Client {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Client = Context.GenericTag<Client, ClientImpl>("@effect/experimental/DevTools/Client")

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<ClientImpl, never, Scope.Scope | Socket.Socket> = Effect.gen(function*(_) {
  const socket = yield* _(Socket.Socket)
  const requests = yield* _(Queue.sliding<Domain.Request>(1024))

  function metricsSnapshot(): Domain.MetricsSnapshot {
    const snapshot = Metric.unsafeSnapshot()
    const metrics: Array<Domain.Metric> = []

    for (let i = 0, len = snapshot.length; i < len; i++) {
      const metricPair = snapshot[i]
      if (MetricState.isCounterState(metricPair.metricState)) {
        metrics.push({
          _tag: "Counter",
          name: metricPair.metricKey.name,
          description: metricPair.metricKey.description,
          tags: metricPair.metricKey.tags,
          state: metricPair.metricState
        })
      } else if (MetricState.isGaugeState(metricPair.metricState)) {
        metrics.push({
          _tag: "Gauge",
          name: metricPair.metricKey.name,
          description: metricPair.metricKey.description,
          tags: metricPair.metricKey.tags,
          state: metricPair.metricState
        })
      } else if (MetricState.isHistogramState(metricPair.metricState)) {
        metrics.push({
          _tag: "Histogram",
          name: metricPair.metricKey.name,
          description: metricPair.metricKey.description,
          tags: metricPair.metricKey.tags,
          state: metricPair.metricState
        })
      } else if (MetricState.isSummaryState(metricPair.metricState)) {
        metrics.push({
          _tag: "Summary",
          name: metricPair.metricKey.name,
          description: metricPair.metricKey.description,
          tags: metricPair.metricKey.tags,
          state: metricPair.metricState
        })
      } else if (MetricState.isFrequencyState(metricPair.metricState)) {
        metrics.push({
          _tag: "Frequency",
          name: metricPair.metricKey.name,
          description: metricPair.metricKey.description,
          tags: metricPair.metricKey.tags,
          state: {
            occurrences: Object.fromEntries(metricPair.metricState.occurrences.entries())
          }
        })
      }
    }

    return {
      _tag: "MetricsSnapshot",
      metrics
    }
  }

  yield* _(
    Stream.fromQueue(requests),
    Stream.pipeThroughChannel(
      Ndjson.duplexSchema(Socket.toChannel(socket), {
        inputSchema: Domain.Request,
        outputSchema: Domain.Response
      })
    ),
    Stream.runForEach((req) => {
      switch (req._tag) {
        case "MetricsRequest": {
          return requests.offer(metricsSnapshot())
        }
        case "Pong": {
          return Effect.void
        }
      }
    }),
    Effect.tapErrorCause(Effect.logDebug),
    Effect.retry(
      Schedule.exponential("500 millis").pipe(
        Schedule.union(Schedule.spaced("10 seconds"))
      )
    ),
    Effect.forkScoped,
    Effect.interruptible
  )
  yield* _(
    Queue.offer(requests, { _tag: "Ping" }),
    Effect.delay("3 seconds"),
    Effect.forever,
    Effect.forkScoped,
    Effect.interruptible
  )
  yield* _(Effect.addFinalizer(() =>
    requests.offer(metricsSnapshot()).pipe(
      Effect.zipRight(Effect.yieldNow())
    )
  ))

  return Client.of({
    unsafeAddSpan: (request) => Queue.unsafeOffer(requests, request)
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Client, never, Socket.Socket> = Layer.scoped(Client, make)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeTracer: Effect.Effect<Tracer.Tracer, never, Client> = Effect.gen(function*(_) {
  const client = yield* _(Client)
  const currentTracer = yield* _(Effect.tracer)

  return Tracer.make({
    span(name, parent, context, links, startTime, kind) {
      const span = currentTracer.span(name, parent, context, links, startTime, kind)
      client.unsafeAddSpan(span)
      const oldEvent = span.event
      span.event = function(this: any, name, startTime, attributes) {
        client.unsafeAddSpan({
          _tag: "SpanEvent",
          traceId: span.traceId,
          spanId: span.spanId,
          name,
          startTime,
          attributes: attributes || {}
        })
        return oldEvent.call(this, name, startTime, attributes)
      }
      const oldEnd = span.end
      span.end = function(this: any) {
        client.unsafeAddSpan(span)
        return oldEnd.apply(this, arguments as any)
      }
      return span
    },
    context: currentTracer.context
  })
}).pipe(
  Effect.annotateLogs({
    package: "@effect/experimental",
    module: "DevTools",
    service: "Tracer"
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracer = (url = "ws://localhost:34437"): Layer.Layer<never> =>
  pipe(
    makeTracer,
    Effect.map(Layer.setTracer),
    Layer.unwrapEffect,
    Layer.provide(layer),
    Layer.provide(Socket.layerWebSocket(url))
  )

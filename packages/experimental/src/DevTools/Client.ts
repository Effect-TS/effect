/**
 * @since 1.0.0
 */
import * as Ndjson from "@effect/platform/Ndjson"
import * as Socket from "@effect/platform/Socket"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Metric from "effect/Metric"
import * as MetricState from "effect/MetricState"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
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
export const make: Effect.Effect<ClientImpl, never, Scope.Scope | Socket.Socket> = Effect.gen(function*() {
  const socket = yield* Socket.Socket
  const requests = yield* Mailbox.make<Domain.Request>()

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

  const connected = yield* Deferred.make<void>()

  yield* Mailbox.toStream(requests).pipe(
    Stream.pipeThroughChannel(
      Ndjson.duplexSchemaString(Socket.toChannelString(socket), {
        inputSchema: Domain.Request,
        outputSchema: Domain.Response
      })
    ),
    Stream.runForEach((req) => {
      Deferred.unsafeDone(connected, Exit.void)
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
    Effect.retry(Schedule.spaced("1 seconds")),
    Effect.forkScoped,
    Effect.uninterruptible
  )

  yield* Effect.addFinalizer(() =>
    requests.offer(metricsSnapshot()).pipe(
      Effect.zipRight(Effect.fiberIdWith((id) => requests.failCause(Cause.interrupt(id))))
    )
  )
  yield* requests.offer({ _tag: "Ping" }).pipe(
    Effect.delay("3 seconds"),
    Effect.forever,
    Effect.forkScoped,
    Effect.interruptible
  )

  yield* Deferred.await(connected).pipe(
    Effect.timeoutOption("1 second")
  )

  return Client.of({
    unsafeAddSpan: (request) => requests.unsafeOffer(request)
  })
}).pipe(
  Effect.annotateLogs({
    package: "@effect/experimental",
    module: "DevTools",
    service: "Client"
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Client, never, Socket.Socket> = Layer.scoped(Client, make)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeTracer: Effect.Effect<Tracer.Tracer, never, Client> = Effect.gen(function*() {
  const client = yield* Client
  const currentTracer = yield* Effect.tracer

  return Tracer.make({
    span(name, parent, context, links, startTime, kind, options) {
      const span = currentTracer.span(name, parent, context, links, startTime, kind, options)
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
export const layerTracer: Layer.Layer<never, never, Socket.Socket> = pipe(
  makeTracer,
  Effect.map(Layer.setTracer),
  Layer.unwrapEffect,
  Layer.provide(layer)
)

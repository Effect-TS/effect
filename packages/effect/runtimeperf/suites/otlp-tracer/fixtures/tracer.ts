import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import type * as Tracer from "effect/Tracer"
import * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as OtlpExporter from "effect/unstable/observability/OtlpExporter"
import * as OtlpSerialization from "effect/unstable/observability/OtlpSerialization"
import * as OtlpTracer from "effect/unstable/observability/OtlpTracer"
import assert from "node:assert/strict"

const makeTracer = (onTraces: (data: OtlpTracer.TraceData) => void) => {
  let exportEffect: Effect.Effect<void> = Effect.void
  const httpClient = HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, new Response())))
  const tracer = Effect.runSync(
    Effect.scoped(
      OtlpTracer.make({
        url: "http://localhost:4318/v1/traces",
        resource: { serviceName: "runtimeperf" },
        exportInterval: "1 day",
        maxBatchSize: 101
      }).pipe(
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.provideService(OtlpSerialization.OtlpSerialization, {
          traces: (data) => {
            onTraces(data)
            return HttpBody.jsonUnsafe(data)
          },
          metrics: () => HttpBody.empty,
          logs: () => HttpBody.empty
        }),
        Effect.provideService(OtlpExporter.Flusher, {
          flush: Effect.suspend(() => exportEffect),
          register: (effect) =>
            Effect.sync(() => {
              exportEffect = effect
            })
        })
      )
    )
  )
  return {
    flush: () => Effect.runSync(exportEffect),
    tracer
  }
}

const spanOptions = {
  name: "runtimeperf-span",
  parent: Option.none<Tracer.AnySpan>(),
  annotations: Context.empty(),
  links: [] as Array<Tracer.SpanLink>,
  startTime: BigInt(1),
  kind: "internal" as const,
  sampled: true
}

export const unsampledSpan = () => {
  const { tracer } = makeTracer(() => {})
  const options = { ...spanOptions, sampled: false }
  return {
    run: () => {
      const span = tracer.span(options)
      span.end(BigInt(2), Exit.void)
      return span
    },
    validate: (span: Tracer.Span) => {
      assert.equal(span.sampled, false)
      assert.equal(span.status._tag, "Ended")
    }
  }
}

export const sampledSpanBatch = () => {
  let exportedSpans = 0
  const { flush, tracer } = makeTracer((data) => {
    exportedSpans = data.resourceSpans[0]?.scopeSpans[0]?.spans.length ?? 0
  })
  return {
    run: () => {
      for (let index = 0; index < 100; index++) {
        tracer.span(spanOptions).end(BigInt(2), Exit.void)
      }
      flush()
      return exportedSpans
    },
    validate: (count: number) => {
      assert.equal(count, 100)
    }
  }
}

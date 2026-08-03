import * as OtelTracer from "@effect/opentelemetry/OtelTracer"
import { assert, it } from "@effect/vitest"
import * as OtelApi from "@opentelemetry/api"
import * as EffectContext from "effect/Context"
import * as Option from "effect/Option"

it("preserves trace state and locality on an active OpenTelemetry parent", () => {
  const parent: OtelApi.SpanContext = {
    traceId: "1".repeat(32),
    spanId: "2".repeat(16),
    traceFlags: OtelApi.TraceFlags.SAMPLED,
    traceState: OtelApi.createTraceState("vendor=value"),
    isRemote: false
  }
  const active = OtelApi.trace.setSpanContext(OtelApi.ROOT_CONTEXT, parent)
  let receivedParent: OtelApi.SpanContext | undefined
  const tracer = {
    startSpan(_name: string, _options: unknown, context: OtelApi.Context) {
      receivedParent = OtelApi.trace.getSpanContext(context)
      return {
        spanContext: () => ({
          traceId: "3".repeat(32),
          spanId: "4".repeat(16),
          traceFlags: OtelApi.TraceFlags.SAMPLED
        })
      } as OtelApi.Span
    }
  } as OtelApi.Tracer

  new OtelTracer.OtelSpan(
    { active: () => active } as OtelApi.ContextAPI,
    OtelApi.trace,
    tracer,
    {
      name: "child",
      parent: Option.none(),
      annotations: EffectContext.empty(),
      links: [],
      startTime: 0n,
      kind: "internal",
      root: false,
      sampled: true
    }
  )

  assert.deepStrictEqual(
    [receivedParent?.traceState?.serialize(), receivedParent?.isRemote],
    ["vendor=value", false]
  )
})

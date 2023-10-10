import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import * as Tracer from "@effect/opentelemetry/Tracer"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"

const ResourceLive = Resource.layer({ serviceName: "example" })

const NodeSdkLive = NodeSdk.layer(() =>
  NodeSdk.config({
    traceExporter: new OTLPTraceExporter() as any
  })
)

const TracingLive = Layer.provide(
  ResourceLive,
  Layer.merge(NodeSdkLive, Tracer.layer)
)

const program = pipe(
  Effect.log("Hello"),
  Effect.withSpan("c"),
  Effect.withSpan("b"),
  Effect.withSpan("a"),
  Effect.repeatN(50),
  Effect.annotateSpans("working", true)
)

pipe(
  Effect.delay(program, seconds(1)),
  Effect.provide(TracingLive),
  Effect.catchAllCause(Effect.logError),
  Effect.runFork
)

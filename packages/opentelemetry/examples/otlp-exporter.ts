import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: "example"
  },
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: "http://localhost:4318/v1/traces"
    })
  )
}))

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
  Effect.provide(NodeSdkLive),
  Effect.catchAllCause(Effect.logError),
  Effect.runFork
)

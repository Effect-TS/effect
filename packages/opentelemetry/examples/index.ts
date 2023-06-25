import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Tracing from "@effect/opentelemetry/Tracer"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"

const NodeSdkLive = NodeSdk.layer({
  traceExporter: new ConsoleSpanExporter()
})

const TracingLive = Tracing.layer({
  name: "example"
})

const program = pipe(
  Effect.log("Hello"),
  Effect.withSpan("c"),
  Effect.withSpan("b"),
  Effect.withSpan("a")
)

pipe(
  program,
  Effect.provideLayer(Layer.mergeAll(NodeSdkLive, TracingLive)),
  Effect.catchAllCause(Effect.logErrorCause),
  Effect.runFork
)

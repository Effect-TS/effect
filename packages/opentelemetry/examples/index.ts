import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: "example"
  },
  spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter())
}))

const program = pipe(
  Effect.log("Hello"),
  Effect.withSpan("c"),
  Effect.withSpan("b"),
  Effect.withSpan("a")
)

pipe(
  program,
  Effect.provide(NodeSdkLive),
  Effect.catchAllCause(Effect.logError),
  Effect.runFork
)

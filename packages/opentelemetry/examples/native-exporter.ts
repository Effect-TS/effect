import * as Otlp from "@effect/opentelemetry/Otlp"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { Effect, Layer, Schedule } from "effect"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"

const Observability = Otlp.layer({
  baseUrl: "http://localhost:4318",
  resource: {
    serviceName: "my-service"
  }
}).pipe(Layer.provide(FetchHttpClient.layer))

const program = Effect.log("Hello").pipe(
  Effect.withSpan("c"),
  Effect.withSpan("b"),
  Effect.withSpan("a"),
  Effect.schedule(Schedule.spaced(1000)),
  Effect.annotateSpans("working", true)
)

const failingProgram = Effect.fail(new Error("Failing program")).pipe(
  Effect.withSpan("d")
)

program.pipe(
  Effect.andThen(failingProgram),
  Effect.provide(Observability),
  Effect.catchAllCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.runFork
)

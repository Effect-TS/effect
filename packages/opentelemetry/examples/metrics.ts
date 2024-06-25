import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { millis, seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Metric from "effect/Metric"

const counter = Metric.counter("count", {
  description: "An example counter"
})

const incrementCounter = pipe(
  Metric.increment(counter),
  Effect.delay(seconds(1)),
  Effect.forever
)

const timer = Metric.timer("timer")

const timerLoop = pipe(
  Effect.randomWith((_) => _.nextRange(1, 1000)),
  Effect.flatMap((_) => Effect.sleep(millis(_))),
  Metric.trackDuration(timer),
  Effect.forever
)

const freq = Metric.frequency("freq")
const labels = [
  "cake",
  "pie",
  "cookie",
  "brownie",
  "muffin"
]

const freqLoop = Effect.randomWith((_) => _.nextIntBetween(0, labels.length)).pipe(
  Effect.flatMap((_) => Metric.update(freq, labels[_])),
  Effect.zipRight(Effect.sleep("1 seconds")),
  Effect.forever
)

const summary = Metric.summary({
  name: "summary",
  maxAge: "1 days",
  maxSize: 1000,
  error: 0.01,
  quantiles: [0.1, 0.5, 0.9]
})

const summaryLoop = Effect.randomWith((_) => _.nextRange(100, 1000)).pipe(
  Metric.trackSuccess(summary),
  Effect.zipRight(Effect.sleep("10 millis")),
  Effect.forever
)

const spawner = Effect.randomWith((_) => _.nextIntBetween(500, 1500)).pipe(
  Effect.flatMap((_) => Effect.fork(Effect.sleep(_))),
  Effect.flatMap((_) => _.await),
  Effect.forever
)

const program = Effect.gen(function*() {
  yield* Effect.fork(incrementCounter)
  yield* Effect.fork(timerLoop)
  yield* Effect.fork(freqLoop)
  yield* Effect.fork(summaryLoop)
  yield* Effect.fork(spawner)
})

const MetricsLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: "example"
  },
  metricReader: new PrometheusExporter({ port: 9464 })
}))

pipe(
  program,
  Effect.awaitAllChildren,
  Effect.provide(MetricsLive),
  Effect.catchAllCause(Effect.logError),
  Effect.runFork
)

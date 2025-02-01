import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as it from "@effect/vitest"
import { InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
import * as Effect from "effect/Effect"
import { describe, expect } from "vitest"

describe("Logger", () => {
  describe("provided", () => {
    const exporter = new InMemoryLogRecordExporter()

    const TracingLive = NodeSdk.layer(Effect.sync(() => ({
      resource: {
        serviceName: "test"
      },
      logRecordProcessor: [new SimpleLogRecordProcessor(exporter)]
    })))

    it.effect("emits log records", () =>
      Effect.provide(
        Effect.gen(function*() {
          yield* Effect.log("test").pipe(
            Effect.repeatN(9)
          )

          expect(exporter.getFinishedLogRecords()).toHaveLength(10)
        }),
        TracingLive
      ))
  })

  describe("not provided", () => {
    const exporter = new InMemoryLogRecordExporter()

    const TracingLive = NodeSdk.layer(Effect.sync(() => ({
      resource: {
        serviceName: "test"
      }
    })))

    it.effect("withSpan", () =>
      Effect.provide(
        Effect.gen(function*() {
          yield* Effect.log("test")

          expect(exporter.getFinishedLogRecords()).toHaveLength(0)
        }),
        TracingLive
      ))
  })
})

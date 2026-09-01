import { assert, describe, it } from "@effect/vitest"
import { Console, FileSystem, Logger, Metric, Terminal } from "effect"

describe("Service keys", () => {
  it("uses the core module namespace", () => {
    assert.strictEqual(Console.Console.key, "effect/Console")
    assert.strictEqual(Logger.CurrentLoggers.key, "effect/Logger/CurrentLoggers")
    assert.strictEqual(Metric.FiberRuntimeMetricsKey, "effect/Metric/FiberRuntimeMetrics")
    assert.strictEqual(Metric.MetricRegistry.key, "effect/Metric/MetricRegistry")
    assert.strictEqual(FileSystem.FileSystem.key, "effect/FileSystem")
    assert.strictEqual(FileSystem.WatchBackend.key, "effect/FileSystem/WatchBackend")
    assert.strictEqual(Terminal.Terminal.key, "effect/Terminal")
  })
})

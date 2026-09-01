import { assert, describe, it } from "@effect/vitest"
import { Console, FileSystem, Logger, Metric, Terminal } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"

describe("Service keys", () => {
  it("uses the core module namespace", () => {
    assert.strictEqual(Console.Console.key, "effect/Console")
    assert.strictEqual(Logger.CurrentLoggers.key, "effect/Logger/CurrentLoggers")
    assert.strictEqual(Metric.FiberRuntimeMetricsKey, "effect/Metric/FiberRuntimeMetrics")
    assert.strictEqual(Metric.MetricRegistry.key, "effect/Metric/MetricRegistry")
    assert.strictEqual(FileSystem.FileSystem.key, "effect/FileSystem")
    assert.strictEqual(FileSystem.WatchBackend.key, "effect/FileSystem/WatchBackend")
    assert.strictEqual(Terminal.Terminal.key, "effect/Terminal")
    assert.strictEqual(HttpClient.TracerPropagationEnabled.key, "effect/http/HttpClient/TracerPropagationEnabled")
  })

  it("uses the Terminal module namespace for QuitError", () => {
    const error = new Terminal.QuitError({})

    assert.strictEqual(Reflect.get(error, "~effect/Terminal/QuitError"), "~effect/Terminal/QuitError")
  })
})

import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { PassThrough } from "node:stream"
import { makeLogBuffer } from "./utils.ts"

// testcontainers hands the log consumer a utf8-decoded stream
const makeStream = (logs: ReturnType<typeof makeLogBuffer>) => {
  const stream = new PassThrough()
  stream.setEncoding("utf8")
  logs.consume(stream)
  return stream
}

const outputLines = (message: string) => message.split("\n").slice(1)

const tick = Effect.promise(() => new Promise<void>((resolve) => setImmediate(resolve)))

const assertTruncatedTo = (line: string, tail: string) => {
  assert.include(line, "[truncated]")
  assert.strictEqual(line.replace("[truncated]", "").trim(), tail)
}

describe("makeLogBuffer", () => {
  it.effect("keeps the last 200 lines, stripping sqlservr's \\r", () =>
    Effect.gen(function*() {
      const logs = makeLogBuffer()
      const stream = makeStream(logs)
      for (let i = 1; i <= 200; i++) stream.write(`line ${i}\n\r`)
      stream.end("line 201")
      const message = yield* logs.drain
      assert.include(message, "Last 200 line(s)")
      assert.deepStrictEqual(
        outputLines(message),
        Array.from({ length: 200 }, (_, i) => `line ${i + 2}`)
      )
    }))

  it.effect("caps each line at its last 1,000 characters", () =>
    Effect.gen(function*() {
      const logs = makeLogBuffer()
      const stream = makeStream(logs)
      const tail = "b".repeat(1000)
      for (let i = 0; i < 199; i++) stream.write("a".repeat(9000) + tail + "\n")
      // an unterminated line arriving in many newline-free chunks
      for (let i = 0; i < 1000; i++) stream.write("a".repeat(1000))
      stream.end(tail)
      const lines = outputLines(yield* logs.drain)
      assert.strictEqual(lines.length, 200)
      lines.forEach((line) => assertTruncatedTo(line, tail))
    }))

  it.effect("reports a stream error after the captured lines", () =>
    Effect.gen(function*() {
      const logs = makeLogBuffer()
      const stream = makeStream(logs)
      stream.write("starting\n")
      yield* tick
      stream.destroy(new Error("boom"))
      assert.deepStrictEqual(outputLines(yield* logs.drain), [
        "starting",
        "[log stream error] Error: boom"
      ])
    }))

  it.effect("stops waiting for a stream that never ends after 1 second", () =>
    Effect.gen(function*() {
      const logs = makeLogBuffer()
      const stream = makeStream(logs)
      stream.write("starting\n")
      yield* tick
      const fiber = yield* Effect.forkChild(logs.drain)
      yield* TestClock.adjust("1 second")
      assert.deepStrictEqual(outputLines(yield* Fiber.join(fiber)), ["starting"])
    }))
})

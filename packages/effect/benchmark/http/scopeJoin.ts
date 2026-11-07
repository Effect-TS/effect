/**
 * In-process cost of `HttpEffect.toWebHandler` for plain and streamed
 * responses, with and without a tracer. Used to compare request scope close
 * variants without loopback networking noise. Not part of the test suite.
 *
 * BENCH_LABEL names the variant. Prints one JSON line per task.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HttpEffect from "effect/http/HttpEffect"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import process from "node:process"
import { Bench } from "tinybench"

const label = process.env.BENCH_LABEL ?? "unknown"
const runtime = typeof (globalThis as any).Bun !== "undefined"
  ? `bun ${(globalThis as any).Bun.version}`
  : typeof (globalThis as any).Deno !== "undefined"
  ? `deno ${(globalThis as any).Deno.version.deno}`
  : `node ${process.version}`

const chunks = ["chunk-one\n", "chunk-two\n", "chunk-three\n"]
const plain = HttpEffect.toWebHandler(Effect.succeed(HttpServerResponse.text("ok")))
const stream = HttpEffect.toWebHandler(
  Effect.succeed(HttpServerResponse.stream(Stream.fromIterable(chunks).pipe(Stream.encodeText)))
)

const noopTracer = Tracer.make({
  span: (options) =>
    ({
      _tag: "Span",
      spanId: "spanid0123456789",
      traceId: "traceid0123456789traceid01234567",
      sampled: true,
      name: options.name,
      parent: options.parent,
      annotations: options.annotations,
      links: options.links,
      kind: options.kind,
      status: { _tag: "Started", startTime: options.startTime },
      attributes: new Map(),
      attribute() {},
      event() {},
      end() {},
      addLinks() {}
    }) as Tracer.Span
})
const traced = Context.make(Tracer.Tracer, noopTracer)

const bench = new Bench({ time: 1500, warmupTime: 500 })
bench
  .add("plain", async () => {
    const response = await plain(new Request("http://localhost/"))
    await response.text()
  })
  .add("stream", async () => {
    const response = await stream(new Request("http://localhost/"))
    await response.text()
  })
  .add("plain traced", async () => {
    const response = await plain(new Request("http://localhost/"), traced)
    await response.text()
  })
  .add("stream traced", async () => {
    const response = await stream(new Request("http://localhost/"), traced)
    await response.text()
  })

await bench.run()
for (const task of bench.tasks) {
  const result = task.result!
  if (!("latency" in result)) throw new Error(`${task.name} aborted`)
  const latency = result.latency
  console.log(JSON.stringify({
    label,
    runtime,
    task: task.name,
    samples: latency.samplesCount,
    meanUs: Number((latency.mean * 1000).toFixed(2)),
    medianUs: Number((latency.p50! * 1000).toFixed(2)),
    rmePercent: Number(latency.rme.toFixed(1))
  }))
}

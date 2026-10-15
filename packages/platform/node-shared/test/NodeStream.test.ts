import * as NodeStream from "@effect/platform-node-shared/NodeStream"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Array from "effect/Array"
import * as ByteSize from "effect/ByteSize"
import * as Channel from "effect/Channel"
import * as Console from "effect/Console"
import * as Stream from "effect/Stream"
import { spawnSync } from "node:child_process"
import { once } from "node:events"
import { join } from "node:path"
import { Duplex, Readable, Transform } from "node:stream"
import * as Zlib from "node:zlib"

// Isolate unhandled stream errors so a regression cannot crash the Vitest worker.
describe("collector destruction", { concurrent: false, timeout: 15_000 }, () => {
  for (const helper of ["toString", "toArrayBuffer"] as const) {
    for (const reason of ["maxBytes", "interruption"] as const) {
      it(`${helper} preserves ${reason} when destruction fails`, () => {
        const result = spawnSync(process.execPath, [
          join(__dirname, "fixtures", "readable-destroy-error.ts"),
          helper,
          reason
        ], { encoding: "utf8", timeout: 10_000 })
        assert.isUndefined(result.error)
        assert.strictEqual(result.status, 0, result.stderr)
        assert.include(result.stdout, "destruction completed")
      })
    }
  }
})

describe("Stream", () => {
  const onErrorCode = (error: unknown) => (error as NodeJS.ErrnoException).code
  const consumers: ReadonlyArray<
    readonly [string, (readable: Readable) => Effect.Effect<unknown, string | undefined>]
  > = [
    [
      "fromReadable",
      (readable) => NodeStream.fromReadable({ evaluate: () => readable, onError: onErrorCode }).pipe(Stream.runCollect)
    ],
    ["toString", (readable) => NodeStream.toString(() => readable, { onError: onErrorCode })],
    ["toArrayBuffer", (readable) => NodeStream.toArrayBuffer(() => readable, { onError: onErrorCode })],
    ["toUint8Array", (readable) => NodeStream.toUint8Array(() => readable, { onError: onErrorCode })]
  ]

  for (const [name, consume] of consumers) {
    if (name !== "toUint8Array") {
      it.live(`${name} cleans up listeners after destruction without a close event`, () =>
        Effect.gen(function*() {
          let complete!: () => void
          const destroyed = new Promise<void>((resolve) => {
            complete = resolve
          })
          const readable = new Readable({
            emitClose: false,
            read() {},
            destroy(_error, callback) {
              setTimeout(() => {
                callback()
                // Observe cleanup after Node has processed the destruction callback.
                setImmediate(complete)
              }, 5)
            }
          })
          yield* consume(readable).pipe(Effect.timeout("10 millis"), Effect.ignore)
          yield* Effect.promise(() => destroyed).pipe(Effect.timeout("1 second"))
          assert.isTrue(readable.closed)
          assert.deepStrictEqual(
            [readable.listenerCount("error"), readable.listenerCount("close")],
            [0, 0]
          )
        }))
    }
    for (const alreadyClosed of [false, true]) {
      it.live(`${name} fails on ${alreadyClosed ? "an already-destroyed input" : "premature close"}`, () =>
        Effect.gen(function*() {
          const readable = new Readable({
            read() {
              this.destroy()
            }
          })
          if (alreadyClosed) {
            // Ensure close has already fired before the helper can subscribe.
            const closed = once(readable, "close")
            readable.destroy()
            yield* Effect.promise(() => closed)
          }
          const code = yield* consume(readable).pipe(Effect.flip, Effect.timeout("1 second"))
          assert.strictEqual(code, "ERR_STREAM_PREMATURE_CLOSE")
        }))
    }
  }

  it.effect("should read a stream", () =>
    Effect.gen(function*() {
      const stream = NodeStream.fromReadable<"error", string>({
        evaluate: () => Readable.from(["a", "b", "c"]),
        onError: () => "error"
      })
      const items = yield* Stream.runCollect(stream)
      assert.deepEqual(items, ["a", "b", "c"])
    }))

  it.effect("fromDuplex", () =>
    Effect.gen(function*() {
      const result = yield* Stream.fromArray(["a", "b", "c"]).pipe(
        Stream.pipeThroughChannelOrFail(NodeStream.fromDuplex({
          evaluate: () =>
            new Transform({
              transform(chunk, _encoding, callback) {
                callback(null, chunk.toString().toUpperCase())
              }
            }),
          onError: () => "error" as const
        })),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(result, "ABC")
    }))

  it.effect("fromDuplex failure", () =>
    Effect.gen(function*() {
      const result = yield* Stream.fromArray(["a", "b", "c"]).pipe(
        Stream.pipeThroughChannelOrFail(NodeStream.fromDuplex({
          evaluate: () =>
            new Transform({
              transform(_chunk, _encoding, callback) {
                callback(new Error())
              }
            }),
          onError: () => "error" as const
        })),
        Stream.runDrain,
        Effect.flip
      )

      assert.strictEqual(result, "error")
    }))

  it.effect("pipeThroughDuplex", () =>
    Effect.gen(function*() {
      const result = yield* Stream.fromArray(["a", "b", "c"]).pipe(
        NodeStream.pipeThroughDuplex({
          evaluate: () =>
            new Transform({
              transform(chunk, _encoding, callback) {
                callback(null, chunk.toString().toUpperCase())
              }
            }),
          onError: () => "error" as const
        }),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(result, "ABC")
    }))

  it.effect("pipeThroughDuplex propagates upstream failure", () =>
    Effect.gen(function*() {
      const result = yield* Stream.fail("upstream error").pipe(
        NodeStream.pipeThroughDuplex({
          evaluate: () =>
            new Duplex({
              read() {},
              write(_chunk, _encoding, callback) {
                callback()
              }
            })
        }),
        Stream.runDrain,
        Effect.flip
      )

      assert.strictEqual(result, "upstream error")
    }))

  it.effect("pipeThroughDuplex write error", () =>
    Effect.gen(function*() {
      const result = yield* Stream.fromArray(["a", "b", "c"]).pipe(
        NodeStream.pipeThroughDuplex({
          evaluate: () =>
            new Duplex({
              read() {},
              write(_chunk, _encoding, callback) {
                callback(new Error())
              }
            }),
          onError: () => "error" as const
        }),
        Stream.runDrain,
        Effect.flip
      )
      assert.strictEqual(result, "error")
    }))

  it.effect("pipeThroughSimple", () =>
    Effect.gen(function*() {
      const result = yield* Stream.fromArray(["a", Buffer.from("b"), "c"]).pipe(
        NodeStream.pipeThroughSimple(
          () =>
            new Transform({
              transform(chunk, _encoding, callback) {
                callback(null, chunk.toString().toUpperCase())
              }
            })
        ),
        Stream.decodeText(),
        Stream.mkString
      )

      assert.strictEqual(result, "ABC")
    }))

  it.effect("fromDuplex should work with node:zlib", () =>
    Effect.gen(function*() {
      const text = "abcdefg1234567890"
      const encoder = new TextEncoder()
      const input = encoder.encode(text)
      const stream = NodeStream.fromReadable<Uint8Array, "error">({
        evaluate: () => Readable.from([input]),
        onError: () => "error"
      })
      const deflate = NodeStream.fromDuplex({
        evaluate: () => Zlib.createGzip(),
        onError: () => "error" as const
      })
      const inflate = NodeStream.fromDuplex<never, Uint8Array, Uint8Array, "error">({
        evaluate: () => Zlib.createUnzip(),
        onError: () => "error" as const
      })
      const channel = Channel.pipeToOrFail(deflate, inflate)
      const result = yield* stream.pipe(
        Stream.pipeThroughChannelOrFail(channel),
        Stream.decodeText(),
        Stream.mkString
      )
      assert.strictEqual(result, text)
    }))

  it.effect("toReadable roundtrip", () =>
    Effect.gen(function*() {
      const stream = Stream.range(0, 10000).pipe(
        Stream.map((n) => String(n))
      )
      const readable = yield* NodeStream.toReadable(stream)
      const outStream = NodeStream.fromReadable({
        evaluate: () => readable,
        onError: () => "error" as const
      })
      const items = yield* outStream.pipe(
        Stream.decodeText(),
        Stream.runCollect
      )
      assert.strictEqual(items.join(""), Array.range(0, 10000).join(""))
    }))

  it.effect("toReadable with error", () =>
    Effect.gen(function*() {
      const stream = Stream.fail("error")
      const readable = yield* NodeStream.toReadable(stream)
      const outStream = NodeStream.fromReadable({
        evaluate: () => readable
      })
      const error = yield* outStream.pipe(
        Stream.runCollect,
        Effect.tapError((_) => Console.log(_)),
        Effect.flip
      )
      assert.deepEqual(error.cause, "error")
    }))

  it.effect("toString registers one error listener", () =>
    Effect.gen(function*() {
      const stream = new Readable({
        read() {}
      })
      yield* NodeStream.toString(() => stream).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      assert.strictEqual(stream.listenerCount("error"), 1)
    }))

  it.effect("collects strings and array buffers with an Infinity maxBytes limit", () =>
    Effect.gen(function*() {
      const chunks = [Buffer.from("hello "), Buffer.from("world")]
      const text = yield* NodeStream.toString(() => Readable.from(chunks), { maxBytes: Infinity })
      const buffer = yield* NodeStream.toArrayBuffer(() => Readable.from(chunks), { maxBytes: Infinity })

      assert.strictEqual(text, "hello world")
      assert.deepStrictEqual(new Uint8Array(buffer), new TextEncoder().encode("hello world"))
    }))

  it.effect("toString enforces a zero maxBytes limit", () =>
    Effect.gen(function*() {
      let emitted = false
      const stream = new Readable({
        read() {
          if (emitted) return
          emitted = true
          this.push("a")
        }
      })
      const error = yield* NodeStream.toString(() => stream, {
        maxBytes: "0 B",
        onError: () => "maxBytes exceeded" as const
      }).pipe(Effect.flip)

      assert.strictEqual(error, "maxBytes exceeded")
      assert.isTrue(stream.destroyed)
    }))

  it.effect("toArrayBuffer enforces a zero maxBytes limit", () =>
    Effect.gen(function*() {
      let emitted = false
      const stream = new Readable({
        read() {
          if (emitted) return
          emitted = true
          this.push(Buffer.from("a"))
        }
      })
      const error = yield* NodeStream.toArrayBuffer(() => stream, {
        maxBytes: ByteSize.zero,
        onError: () => "maxBytes exceeded" as const
      }).pipe(Effect.flip)

      assert.strictEqual(error, "maxBytes exceeded")
      assert.isTrue(stream.destroyed)
    }))
})

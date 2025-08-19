import * as NodeSink from "@effect/platform-node-shared/NodeSink"
import * as NodeStream from "@effect/platform-node-shared/NodeStream"
import { assert, describe, it } from "@effect/vitest"
import { pipe } from "effect"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { createReadStream } from "fs"
import { join } from "path"
import { Writable } from "stream"
import Tar from "tar"

const TEST_TARBALL = join(__dirname, "fixtures", "helloworld.tar.gz")

describe("Sink", () => {
  it("should write to a stream", () =>
    Effect.gen(function*() {
      const items: Array<string> = []
      let destroyed = false
      yield* pipe(
        Stream.make("a", "b", "c"),
        Stream.run(NodeSink.fromWritable(
          () =>
            new Writable({
              construct(callback) {
                callback()
              },
              write(chunk, _encoding, callback) {
                items.push(chunk.toString())
                callback()
              },
              destroy(_error, callback) {
                destroyed = true
                callback(null)
              }
            }),
          () => "error"
        ))
      )
      assert.deepEqual(items, ["a", "b", "c"])
      assert.strictEqual(destroyed, true)
    }).pipe(Effect.runPromise))

  it("write error", () =>
    Effect.gen(function*() {
      const items: Array<string> = []
      let destroyed = false
      const sink = NodeSink.fromWritable(
        () =>
          new Writable({
            construct(callback) {
              callback()
            },
            write(chunk, _encoding, callback) {
              items.push(chunk.toString())
              callback()
            },
            destroy(_error, callback) {
              destroyed = true
              callback(null)
            }
          }),
        () => "error"
      )
      const result = yield* pipe(Stream.fail("a"), Stream.run(sink), Effect.flip)
      assert.deepEqual(items, [])
      assert.strictEqual(result, "a")
      assert.strictEqual(destroyed, true)
    }).pipe(Effect.runPromise))

  it("endOnClose false", () =>
    Effect.gen(function*() {
      const items: Array<string> = []
      let destroyed = false
      const sink = NodeSink.fromWritable(
        () =>
          new Writable({
            construct(callback) {
              callback()
            },
            write(chunk, _encoding, callback) {
              items.push(chunk.toString())
              callback()
            },
            destroy(_error, callback) {
              destroyed = true
              callback(null)
            }
          }),
        () => "error",
        { endOnDone: false }
      )
      yield* pipe(Stream.make("a", "b", "c"), Stream.run(sink))
      yield* Effect.sleep(0)
      assert.deepEqual(items, ["a", "b", "c"])
      assert.strictEqual(destroyed, false)
    }).pipe(Effect.runPromise))

  it("should handle non-compliant node streams", () =>
    Effect.gen(function*() {
      const stream = NodeStream.fromReadable<"error", Uint8Array>(() => createReadStream(TEST_TARBALL), () => "error")
      const items = yield* pipe(
        entries(stream),
        Stream.flatMap((entry) =>
          NodeStream.fromReadable<TarError, Uint8Array>(
            () => (entry as any),
            (error) => new TarError({ error })
          ).pipe(Stream.map((content) => ({ path: entry.path, content: Buffer.from(content).toString("utf-8") })))
        ),
        Stream.runCollect
      )
      assert.deepEqual(Chunk.toReadonlyArray(items), [
        { path: "./tar/world.txt", content: "world\n" },
        { path: "./tar/hello.txt", content: "hello\n" }
      ])
    }).pipe(Effect.runPromise))
})

class TarError extends Data.TaggedError("TarError")<{
  readonly error: unknown
}> {
}

const entries = <R, E>(
  input: Stream.Stream<Uint8Array, E, R>
): Stream.Stream<Tar.ReadEntry, TarError | E, R> =>
  Stream.suspend(() => {
    const parser = new Tar.Parse()

    const entries = Stream.async<Tar.ReadEntry, TarError>((emit) => {
      parser.on("entry", (entry) => {
        emit.single(entry)
      })
      parser.on("close", () => {
        emit.end()
      })
    })

    const pump = input.pipe(
      Stream.run(
        NodeSink.fromWritable(
          () => parser,
          (error) => new TarError({ error })
        )
      ),
      Stream.zipRight(Stream.empty)
    )

    return Stream.merge(entries, pump)
  })

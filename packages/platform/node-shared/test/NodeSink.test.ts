import * as NodeSink from "@effect/platform-node-shared/NodeSink"
import * as NodeStream from "@effect/platform-node-shared/NodeStream"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, type Exit, Fiber } from "effect"
import * as Data from "effect/Data"
import * as Latch from "effect/Latch"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { createReadStream } from "fs"
import { join } from "path"
import { Writable } from "stream"
import * as Tar from "tar"

const TEST_TARBALL = join(__dirname, "fixtures", "helloworld.tar.gz")

describe("Sink", () => {
  it.effect.each([
    { endOnDone: true, interrupted: true },
    { endOnDone: false, interrupted: true },
    { endOnDone: true, interrupted: false },
    { endOnDone: false, interrupted: false }
  ])(
    "backpressure: endOnDone=$endOnDone, interrupted=$interrupted",
    ({ endOnDone, interrupted }) =>
      Effect.gen(function*() {
        const items: Array<string> = []
        const entered = yield* Deferred.make<() => void>()
        const drained = yield* Deferred.make<void>()
        const writable = new Writable({
          highWaterMark: 1,
          write(chunk, _encoding, callback) {
            items.push(chunk.toString())
            if (chunk.toString() === "a") {
              // Let write() return and establish backpressure before notifying the test.
              queueMicrotask(() => Deferred.doneUnsafe(entered, Effect.succeed(callback)))
            } else {
              callback()
            }
          }
        })
        yield* Effect.addFinalizer(() => Effect.sync(() => writable.destroy()))
        const fiber = yield* Stream.make("a", "b").pipe(
          Stream.run(NodeSink.fromWritable({
            evaluate: () => writable,
            onError: (error) => error,
            endOnDone
          })),
          Effect.forkScoped
        )
        const release = yield* Deferred.await(entered)
        assert.deepEqual(items, ["a"])
        // Only "a" has been submitted to Node; "b" is still owned by the sink.
        assert.strictEqual(writable.writableLength, 1)
        assert.isTrue(writable.writableNeedDrain)
        if (interrupted) {
          yield* Fiber.interrupt(fiber)
        }
        writable.once("drain", () => Deferred.doneUnsafe(drained, Effect.void))
        yield* Effect.sync(release)
        yield* Deferred.await(drained)
        if (!interrupted) {
          yield* Fiber.join(fiber)
          assert.strictEqual(writable.writableFinished, endOnDone)
        }
        assert.deepEqual(items, interrupted ? ["a"] : ["a", "b"])
      })
  )

  it.effect.each([false, true])("repeated backpressure: interrupted=%s", (interrupted) =>
    Effect.gen(function*() {
      const items: Array<string> = []
      const writes = yield* Queue.make<() => void>()
      const writable = new Writable({
        highWaterMark: 1,
        write(chunk, _encoding, callback) {
          items.push(chunk.toString())
          queueMicrotask(() => Queue.offerUnsafe(writes, callback))
        }
      })
      yield* Effect.addFinalizer(() => Effect.sync(() => writable.destroy()))
      const fiber = yield* Stream.make("a", "b", "c", "d").pipe(
        Stream.run(NodeSink.fromWritable({ evaluate: () => writable, onError: (error) => error })),
        Effect.forkScoped
      )
      for (const count of [1, 2, 3, 4]) {
        const release = yield* Queue.take(writes)
        assert.deepEqual(items, ["a", "b", "c", "d"].slice(0, count))
        assert.isTrue(writable.writableNeedDrain)
        assert.strictEqual(writable.listenerCount("drain"), 1)
        if (interrupted && count === 3) {
          yield* Fiber.interrupt(fiber)
          assert.strictEqual(writable.listenerCount("drain"), 0)
          const drained = yield* Deferred.make<void>()
          writable.once("drain", () => Deferred.doneUnsafe(drained, Effect.void))
          yield* Effect.sync(release)
          yield* Deferred.await(drained)
          assert.deepEqual(items, ["a", "b", "c"])
          break
        }
        yield* Effect.sync(release)
      }
      if (!interrupted) {
        yield* Fiber.join(fiber)
        assert.isTrue(writable.writableFinished)
        assert.strictEqual(writable.listenerCount("drain"), 0)
      }
    }))

  it.effect.each([true, false])(
    "cancellation during drain dispatch: endOnDone=%s",
    (endOnDone) =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const entered = yield* Deferred.make<() => void>()
        const drained = yield* Deferred.make<void>()
        const controller = new AbortController()
        let exit: Exit.Exit<void, unknown> | undefined
        const writable = new Writable({
          highWaterMark: 1,
          write(chunk, _encoding, callback) {
            events.push(`write(${chunk.toString()})`)
            if (chunk.toString() === "a") {
              queueMicrotask(() => Deferred.doneUnsafe(entered, Effect.succeed(callback)))
            } else {
              callback()
            }
          }
        })
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            controller.abort()
            writable.destroy()
          })
        )
        // Node selects both listeners before this earlier listener cancels the sink.
        writable.once("drain", () => {
          controller.abort()
          events.push("abort returned")
        })
        Effect.runCallback(
          Stream.run(
            Stream.make("a", "b"),
            NodeSink.fromWritable({
              evaluate: () => writable,
              onError: (error) => error,
              endOnDone
            })
          ),
          {
            signal: controller.signal,
            onExit: (result) => {
              exit = result
              events.push(result._tag)
            }
          }
        )
        const release = yield* Deferred.await(entered)
        assert.deepEqual(events, ["write(a)"])
        assert.strictEqual(writable.writableLength, 1)
        assert.isTrue(writable.writableNeedDrain)
        assert.strictEqual(writable.listenerCount("drain"), 2)
        writable.once("drain", () => {
          queueMicrotask(() => Deferred.doneUnsafe(drained, Effect.void))
        })
        yield* Effect.sync(release)
        yield* Deferred.await(drained)
        assert.strictEqual(exit?._tag, "Failure")
        assert.strictEqual(writable.listenerCount("drain"), 0)
        assert.deepEqual(events, ["write(a)", "Failure", "abort returned"])
      })
  )

  it.effect.each([
    { endOnDone: true, backpressure: true },
    { endOnDone: false, backpressure: true },
    { endOnDone: true, backpressure: false },
    { endOnDone: false, backpressure: false }
  ])(
    "cancellation during resumed write: endOnDone=$endOnDone, backpressure=$backpressure",
    ({ endOnDone, backpressure }) =>
      Effect.gen(function*() {
        const items: Array<string> = []
        const writes = yield* Queue.make<() => void>()
        const controller = new AbortController()
        let exit: Exit.Exit<void, unknown> | undefined
        const writable = new Writable({
          highWaterMark: 1,
          write(chunk, _encoding, callback) {
            items.push(chunk.toString())
            if (chunk.toString() === "b") {
              controller.abort()
            }
            if (chunk.toString() === "a" || backpressure) {
              queueMicrotask(() => Queue.offerUnsafe(writes, callback))
            } else {
              callback()
            }
          }
        })
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            controller.abort()
            writable.destroy()
          })
        )
        Effect.runCallback(
          Stream.run(
            Stream.make("a", "b", "c"),
            NodeSink.fromWritable({
              evaluate: () => writable,
              onError: (error) => error,
              endOnDone
            })
          ),
          {
            signal: controller.signal,
            onExit: (result) => {
              exit = result
            }
          }
        )
        const release = yield* Queue.take(writes)
        assert.deepEqual(items, ["a"])
        assert.isTrue(writable.writableNeedDrain)
        yield* Effect.sync(release)
        assert.strictEqual(exit?._tag, "Failure")
        assert.deepEqual(items, ["a", "b"])
        assert.strictEqual(writable.listenerCount("drain"), 0)
        if (backpressure) {
          const releaseB = yield* Queue.take(writes)
          yield* Effect.sync(releaseB)
          assert.deepEqual(items, ["a", "b"])
        }
      })
  )

  it.effect("should write to a stream", () =>
    Effect.gen(function*() {
      const items: Array<string> = []
      const destroyLatch = yield* Latch.make()
      yield* Stream.make("a", "b", "c").pipe(
        Stream.run(NodeSink.fromWritable({
          evaluate: () =>
            new Writable({
              construct(callback) {
                callback()
              },
              write(chunk, _encoding, callback) {
                items.push(chunk.toString())
                callback()
              },
              destroy(_error, callback) {
                destroyLatch.openUnsafe()
                callback(null)
              }
            }),
          onError: () => "error"
        }))
      )
      assert.deepEqual(items, ["a", "b", "c"])
      yield* destroyLatch.await
    }))

  it.effect("write error", () =>
    Effect.gen(function*() {
      const items: Array<string> = []
      const sink = NodeSink.fromWritable({
        evaluate: () =>
          new Writable({
            construct(callback) {
              callback()
            },
            write(chunk, _encoding, callback) {
              items.push(chunk.toString())
              callback()
            },
            destroy(_error, callback) {
              callback(null)
            }
          }),
        onError: () => "error"
      })
      const result = yield* Stream.fail("a").pipe(Stream.run(sink), Effect.flip)
      assert.deepEqual(items, [])
      assert.strictEqual(result, "a")
    }))

  it.live("endOnClose false", () =>
    Effect.gen(function*() {
      const items: Array<string> = []
      let destroyed = false
      const sink = NodeSink.fromWritable({
        evaluate: () =>
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
        onError: () => "error",
        endOnDone: false
      })
      yield* Stream.run(Stream.make("a", "b", "c"), sink)
      yield* Effect.sleep(10)
      assert.deepEqual(items, ["a", "b", "c"])
      assert.strictEqual(destroyed, false)
    }))

  it.effect("should handle non-compliant node streams", () =>
    Effect.gen(function*() {
      const stream = NodeStream.fromReadable<Uint8Array, "error">({
        evaluate: () => createReadStream(TEST_TARBALL),
        onError: () => "error"
      })
      const items = yield* entries(stream).pipe(
        Stream.flatMap((entry) =>
          NodeStream.fromReadable({
            evaluate: () => (entry as any),
            onError: (error) => new TarError({ error })
          }).pipe(
            Stream.map((content) => ({
              path: entry.path,
              content: Buffer.from(content).toString("utf-8")
            }))
          )
        ),
        Stream.runCollect
      )
      assert.deepEqual(items, [
        { path: "./tar/world.txt", content: "world\n" },
        { path: "./tar/hello.txt", content: "hello\n" }
      ])
    }))
})

class TarError extends Data.TaggedError("TarError")<{
  readonly error: unknown
}> {}

const entries = <R, E>(
  input: Stream.Stream<Uint8Array, E, R>
): Stream.Stream<Tar.ReadEntry, TarError | E, R> =>
  Effect.gen(function*() {
    const parser = new Tar.Parser()

    yield* input.pipe(
      Stream.run(
        NodeSink.fromWritable({
          evaluate: () => parser,
          onError: (error) => new TarError({ error })
        })
      ),
      Effect.forkScoped
    )

    return Stream.callback<Tar.ReadEntry, TarError>((queue) =>
      Effect.sync(() => {
        parser.on("entry", (entry) => {
          Queue.offerUnsafe(queue, entry)
        })
        parser.on("close", () => {
          Queue.endUnsafe(queue)
        })
      })
    )
  }).pipe(Stream.unwrap)

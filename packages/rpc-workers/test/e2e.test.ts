import "@vitest/web-worker"
import * as Worker from "@effect/platform-browser/Worker"
import * as Client from "@effect/rpc-workers/Client"
import * as Resolver from "@effect/rpc-workers/Resolver"
import { Exit } from "effect"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import { schema, schemaWithSetup } from "./e2e/schema.js"

// TODO: test more than one worker
const PoolLive = Resolver.makePoolLayer({
  spawn: () => new globalThis.Worker(new URL("./e2e/worker", import.meta.url)),
  size: 1
}).pipe(
  Layer.provide(Worker.layerManager)
)

const SetupPoolLive = Resolver.makePoolLayer({
  spawn: () => new globalThis.Worker(new URL("./e2e/worker-setup", import.meta.url)),
  size: 1
}).pipe(
  Layer.provide(Worker.layerManager)
)

const SharedPoolLive = Resolver.makePoolLayer({
  spawn: () => new globalThis.SharedWorker(new URL("./e2e/worker", import.meta.url)),
  size: 1
}).pipe(
  Layer.provide(Worker.layerManager)
)

const client = Client.make(schema)

const runPromise = <E, A>(effect: Effect.Effect<never, E, A>) =>
  Effect.runPromiseExit(effect).then((exit) => {
    if (Exit.isFailure(exit) && !Exit.isInterrupted(exit)) {
      throw Cause.squash(exit.cause)
    }
  })

describe("e2e", () => {
  it("Worker", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) => Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3])))),
      Effect.provide(PoolLive),
      runPromise
    ))

  it("100x", () =>
    pipe(
      Effect.all(
        Chunk.map(Chunk.range(1, 100), () => client.getBinary(new Uint8Array([1, 2, 3]))),
        { concurrency: "unbounded" }
      ),
      Effect.tap((_) => Effect.sync(() => expect(_.length).toEqual(100))),
      Effect.provide(PoolLive),
      runPromise
    ))

  it("interruption", () => {
    expect(() =>
      pipe(
        client.delayed("foo"),
        Effect.timeoutFailCause({
          onTimeout: () => Cause.die("boom"),
          duration: Duration.millis(100)
        }),
        Effect.provide(PoolLive),
        Effect.runPromise
      )
    ).rejects.toEqual(new Error("boom"))
  })

  it.skip("setup", async () => {
    const channel = new MessageChannel()
    const closedPromise = new Promise<string>((resolve) => {
      channel.port1.onmessage = (e) => {
        console.log(e)

        resolve(e.data)
      }
    })

    await pipe(
      Effect.gen(function*($) {
        const client = yield* $(Client.make(schemaWithSetup, channel.port2))
        const name = yield* $(client.getName)
        expect(name).toEqual("Tim")
      }),
      Effect.provide(SetupPoolLive),
      Effect.runPromise
    )

    expect(await closedPromise).toEqual("closed")
  })

  it("SharedWorker", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) => Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3])))),
      Effect.provide(SharedPoolLive),
      runPromise
    ))
}, 10000)

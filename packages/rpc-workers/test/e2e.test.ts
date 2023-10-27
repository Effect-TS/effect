/* eslint-disable import/no-duplicates */
import "@vitest/web-worker"

import * as Worker from "@effect/platform-browser/Worker"
import * as Client from "@effect/rpc-workers/Client"
import * as Resolver from "@effect/rpc-workers/Resolver"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import { schema, schemaWithSetup } from "./e2e/schema"
// @ts-expect-error
import TestSharedWorker from "./e2e/worker?sharedworker"
// @ts-expect-error
import TestWorker from "./e2e/worker?worker"
// @ts-expect-error
import TestWorkerSetup from "./e2e/worker-setup?worker"

// TODO: test more than one worker
const PoolLive = Resolver.makePoolLayer({
  spawn: () => new TestWorker(),
  size: 1
}).pipe(
  Layer.use(Worker.layerManager)
)

const SetupPoolLive = Resolver.makePoolLayer({
  spawn: () => new TestWorkerSetup(),
  size: 1
}).pipe(
  Layer.use(Worker.layerManager)
)

const SharedPoolLive = Resolver.makePoolLayer({
  spawn: () => new TestSharedWorker(),
  size: 1
}).pipe(
  Layer.use(Worker.layerManager)
)

const client = Client.make(schema)

describe("e2e", () => {
  it("Worker", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) => Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3])))),
      Effect.provide(PoolLive),
      Effect.runPromise
    ))

  it("SharedWorker", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) => Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3])))),
      Effect.provide(SharedPoolLive),
      Effect.runPromise
    ))

  it("100x", () =>
    pipe(
      Effect.all(
        Chunk.map(Chunk.range(1, 100), () => client.getBinary(new Uint8Array([1, 2, 3]))),
        { concurrency: "unbounded" }
      ),
      Effect.tap((_) => Effect.sync(() => expect(_.length).toEqual(100))),
      Effect.provide(PoolLive),
      Effect.runPromise
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

  it("setup", async () => {
    const channel = new MessageChannel()
    const closedPromise = new Promise<string>((resolve) => {
      channel.port1.onmessage = (e) => {
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
})

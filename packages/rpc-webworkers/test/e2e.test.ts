import * as Chunk from "@effect/data/Chunk"
import * as Cause from "@effect/io/Cause"
import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Pool from "@effect/io/Pool"
import * as Client from "@effect/rpc-webworkers/Client"
import * as Resolver from "@effect/rpc-webworkers/Resolver"
import { RpcWorkerResolverLive } from "@effect/rpc-webworkers/internal/resolver"
import "@vitest/web-worker"
import { describe, expect, it } from "vitest"
import { schema, schemaWithSetup } from "./e2e/schema"

// TODO: test more than one worker
const PoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make(
    spawn(() => new Worker(new URL("./e2e/worker.ts", import.meta.url))),
    1,
  ),
)
const ResolverLive = Layer.provide(PoolLive, RpcWorkerResolverLive)

const SetupPoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make(
    spawn(() => new Worker(new URL("./e2e/worker-setup.ts", import.meta.url))),
    1,
  ),
)
const SetupResolverLive = Layer.provide(SetupPoolLive, RpcWorkerResolverLive)

const SharedPoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make(
    spawn(() => new SharedWorker(new URL("./e2e/worker.ts", import.meta.url))),
    1,
  ),
)
const SharedResolverLive = Layer.provide(SharedPoolLive, RpcWorkerResolverLive)

const client = Client.make(schema)

describe("e2e", () => {
  it("Worker", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) =>
        Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3]))),
      ),
      Effect.provideLayer(ResolverLive),
      Effect.runPromise,
    ))

  it("SharedWorker", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) =>
        Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3]))),
      ),
      Effect.provideLayer(SharedResolverLive),
      Effect.runPromise,
    ))

  it("100x", () =>
    pipe(
      Effect.allPar(
        Chunk.map(Chunk.range(1, 100), () =>
          client.getBinary(new Uint8Array([1, 2, 3])),
        ),
      ),
      Effect.tap((_) => Effect.sync(() => expect(_.length).toEqual(100))),
      Effect.provideLayer(ResolverLive),
      Effect.runPromise,
    ))

  it("interruption", () => {
    expect(() =>
      pipe(
        client.delayed("foo"),
        Effect.timeoutFailCause(() => Cause.die("boom"), Duration.millis(100)),
        Effect.provideLayer(ResolverLive),
        Effect.runPromise,
      ),
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
      Effect.gen(function* ($) {
        const client = yield* $(Client.make(schemaWithSetup, channel.port2))
        const name = yield* $(client.getName)
        expect(name).toEqual("Tim")
      }),
      Effect.provideLayer(SetupResolverLive),
      Effect.runPromise,
    )

    expect(await closedPromise).toEqual("closed")
  })
})

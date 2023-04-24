import "@vitest/web-worker"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Client from "@effect/rpc-webworkers/Client"
import * as Resolver from "@effect/rpc-webworkers/Resolver"
import { describe, expect, it } from "vitest"
import { schema } from "./e2e/schema"
import * as Pool from "@effect/io/Pool"
import * as Chunk from "@effect/data/Chunk"
import * as Layer from "@effect/io/Layer"
import { RpcWorkerResolverLive } from "@effect/rpc-webworkers/internal/resolver"
import { RpcResolver } from "@effect/rpc/Resolver"

// TODO: test more than one worker
const PoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make(
    spawn(() => new Worker(new URL("./e2e/worker.ts", import.meta.url))),
    1,
  ),
)
const ResolverLive = Layer.provide(PoolLive, RpcWorkerResolverLive)

const SharedPoolLive = Resolver.makePoolLayer((spawn) =>
  Pool.make(
    spawn(() => new SharedWorker(new URL("./e2e/worker.ts", import.meta.url))),
    1,
  ),
)
const SharedResolverLive = Layer.provide(SharedPoolLive, RpcWorkerResolverLive)

const client = Client.makeWithResolver(schema, RpcResolver)

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
})

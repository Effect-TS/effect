import "@vitest/web-worker"
import { describe, it, expect } from "vitest"
import * as Resolver from "@effect/rpc-webworkers/Resolver"
import * as Client from "@effect/rpc/Client"
import { schema } from "./e2e/schema"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"

const ResolverLive = Resolver.WebWorkerResolverLive(
  () => new Worker(new URL("./e2e/worker.ts", import.meta.url)),
  { size: Effect.succeed(4) },
)

const client = Client.make(schema, Resolver.WebWorkerResolver)

describe("e2e", () => {
  it("works", () =>
    pipe(
      client.getBinary(new Uint8Array([1, 2, 3])),
      Effect.tap((_) =>
        Effect.sync(() => expect(_).toEqual(new Uint8Array([1, 2, 3]))),
      ),
      Effect.provideLayer(ResolverLive),
      Effect.runPromise,
    ))
})

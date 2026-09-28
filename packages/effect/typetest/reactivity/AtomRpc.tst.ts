import { Context, Effect, hole, Layer, Schema } from "effect"
import type { Headers } from "effect/http"
import { type AsyncResult, type Atom, AtomRpc } from "effect/reactivity"
import type { ReadonlyRecord } from "effect/Record"
import { Rpc, RpcGroup, RpcMiddleware } from "effect/rpc"
import type { RpcClientError } from "effect/rpc/RpcClientError"
import { describe, expect, it } from "tstyche"

describe("AtomRpc", () => {
  class ServerDependency extends Context.Service<
    ServerDependency,
    {}
  >()("ServerDependency") {}

  class RequiringMiddleware extends RpcMiddleware.Service<RequiringMiddleware, {
    requires: ServerDependency
  }>()("RequiringMiddleware", {}) {}

  const RequiringGroup = RpcGroup.make(
    Rpc.make("getUser", {
      success: Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      })
    }).middleware(RequiringMiddleware)
  )

  it("query supports RPCs whose middleware declares service requirements", () => {
    const Client = AtomRpc.Service()("RequiringClient", {
      group: RequiringGroup,
      protocol: Layer.empty,
      makeEffect: Effect.die("unused")
    })

    const query = Client.query("getUser", undefined)

    expect<Atom.Success<typeof query>>().type.toBe<{
      readonly id: number
      readonly name: string
    }>()
  })

  describe("union of tags", () => {
    const Client = AtomRpc.Service()("UnionClient", {
      group: RpcGroup.make(
        Rpc.make("GetA", {
          payload: { id: Schema.String },
          success: Schema.Struct({ a: Schema.Number }),
          error: Schema.TaggedStruct("ErrorA", {})
        }),
        Rpc.make("GetB", {
          payload: { count: Schema.Number },
          success: Schema.Struct({ b: Schema.String }),
          error: Schema.TaggedStruct("ErrorB", {})
        })
      ),
      protocol: Layer.empty,
      makeEffect: Effect.die("unused")
    })
    const tag = hole<"GetA" | "GetB">()

    type MutationArg<Payload> = {
      readonly payload: Payload
      readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
      readonly headers?: Headers.Input | undefined
    }

    it("query infers a result per RPC", () => {
      const query = Client.query(tag, hole<{ readonly id: string } | { readonly count: number }>())

      expect(query).type.toBe<
        | Atom.Atom<AsyncResult.AsyncResult<{ readonly a: number }, { readonly _tag: "ErrorA" } | RpcClientError>>
        | Atom.Atom<AsyncResult.AsyncResult<{ readonly b: string }, { readonly _tag: "ErrorB" } | RpcClientError>>
      >()
    })

    it("mutation keeps each RPC's payload with its result", () => {
      expect(Client.mutation(tag)).type.toBe<
        | Atom.AtomResultFn<
          MutationArg<{ readonly id: string }>,
          { readonly a: number },
          { readonly _tag: "ErrorA" } | RpcClientError
        >
        | Atom.AtomResultFn<
          MutationArg<{ readonly count: number }>,
          { readonly b: string },
          { readonly _tag: "ErrorB" } | RpcClientError
        >
      >()
    })
  })
})

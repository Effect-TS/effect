import { Context, Schema } from "effect"
import type * as EntityProxy from "effect/cluster/EntityProxy"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"
import * as RpcMiddleware from "effect/rpc/RpcMiddleware"
import { describe, expect, it } from "tstyche"

class CurrentUser extends Context.Service<CurrentUser, { id: string }>()("CurrentUser") {}
class RequiredScope extends Context.Service<RequiredScope, string>()("RequiredScope") {}
class ReadOnly extends Context.Service<ReadOnly, true>()("ReadOnly") {}
const Traced = Context.Reference<boolean>("Traced", { defaultValue: () => false })

class AuthMiddleware extends RpcMiddleware.Service<AuthMiddleware, {
  provides: CurrentUser
}>()("AuthMiddleware", {
  error: Schema.Never,
  requiredForClient: undefined
}) {}

type Scoped = { readonly annotations: Context.Context<RequiredScope> }

const Plain = Rpc.make("Plain", { success: Schema.String })
const ListBase = Rpc.make("List", { payload: { id: Schema.String }, success: Schema.Number })
const List = ListBase.annotate(RequiredScope, "todos:read")

describe("Rpc annotations", () => {
  it("adds the key's identifier", () => {
    expect<Rpc.Annotations<typeof List>>().type.toBe<RequiredScope>()
    const both = List.annotate(ReadOnly, true)
    expect<Rpc.Annotations<typeof both>>().type.toBe<RequiredScope | ReadOnly>()
  })

  it("adds nothing for a Context.Reference key", () => {
    const traced = Plain.annotate(Traced, true)
    expect<Rpc.Annotations<typeof traced>>().type.toBe<never>()
  })

  it("adds the services of a merged context", () => {
    const merged = Plain.annotateMerge(Context.make(ReadOnly, true))
    expect<Rpc.Annotations<typeof merged>>().type.toBe<ReadOnly>()
  })

  it("keeps annotations through middleware, prefix and the set methods", () => {
    const withMiddleware = List.middleware(AuthMiddleware)
    expect<Rpc.Annotations<typeof withMiddleware>>().type.toBe<RequiredScope>()
    const prefixed = List.prefix("v1.")
    expect<Rpc.Annotations<typeof prefixed>>().type.toBe<RequiredScope>()
    const withSuccess = List.setSuccess(Schema.Boolean)
    expect<Rpc.Annotations<typeof withSuccess>>().type.toBe<RequiredScope>()
    const withError = List.setError(Schema.String)
    expect<Rpc.Annotations<typeof withError>>().type.toBe<RequiredScope>()
    const withPayload = List.setPayload({ name: Schema.String })
    expect<Rpc.Annotations<typeof withPayload>>().type.toBe<RequiredScope>()
  })

  it("keeps each member's annotations through a group's middleware and prefix", () => {
    const group = RpcGroup.make(Plain, List).middleware(AuthMiddleware).prefix("v1.")
    type Members = RpcGroup.Rpcs<typeof group>
    expect<Rpc.Annotations<Extract<Members, { readonly _tag: "v1.List" }>>>().type.toBe<RequiredScope>()
    expect<Rpc.Annotations<Extract<Members, { readonly _tag: "v1.Plain" }>>>().type.toBe<never>()
  })

  it("leaves annotateRpcs typed as before", () => {
    const group = RpcGroup.make(Plain, List)
    expect(group.annotateRpcs(ReadOnly, true)).type.toBe<typeof group>()
  })

  it("carries annotations into entity proxy RPCs", () => {
    expect<Rpc.Annotations<EntityProxy.ConvertRpcs<typeof List, "Todos">>>().type.toBe<RequiredScope>()
  })

  it("leaves the existing helpers working on an annotated Rpc", () => {
    expect<Rpc.Tag<typeof List>>().type.toBe<"List">()
    expect<Rpc.Payload<typeof List>>().type.toBe<{ readonly id: string }>()
    expect<Rpc.Success<typeof List>>().type.toBe<number>()
  })

  it("keeps an annotated Rpc assignable to the unannotated type", () => {
    expect(List).type.toBeAssignableTo<typeof ListBase>()
  })

  it("lets a consumer require an annotation", () => {
    expect(List).type.toBeAssignableTo<Scoped>()
    expect(List.middleware(AuthMiddleware).prefix("v1.")).type.toBeAssignableTo<Scoped>()
    expect(ListBase).type.not.toBeAssignableTo<Scoped>()
  })

  it("reads an annotation without a cast", () => {
    expect(Context.get(List.annotations, RequiredScope)).type.toBe<string>()
    expect(Context.get).type.not.toBeCallableWith(ListBase.annotations, RequiredScope)
  })

  it("keeps annotations on a class that extends an annotated Rpc", () => {
    class GetUser extends Rpc.make("GetUser", { success: Schema.String }).annotate(ReadOnly, true) {}
    expect<Rpc.Annotations<typeof GetUser>>().type.toBe<ReadOnly>()
    expect<Rpc.Tag<typeof GetUser>>().type.toBe<"GetUser">()
  })
})

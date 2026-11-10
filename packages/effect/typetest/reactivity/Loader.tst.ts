import { Context, Effect, Layer, Schema, type Stream } from "effect"
import { type AsyncResult, Loader } from "effect/reactivity"
import { describe, expect, it } from "tstyche"

class Api extends Context.Service<Api, { readonly name: (id: string) => Effect.Effect<string> }>()("Api") {}

const User = Schema.Struct({ id: Schema.String, name: Schema.String })
type User = typeof User.Type
class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {}) {}

class GetUser extends Loader.Service<GetUser>()(
  "GetUser",
  {
    args: { id: Schema.String },
    success: User,
    error: NotFound,
    staleTime: "30 seconds",
    refetchInterval: (result, args) => {
      expect(result).type.toBe<AsyncResult.Success<User, NotFound> | AsyncResult.Failure<User, NotFound>>()
      expect(args).type.toBe<{ readonly id: string }>()
      return undefined
    }
  },
  Effect.gen(function*() {
    const api = yield* Api
    return ({ id }) => Effect.map(api.name(id), (name) => ({ id, name }))
  })
) {}

class Count extends Loader.Service<Count>()("Count", {
  args: Schema.String,
  success: Schema.Number,
  error: Schema.Never,
  staleTime: 0
}, Effect.succeed((prefix) => Effect.succeed(prefix.length))) {}

declare const fetcher: Effect.Effect<(args: {}) => Effect.Effect<string>>
declare const needsApi: Effect.Effect<(args: {}) => Effect.Effect<string, never, Api>>

describe("Loader", () => {
  it("a read's statics require the read and the cache, never what its fetcher uses", () => {
    expect(GetUser.get({ id: "1" })).type.toBe<Effect.Effect<User, NotFound, GetUser | Loader.Cache>>()
    expect(GetUser.prefetch({ id: "1" })).type.toBe<Effect.Effect<void, never, GetUser | Loader.Cache>>()
    expect(GetUser.changes({ id: "1" })).type.toBe<
      Stream.Stream<AsyncResult.AsyncResult<User, NotFound>, never, GetUser | Loader.Cache>
    >()
    expect(GetUser.peek({ id: "1" })).type.toBe<
      Effect.Effect<AsyncResult.AsyncResult<User, NotFound>, never, Loader.Cache>
    >()
    expect(GetUser.invalidate()).type.toBe<Effect.Effect<void, never, Loader.Cache>>()
    expect(GetUser.layer).type.toBe<Layer.Layer<GetUser, never, Api>>()
  })

  it("args are a fields record or any Schema", () => {
    expect(Count.get).type.toBe<(args: string) => Effect.Effect<number, never, Count | Loader.Cache>>()
    expect(GetUser.get).type.not.toBeCallableWith({ id: 1 })
    expect(GetUser.get).type.not.toBeCallableWith()
  })

  it("a fake is a plain function", () => {
    expect(Layer.succeed(GetUser, ({ id }) => Effect.succeed({ id, name: "Ann" }))).type.toBe<Layer.Layer<GetUser>>()
  })

  it("a fetcher can't keep a requirement of its own", () => {
    const options = { args: {}, success: Schema.String, error: Schema.Never, staleTime: 0 } as const
    expect(Loader.Service<any>()).type.toBeCallableWith("Ok", options, fetcher)
    expect(Loader.Service<any>()).type.not.toBeCallableWith("Bad", options, needsApi)
  })

  it("patches and writes are typed by their read", () => {
    GetUser.patch({ id: "1" }, (user) => {
      expect(user).type.toBe<User>()
      return user
    })
    GetUser.patchAll((user, args) => {
      expect(user).type.toBe<User>()
      expect(args).type.toBe<{ readonly id: string }>()
      return user
    })
    expect(GetUser.patch).type.not.toBeCallableWith({ id: "1" }, (user: User) => user.name)
    expect(GetUser.set).type.toBeCallableWith({ id: "1" }, { id: "1", name: "Ann" })
    expect(GetUser.set).type.not.toBeCallableWith({ id: "1" }, { id: "1" })
    expect(Loader.applyPatches([], Count, "a", 1)).type.toBe<number>()
  })

  it("reads, entries and tags are targets; patches of any read are patches", () => {
    const targets: ReadonlyArray<Loader.Target> = [GetUser, Count.entry("a"), Loader.Tag("users")]
    const patches: ReadonlyArray<Loader.Patch> = [GetUser.patch({ id: "1" }, (user) => user), Count.patchAll((n) => n)]
    const writes: ReadonlyArray<Loader.Write> = [Count.set("a", 1)]
    expect(Loader.invalidatesEntry({ invalidates: targets, optimistic: patches }, GetUser, { id: "1" })).type.toBe<
      boolean
    >()
    expect(writes).type.toBe<ReadonlyArray<Loader.Write>>()
  })

  it("a snapshot is branded by its read and label, and needs no services", () => {
    const Model = Schema.Struct({ user: Loader.Snapshot(GetUser, "user") })
    expect<typeof Model.Type["user"]>().type.toBe<Loader.Snapshot<typeof GetUser, "user">>()
    expect<typeof Model.DecodingServices>().type.toBe<never>()
    expect<typeof Model.EncodingServices>().type.toBe<never>()
    expect(Model.make).type.toBeCallableWith({ user: {} as Loader.Snapshot<typeof GetUser, "user"> })
    expect(Model.make).type.not.toBeCallableWith({
      user: {} as Loader.Snapshot<typeof GetUser, "other">
    })
    expect(Model.make).type.not.toBeCallableWith({
      user: {} as Loader.Snapshot<typeof Count, "user">
    })
  })
})

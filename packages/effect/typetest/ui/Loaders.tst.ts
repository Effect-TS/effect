// PROTOTYPE (EFF-3558): loaders declared in Component.make.
import { Effect, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"
import { Snapshot } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

class GetUser extends Loader.Service<GetUser>()(
  "typetest/GetUser",
  { args: Schema.Struct({ id: Schema.String }), success: User, error: Schema.String, staleTime: "1 minute" },
  Effect.succeed(({ id }) => Effect.succeed({ id, name: "Ann" }))
) {}

class ListUsers extends Loader.Service<ListUsers>()(
  "typetest/ListUsers",
  { args: Schema.Struct({ page: Schema.Number }), success: Schema.Array(User), error: Schema.Never, staleTime: 0 },
  Effect.succeed(() => Effect.succeed([]))
) {}

const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Loader.Snapshot(GetUser, "user") },
  PageChanged: { snapshot: Loader.Snapshot(ListUsers, "page") },
  Bump: {}
})

const Card = Component.make({
  name: "Card",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({
    user: Loader.Snapshot(GetUser, "user"),
    page: Loader.Snapshot(ListUsers, "page"),
    n: Schema.Number
  }),
  message: Message,
  elements: Html,
  loaders: {
    user: (_model, props) => ({ id: props.id }),
    page: (model, _props, loaded) => AsyncResult.isSuccess(loaded.user) ? { page: model.n } : undefined
  },
  init: ($) => ({ ...$.empty, n: 0 }),
  update: (model, message, $) =>
    Message.match(message, {
      UserChanged: ({ snapshot }) => {
        const next = { ...model, user: snapshot }
        return AsyncResult.isSuccess($.loadedOf(next).user) ? { ...next, n: 0 } : next
      },
      PageChanged: ({ snapshot }) => ({ ...model, page: snapshot }),
      Bump: () => ({ ...model, n: model.n + 1 })
    }),
  subscriptions: (_model, _props, watch) => [
    watch({
      user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }),
      page: (snapshot) => Message.make({ _tag: "PageChanged", snapshot })
    })
  ],
  view: (_model, h) =>
    AsyncResult.match(h.loaded.user, {
      onInitial: () => h.p("Loading"),
      onFailure: () => h.p("Missing"),
      onSuccess: ({ value }) => h.p(value.name).onClick(Message.make({ _tag: "Bump" }))
    })
})

const base = {
  name: "X",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user") }),
  message: Message,
  elements: Html
} as const

describe("Component loaders", () => {
  it("infers everything from the Schemas, with no annotation", () => {
    expect<Component.Model<typeof Card>>().type.toBe<{
      readonly user: Loader.Snapshot<typeof GetUser, "user">
      readonly page: Loader.Snapshot<typeof ListUsers, "page">
      readonly n: number
    }>()
    expect<Component.SnapshotFields<Component.Model<typeof Card>>>().type.toBe<"user" | "page">()
    expect(Card.loaded).type.toBe<
      (
        model: Component.Model<typeof Card>,
        props: { readonly id: string }
      ) => Component.Loaded<Component.Model<typeof Card>>
    >()
    expect<Component.Loaded<Component.Model<typeof Card>>>().type.toBe<{
      readonly user: AsyncResult.AsyncResult<{ readonly id: string; readonly name: string }, string>
      readonly page: AsyncResult.AsyncResult<ReadonlyArray<{ readonly id: string; readonly name: string }>, never>
    }>()
  })

  it("the reads are requirements of the component", () => {
    expect<Component.Requirements<typeof Card>>().type.toBe<GetUser | ListUsers>()
  })

  const loaders = { user: (_model: unknown, props: { readonly id: string }) => ({ id: props.id }) }
  const rest = {
    init: ($: { readonly empty: UserModel }) => $.empty,
    update: (model: UserModel) => model,
    view: () => null as never
  }
  type UserModel = { readonly user: Loader.Snapshot<typeof GetUser, "user"> }
  const toMessage = (snapshot: Loader.Snapshot<typeof GetUser, "user">) =>
    Message.make({ _tag: "UserChanged", snapshot })

  it("the base case is callable", () => {
    expect(Component.make).type.toBeCallableWith({
      ...base,
      ...rest,
      loaders,
      subscriptions: (_m: UserModel, _p: {}, watch: Component.Watch<UserModel, typeof Message.Type>) =>
        [watch({ user: toMessage })] as const
    })
  })

  it("a Model with snapshot fields needs loaders and subscriptions", () => {
    expect(Component.make).type.not.toBeCallableWith({ ...base, ...rest })
    expect(Component.make).type.not.toBeCallableWith({ ...base, ...rest, loaders })
    expect(Component.make).type.not.toBeCallableWith({
      ...base,
      ...rest,
      subscriptions: (_m: UserModel, _p: {}, watch: Component.Watch<UserModel, typeof Message.Type>) =>
        [watch({ user: toMessage })] as const
    })
  })

  it("the args are the read's", () => {
    expect(Component.make).type.not.toBeCallableWith({
      ...base,
      ...rest,
      loaders: { user: (_model: unknown, props: { readonly id: string }) => ({ page: props.id }) },
      subscriptions: (_m: UserModel, _p: {}, watch: Component.Watch<UserModel, typeof Message.Type>) =>
        [watch({ user: toMessage })] as const
    })
    // `undefined` disables the read.
    expect<Component.Loaders<UserModel, {}>>().type.toBe<{
      readonly user: (
        model: UserModel,
        props: {},
        loaded: Component.Loaded<UserModel>
      ) => { readonly id: string } | undefined
    }>()
  })

  it("subscriptions starts with the watch", () => {
    expect(Component.make).type.not.toBeCallableWith({ ...base, ...rest, loaders, subscriptions: () => [] })
    expect(Component.make).type.not.toBeCallableWith({
      ...base,
      ...rest,
      loaders,
      subscriptions: () => [null] as const
    })
  })

  it("the watch takes a handler per snapshot field, for that field's snapshot", () => {
    type Model = Component.Model<typeof Card>
    const watch = null as unknown as Component.Watch<Model, typeof Message.Type>
    const page = (snapshot: Loader.Snapshot<typeof ListUsers, "page">) =>
      Message.make({ _tag: "PageChanged", snapshot })
    expect(watch).type.toBeCallableWith({ user: toMessage, page })
    expect(watch).type.not.toBeCallableWith({ user: toMessage })
    expect(watch).type.not.toBeCallableWith({ user: toMessage, page: toMessage })
    expect(watch).type.not.toBeCallableWith({ user: toMessage, page, n: page })
    expect(watch({ user: toMessage, page })).type.toBe<Component.Watches<Model, typeof Message.Type>>()
  })

  it("a Model with no snapshot field is unchanged, and has no h.loaded", () => {
    const Plain = Component.make({
      name: "Plain",
      model: Schema.Struct({ n: Schema.Number }),
      message: Message,
      elements: Html,
      init: ($) => {
        expect($.empty).type.toBe<{}>()
        return { n: 0 }
      },
      update: (model) => model,
      subscriptions: () => [],
      view: (model, h) => {
        expect(h).type.not.toHaveProperty("loaded")
        return h.p(String(model.n))
      }
    })
    expect<Component.Requirements<typeof Plain>>().type.toBe<never>()
    expect<Component.SnapshotFields<number>>().type.toBe<never>()
    expect<Component.SnapshotFields<ReadonlyArray<string>>>().type.toBe<never>()
    expect<Component.SnapshotFields<null>>().type.toBe<never>()
  })

  it("a snapshot nested in a union or an array is not a snapshot field", () => {
    type Model = {
      readonly a: Loader.Snapshot<typeof GetUser, "a"> | null
      readonly b: ReadonlyArray<Loader.Snapshot<typeof GetUser, "b">>
      readonly c?: Loader.Snapshot<typeof GetUser, "c">
    }
    expect<Component.SnapshotFields<Model>>().type.toBe<never>()
  })

  it("nothing is inferred as any", () => {
    Component.make({
      ...base,
      loaders: {
        user: (model, props, loaded) => {
          expect(model).type.toBe<UserModel>()
          expect(props).type.toBe<{ readonly id: string }>()
          expect(loaded).type.toBe<Component.Loaded<UserModel>>()
          return { id: props.id }
        }
      },
      init: ($) => {
        expect($.empty).type.toBe<Component.Empty<UserModel>>()
        expect($.empty.user).type.toBe<Loader.Snapshot<typeof GetUser, "user">>()
        return $.empty
      },
      update: (model, _message, $) => {
        expect($.loadedOf).type.toBe<(model: UserModel) => Component.Loaded<UserModel>>()
        return model
      },
      subscriptions: (model, props, watch) => {
        expect(model).type.toBe<UserModel>()
        expect(props).type.toBe<{ readonly id: string }>()
        return [
          watch({
            user: (snapshot) => {
              expect(snapshot).type.toBe<Loader.Snapshot<typeof GetUser, "user">>()
              return Message.make({ _tag: "UserChanged", snapshot })
            }
          })
        ]
      },
      view: (model, h) => {
        expect(model).type.toBe<UserModel>()
        expect(h.props).type.toBe<{ readonly id: string }>()
        expect(h.loaded).type.not.toHaveProperty("nope")
        expect(h.loaded.user).type.toBe<
          AsyncResult.AsyncResult<{ readonly id: string; readonly name: string }, string>
        >()
        return h.p("x")
      }
    })
  })

  it("a message constructor rejects a snapshot of another read or label", () => {
    const user = Snapshot.success(GetUser, "user", { id: "1" }, { id: "1", name: "Ann" })
    expect(user).type.toBe<Loader.Snapshot<typeof GetUser, "user">>()
    expect(Message.make).type.toBeCallableWith({ _tag: "UserChanged", snapshot: user })
    // Another read.
    expect(Message.make).type.not.toBeCallableWith({ _tag: "PageChanged", snapshot: user })
    // Another label.
    const other = Snapshot.success(GetUser, "other", { id: "1" }, { id: "1", name: "Ann" })
    expect(Message.make).type.not.toBeCallableWith({ _tag: "UserChanged", snapshot: other })
    // The make input is the brand, not unknown.
    expect(Message.make).type.not.toBeCallableWith({ _tag: "UserChanged", snapshot: "nope" })
    expect<(typeof Message.cases.UserChanged.fields.snapshot)["~type.make.in"]>().type.toBe<
      Loader.Snapshot<typeof GetUser, "user">
    >()
    // The testing constructor checks the read's args and value.
    expect(Snapshot.success).type.not.toBeCallableWith(GetUser, "user", { page: 1 }, { id: "1", name: "Ann" })
    expect(Snapshot.failure).type.not.toBeCallableWith(GetUser, "user", { id: "1" }, 1)
  })
})

import { Effect, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"
import { Story } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"

const User = Schema.Struct({ id: Schema.String, name: Schema.String, teamId: Schema.String })
const Team = Schema.Struct({ id: Schema.String, title: Schema.String })

class GetUser extends Loader.Service<GetUser>()(
  "typetest/GetUser",
  { args: { id: Schema.String }, success: User, error: Schema.String, staleTime: "1 minute" },
  Effect.succeed(({ id }) => Effect.succeed({ id, name: "Ann", teamId: "t" }))
) {}

class GetTeam extends Loader.Service<GetTeam>()(
  "typetest/GetTeam",
  { args: { id: Schema.String }, success: Team, error: Schema.Never, staleTime: 0 },
  Effect.succeed(({ id }) => Effect.succeed({ id, title: "T" }))
) {}

const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Loader.Snapshot(GetUser, "user"), failed: Schema.Boolean },
  TeamChanged: { snapshot: Loader.Snapshot(GetTeam, "team") },
  Bump: {}
})

const Card = Component.make({
  name: "Card",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({
    user: Loader.Snapshot(GetUser, "user"),
    team: Loader.Snapshot(GetTeam, "team"),
    n: Schema.Number
  }),
  message: Message,
  elements: Html,
  loaders: {
    user: (_model, props) => ({ id: props.id }),
    team: (_model, _props, loaded) => AsyncResult.isSuccess(loaded.user) ? { id: loaded.user.value.teamId } : undefined
  },
  init: ($) => ({ ...$.empty, n: 0 }),
  update: (model, message) =>
    Message.match(message, {
      UserChanged: ({ snapshot }) => ({ ...model, user: snapshot }),
      TeamChanged: ({ snapshot }) => ({ ...model, team: snapshot }),
      Bump: () => ({ ...model, n: model.n + 1 })
    }),
  subscriptions: (_model, _props, watch) => [
    watch({
      user: (snapshot, result) =>
        Message.make({ _tag: "UserChanged", snapshot, failed: AsyncResult.isFailure(result) }),
      team: (snapshot) => Message.make({ _tag: "TeamChanged", snapshot })
    })
  ],
  view: (_model, h) =>
    AsyncResult.match(h.loaded.user, {
      onInitial: () => h.p(Option.isSome(h.previous.user) ? h.previous.user.value.name : "Loading"),
      onFailure: () => h.p("Missing"),
      onSuccess: ({ value }) => h.p(value.name, h.patched.team ? "*" : "").onClick(Message.make({ _tag: "Bump" }))
    })
})

describe("Component loaders", () => {
  it("infers every type from the Schemas", () => {
    type M = Component.Model<typeof Card>
    expect<Component.LoaderFields<M>>().type.toBe<"user" | "team">()
    expect<Component.Requirements<typeof Card>>().type.toBe<GetUser | GetTeam>()
  })

  it("a loader's loaded doesn't have its own field", () => {
    type M = Component.Model<typeof Card>
    expect<Parameters<Component.Loaders<M, {}>["team"]>[2]>().type.toBe<
      Omit<Component.Loaded<M>, "team">
    >()
    Component.make({
      name: "Self",
      model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user"), team: Loader.Snapshot(GetTeam, "team") }),
      message: Message,
      loaders: {
        // @ts-expect-error Property 'user' does not exist
        user: (_model, _props, loaded) => AsyncResult.isSuccess(loaded.user) ? { id: "1" } : undefined,
        team: (_model, _props, loaded) => AsyncResult.isSuccess(loaded.user) ? { id: "1" } : undefined
      },
      init: ($) => $.empty,
      update: (model) => model,
      subscriptions: (_m, _p, watch) => [
        watch({ user: () => Message.make({ _tag: "Bump" }), team: () => Message.make({ _tag: "Bump" }) })
      ],
      view: () => null as never
    })
  })
})

describe("Story loader steps", () => {
  it("take a loader field and its read's success or error", () => {
    Story.make(Card, { id: "1" }, (s) =>
      s
        .loaded("user", { id: "1", name: "Ann", teamId: "t" })
        .loadFailed("user", "missing")
        .loaded("team", { id: "t", title: "T" }, { waiting: true, patched: true })
        // @ts-expect-error Argument of type '"n"' is not assignable to parameter of type '"user" | "team"'
        .loaded("n", 1)
        // @ts-expect-error 'title' does not exist
        .loaded("user", { id: "t", title: "T" })
        // @ts-expect-error Argument of type '"missing"' is not assignable to parameter of type 'never'
        .loadFailed("team", "missing"))
    expect(Story.make(Card, { id: "1" }, (s) => s.loaded("user", { id: "1", name: "Ann", teamId: "t" }))).type.toBe<
      Story.Story<{ readonly id: string }, Component.Model<typeof Card>, Component.Message<typeof Card>, never>
    >()
  })
})

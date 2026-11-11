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
  subscriptions: (_model, _props, $) => [
    $.watch({
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
      subscriptions: (_m, _p, $) => [
        $.watch({ user: () => Message.make({ _tag: "Bump" }), team: () => Message.make({ _tag: "Bump" }) })
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

class GetCount extends Loader.Service<GetCount>()(
  "typetest/GetCount",
  { args: Schema.String, success: Schema.Number, error: Schema.Never, staleTime: 0 },
  Effect.succeed(() => Effect.succeed(1))
) {}

const ListMessage = Schema.TaggedUnion({
  UsersChanged: { snapshots: Loader.SnapshotMap(GetUser, "users"), changed: Schema.Number },
  Show: { ids: Schema.Array(Schema.String) }
})

const List = Component.make({
  name: "List",
  model: Schema.Struct({ ids: Schema.Array(Schema.String), users: Loader.SnapshotMap(GetUser, "users") }),
  message: ListMessage,
  elements: Html,
  loaders: {
    users: (model) => model.ids.map((id) => ({ id }))
  },
  init: ($) => ({ ...$.empty, ids: [] }),
  update: (model, message) =>
    ListMessage.match(message, {
      UsersChanged: ({ snapshots }) => ({ ...model, users: snapshots }),
      Show: ({ ids }) => ({ ...model, ids })
    }),
  subscriptions: (_model, _props, $) => [
    $.watch({
      users: (snapshots, loaded, changes) => {
        expect(loaded).type.toBe<Component.KeyedLoaded<typeof GetUser>>()
        expect(changes).type.toBe<ReadonlyArray<Component.KeyedChange<typeof GetUser>>>()
        return ListMessage.make({ _tag: "UsersChanged", snapshots, changed: changes.length })
      }
    })
  ],
  view: (_model, h) =>
    h.ul(
      h.loaded.users.map(({ args, result, patched }) =>
        h.li(AsyncResult.isSuccess(result) ? result.value.name + (patched ? "*" : "") : "…").key(args.id)
      )
    )
})

describe("Keyed loader fields", () => {
  it("open to entries with args, result and patched, and get by args", () => {
    type M = Component.Model<typeof List>
    expect<Component.LoaderFields<M>>().type.toBe<"users">()
    expect<Component.KeyedFields<M>>().type.toBe<"users">()
    expect<Component.SingleFields<M>>().type.toBe<never>()
    expect<Component.Requirements<typeof List>>().type.toBe<GetUser>()
    expect<Component.Loaded<M>["users"]>().type.toBe<Component.KeyedLoaded<typeof GetUser>>()
    expect<Component.Loaded<M>["users"][number]["args"]>().type.toBe<{ readonly id: string }>()
    expect<Component.Loaded<M>["users"][number]["result"]>().type.toBe<
      AsyncResult.AsyncResult<typeof User.Type, string>
    >()
    expect<ReturnType<Component.Loaded<M>["users"]["get"]>>().type.toBe<
      Option.Option<Component.KeyedEntry<typeof GetUser>>
    >()
    expect<Parameters<Component.Loaded<M>["users"]["get"]>[0]>().type.toBe<{ readonly id: string }>()
  })

  it("have no previous or patched view", () => {
    type M = Component.Model<typeof List>
    expect<Component.Previous<M>>().type.toBe<{}>()
    expect<Component.Patched<M>>().type.toBe<{}>()
  })

  it("a keyed loader's loaded doesn't have its own field", () => {
    type M = Component.Model<typeof List>
    expect<Parameters<Component.Loaders<M, {}>["users"]>[2]>().type.toBe<Omit<Component.Loaded<M>, "users">>()
    Component.make({
      name: "SelfKeyed",
      model: Schema.Struct({ users: Loader.SnapshotMap(GetUser, "users"), team: Loader.Snapshot(GetTeam, "team") }),
      message: Message,
      loaders: {
        // @ts-expect-error Property 'users' does not exist
        users: (_model, _props, loaded) => loaded.users === undefined ? [] : [{ id: "1" }],
        team: (_model, _props, loaded) => loaded.users.length > 0 ? { id: "1" } : undefined
      },
      init: ($) => $.empty,
      update: (model) => model,
      subscriptions: (_m, _p, $) => [
        $.watch({ users: () => Message.make({ _tag: "Bump" }), team: () => Message.make({ _tag: "Bump" }) })
      ],
      view: () => null as never
    })
  })

  it("take an array of args from the loader, and a handler of three arguments", () => {
    const model = Schema.Struct({ ids: Schema.Array(Schema.String), users: Loader.SnapshotMap(GetUser, "users") })
    const base = {
      name: "Keyed",
      model,
      message: ListMessage,
      init: ($: { readonly empty: { readonly users: Loader.SnapshotMap<typeof GetUser, "users"> } }) => ({
        ...$.empty,
        ids: []
      }),
      update: (m: typeof model.Type) => m,
      view: () => null as never
    }
    Component.make({
      ...base,
      // @ts-expect-error is missing the following properties from type 'readonly { readonly id: string; }[]'
      loaders: { users: (m) => ({ id: m.ids[0] }) },
      subscriptions: (_m, _p, $) => [$.watch({ users: () => ListMessage.make({ _tag: "Show", ids: [] }) })]
    })
    Component.make({
      ...base,
      loaders: { users: (m) => m.ids.map((id) => ({ id })) },
      subscriptions: (_m, _p, $) => [
        $.watch({
          // @ts-expect-error not assignable
          users: (_snapshots, _result: AsyncResult.AsyncResult<unknown, unknown>) =>
            ListMessage.make({ _tag: "Show", ids: [] })
        })
      ]
    })
  })

  it("keep a single and a keyed snapshot apart", () => {
    ListMessage.make({
      _tag: "UsersChanged",
      // @ts-expect-error is missing in type 'Snapshot<typeof GetUser, "users">'
      snapshots: null as unknown as Loader.Snapshot<typeof GetUser, "users">,
      changed: 0
    })
  })

  it("need a read with struct args", () => {
    Loader.SnapshotMap(GetUser, "users")
    // @ts-expect-error the read's args must be a struct
    Loader.SnapshotMap(GetCount, "counts")
  })

  it("take the Story's keyed steps, typed by the read", () => {
    Story.make(List, {}, (s) =>
      s
        .send(ListMessage.make({ _tag: "Show", ids: ["1", "2"] }))
        .loaded("users", { id: "1" }, { id: "1", name: "Ann", teamId: "t" })
        .loadFailed("users", { id: "2" }, "missing", { waiting: true })
        .loadedMany("users", [
          { args: { id: "1" }, value: { id: "1", name: "Ann", teamId: "t" }, patched: true },
          { args: { id: "2" }, error: "missing" }
        ])
        // @ts-expect-error not assignable
        .loaded("users", { id: "1", name: "Ann", teamId: "t" })
        // @ts-expect-error not assignable
        .loadedMany("users", [{ args: { id: 1 }, value: { id: "1", name: "Ann", teamId: "t" } }]))
  })
})

const ChatItem = Schema.Struct({ id: Schema.String, text: Schema.String })
const ChatPage = Schema.Struct({ messages: Schema.Array(ChatItem), next: Schema.NullOr(Schema.Number) })

class ListMessages extends Loader.ListService<ListMessages>()("typetest/ListMessages", {
  args: { room: Schema.String },
  page: ChatPage,
  items: (page) => page.messages,
  key: (message) => message.id,
  error: Schema.String,
  cursor: Schema.Number,
  next: (lastPage) => Option.fromNullishOr(lastPage.next),
  staleTime: "1 minute"
}, Effect.succeed((_args, _cursor) => Effect.succeed({ messages: [], next: null }))) {}

const Messages = Loader.SnapshotList(ListMessages, "messages")
const ChatMessage = Schema.TaggedUnion({ Changed: { snapshot: Messages }, More: {}, Refresh: {} })

const Chat = Component.make({
  name: "Chat",
  props: Schema.Struct({ room: Schema.String }),
  model: Schema.Struct({ messages: Messages, user: Loader.Snapshot(GetUser, "user") }),
  message: ChatMessage,
  elements: Html,
  loaders: { messages: (_model, props) => ({ room: props.room }), user: () => ({ id: "1" }) },
  init: ($) => $.set($.empty),
  update: (model, message, $) =>
    ChatMessage.match(message, {
      Changed: ({ snapshot }) => ({ ...model, messages: snapshot }),
      More: () => $.loadMore("messages"),
      Refresh: () => $.reset("messages")
    }),
  subscriptions: (_model, _props, $) => [
    $.watch({
      messages: (snapshot, loaded) => {
        expect(loaded).type.toBe<
          AsyncResult.AsyncResult<Component.LoadedList<typeof ListMessages>, string>
        >()
        return ChatMessage.make({ _tag: "Changed", snapshot })
      },
      user: () => ChatMessage.make({ _tag: "More" })
    })
  ],
  view: (_model, h) => {
    expect(h.loaded.messages).type.toBe<AsyncResult.AsyncResult<Component.LoadedList<typeof ListMessages>, string>>()
    expect(h.previous.messages).type.toBe<Option.Option<Omit<Component.LoadedList<typeof ListMessages>, "more">>>()
    expect(h.patched.messages).type.toBe<boolean>()
    return h.p("")
  }
})

describe("List fields", () => {
  it("open to items, pages and more", () => {
    expect<Component.LoadedList<typeof ListMessages>>().type.toBe<{
      readonly items: ReadonlyArray<{ readonly id: string; readonly text: string }>
      readonly pages: ReadonlyArray<typeof ChatPage.Type>
      readonly more: Loader.More<string>
    }>()
    expect<Component.ListFields<Component.Model<typeof Chat>>>().type.toBe<"messages">()
  })

  it("keep a list read and a plain read in their own Schema", () => {
    // @ts-expect-error Argument of type 'typeof ListMessages' is not assignable to parameter of type 'never'
    Loader.Snapshot(ListMessages, "messages")
    // @ts-expect-error Argument of type 'typeof ListMessages' is not assignable to parameter of type 'never'
    Loader.SnapshotMap(ListMessages, "messages")
    // @ts-expect-error Argument of type 'typeof GetUser' is not assignable to parameter of type 'Any'
    Loader.SnapshotList(GetUser, "user")
  })

  it("take loadMore and reset for a list field only, and not in init", () => {
    Component.make({
      name: "Chat",
      props: Schema.Struct({ room: Schema.String }),
      model: Schema.Struct({ messages: Messages, user: Loader.Snapshot(GetUser, "user") }),
      message: ChatMessage,
      elements: Html,
      loaders: { messages: (_model, props) => ({ room: props.room }), user: () => ({ id: "1" }) },
      // @ts-expect-error Property 'loadMore' does not exist
      init: ($) => $.set($.empty).loadMore("messages"),
      update: (model, _message, $) =>
        // @ts-expect-error Argument of type '"user"' is not assignable to parameter of type '"messages"'
        $.set(model).loadMore("user"),
      subscriptions: (_model, _props, $) => [
        $.watch({
          messages: (snapshot) => ChatMessage.make({ _tag: "Changed", snapshot }),
          user: () => ChatMessage.make({ _tag: "More" })
        })
      ],
      view: (_model, h) => h.p("")
    })
  })

  it("take the Story's list steps, typed by the page and error", () => {
    const page = { messages: [{ id: "m0", text: "a" }], next: null }
    Story.make(Chat, { room: "r" }, (s) =>
      s
        .loaded("messages", [page])
        .send(ChatMessage.make({ _tag: "More" }))
        .loadedMore("messages", page)
        .send(ChatMessage.make({ _tag: "More" }))
        .loadMoreFailed("messages", "nope")
        // @ts-expect-error Argument of type '"user"' is not assignable to parameter of type '"messages"'
        .loadedMore("user", page)
        // @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'string'
        .loadMoreFailed("messages", 1))
  })
})

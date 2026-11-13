import { Context, Effect, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component, Head } from "effect/ui"
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
  UserChanged: { state: Schema.String, failed: Schema.Boolean },
  TeamChanged: { state: Schema.String },
  Bump: {}
})

const Card = Component.define({
  name: "Card",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ n: Schema.Number }),
  message: Message,
  elements: Html,
  loaders: {
    user: {
      load: GetUser,
      args: (_model, props) => ({ id: props.id }),
      onChange: (result) => {
        expect(result).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
        return Message.make({ _tag: "UserChanged", state: result._tag, failed: AsyncResult.isFailure(result) })
      }
    },
    team: {
      load: GetTeam,
      args: (_model, _props, loaded) => {
        expect(loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
        expect(loaded).type.not.toHaveProperty("team")
        return AsyncResult.isSuccess(loaded.user) ? { id: loaded.user.value.teamId } : undefined
      },
      onChange: (result) => {
        expect(result).type.toBe<AsyncResult.AsyncResult<typeof Team.Type, never>>()
        return Message.make({ _tag: "TeamChanged", state: result._tag })
      }
    }
  }
}).make({
  init: () => ({ n: 0 }),
  update: (model, message, $) => {
    expect($.loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
    expect($.loaded.team).type.toBe<AsyncResult.AsyncResult<typeof Team.Type, never>>()
    return Message.match(message, {
      UserChanged: () => model,
      TeamChanged: () => model,
      Bump: () => ({ ...model, n: model.n + 1 })
    })
  },
  subscriptions: (_model, _props, loaded) => {
    expect(loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
    return []
  },
  head: (_model, _props, loaded) => {
    expect(loaded.team).type.toBe<AsyncResult.AsyncResult<typeof Team.Type, never>>()
    return [Head.title("Card")]
  },
  view: (_model, h) => {
    expect(h.loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
    expect(h.previous.user).type.toBe<Option.Option<typeof User.Type>>()
    expect(h.patched.team).type.toBe<boolean>()
    return AsyncResult.match(h.loaded.user, {
      onInitial: () => h.p(Option.isSome(h.previous.user) ? h.previous.user.value.name : "Loading"),
      onFailure: () => h.p("Missing"),
      onSuccess: ({ value }) =>
        h.p.onClick(Message.make({ _tag: "Bump" })).children(value.name, h.patched.team ? "*" : "")
    })
  }
})

class Api extends Context.Service<Api, { readonly name: (id: string) => Effect.Effect<string> }>()("typetest/Api") {}

class GetName extends Loader.Service<GetName>()(
  "typetest/GetName",
  { args: { id: Schema.String }, success: Schema.String, error: Schema.Never, staleTime: 0 },
  Effect.gen(function*() {
    const api = yield* Api
    return ({ id }) => api.name(id)
  })
) {}

describe("Component loaders", () => {
  it("infers every type from the reads", () => {
    type L = Component.Loaders<typeof Card>
    expect<keyof L>().type.toBe<"user" | "team">()
    expect<Component.SingleNames<L>>().type.toBe<"user" | "team">()
    expect<Component.KeyedNames<L>>().type.toBe<never>()
    expect<Component.ListNames<L>>().type.toBe<never>()
    expect<L>().type.toBe<
      { readonly user: Component.Load<typeof GetUser>; readonly team: Component.Load<typeof GetTeam> }
    >()
    expect<Component.LoadedOf<L["user"]>>().type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
    expect<Component.LoaderHelpers<L>>().type.toBe<{
      readonly loaded: {
        readonly user: AsyncResult.AsyncResult<typeof User.Type, string>
        readonly team: AsyncResult.AsyncResult<typeof Team.Type, never>
      }
      readonly previous: {
        readonly user: Option.Option<typeof User.Type>
        readonly team: Option.Option<typeof Team.Type>
      }
      readonly patched: { readonly user: boolean; readonly team: boolean }
    }>()
    expect<Component.LoaderServices<L>>().type.toBe<GetUser | GetTeam>()
    expect<Component.Requirements<typeof Card>>().type.toBe<GetUser | GetTeam>()
  })

  it("take the loaders from the reads when update's $ is annotated", () => {
    const Annotated = Component.define({
      name: "Annotated",
      model: Schema.Struct({}),
      message: Schema.Never,
      loaders: { name: { load: GetName, args: () => ({ id: "1" }) } }
    }).make({
      init: () => ({}),
      update: (model, _msg, $: Component.Update<{}, never, never, {}>) => $.set(model),
      view: (_model, h) => h.text("")
    })
    expect<Component.Loaders<typeof Annotated>>().type.toBe<{ readonly name: Component.Load<typeof GetName> }>()
    expect<Component.Requirements<typeof Annotated>>().type.toBe<GetName>()
  })

  it("add their reads to the requirements, never what the fetchers use", () => {
    const Named = Component.define({
      name: "Named",
      model: Schema.Struct({}),
      message: Schema.Never,
      loaders: { name: { load: GetName, args: () => ({ id: "1" }) } }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: (_model, h) => h.text(AsyncResult.isSuccess(h.loaded.name) ? h.loaded.name.value : "")
    })
    expect<Component.Requirements<typeof Named>>().type.toBe<GetName>()
    // Provided, the read's layer brings what its fetcher uses.
    const Provided = Named.pipe(Component.provide(GetName.layer))
    expect<Component.Requirements<typeof Provided>>().type.toBe<Api>()
  })

  it("a loader's loaded doesn't have its own name", () => {
    Component.define({
      name: "Self",
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        user: {
          load: GetUser,
          // @ts-expect-error Property 'user' does not exist
          args: (_model, _props, loaded) => AsyncResult.isSuccess(loaded.user) ? { id: "1" } : undefined
        },
        team: {
          load: GetTeam,
          args: (_model, _props, loaded) => AsyncResult.isSuccess(loaded.user) ? { id: "1" } : undefined
        }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
  })

  it("type args and onChange by the read", () => {
    Component.define({
      name: "Typed",
      props: Schema.Struct({ id: Schema.String }),
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        // @ts-expect-error Type 'number' is not assignable to type 'string'
        user: { load: GetUser, args: () => ({ id: 1 }) },
        team: {
          load: GetTeam,
          args: (_model, props) => ({ id: props.id }),
          // @ts-expect-error not assignable
          onChange: (_result: AsyncResult.AsyncResult<string, never>) => Message.make({ _tag: "Bump" })
        }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
    Component.define({
      name: "OnChangeMessage",
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        // @ts-expect-error not assignable
        user: { load: GetUser, args: () => ({ id: "1" }), onChange: () => "not a message" }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
  })
})

describe("debounce", () => {
  it("is an entry option, and types the loader as a plain one, single or keyed", () => {
    Component.define({
      name: "Debounced",
      props: Schema.Struct({ id: Schema.String }),
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        user: {
          load: GetUser,
          debounce: "300 millis",
          args: (_model, props, loaded) => {
            expect(props).type.toBe<{ readonly id: string }>()
            expect(loaded).type.not.toHaveProperty("user")
            return props.id === "" ? undefined : { id: props.id }
          }
        },
        // @ts-expect-error Type 'number' is not assignable to type 'string'
        team: { loadMany: GetTeam, debounce: "300 millis", args: () => [{ id: 1 }] }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
  })

  it("takes a Duration input", () => {
    Component.define({
      name: "BadDebounce",
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        // @ts-expect-error not assignable
        user: { load: GetUser, debounce: "soon", args: () => ({ id: "1" }) }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
  })
})

describe("Story loader steps", () => {
  it("take a loader name and its read's success or error", () => {
    Story.make(Card, { id: "1" }, (s) =>
      s
        .loaded("user", { id: "1", name: "Ann", teamId: "t" })
        .loadFailed("user", "missing")
        .loaded("team", { id: "t", title: "T" }, { waiting: true, patched: true })
        // @ts-expect-error Argument of type '"n"' is not assignable to parameter
        .loaded("n", 1)
        // @ts-expect-error 'title' does not exist
        .loaded("user", { id: "t", title: "T" })
        // @ts-expect-error Argument of type '"missing"' is not assignable to parameter of type 'never'
        .loadFailed("team", "missing")
        // @ts-expect-error Argument of type '"other"' is not assignable
        .loadFailed("other", "missing"))
    const story = Story.make(Card, { id: "1" }, (s) => s.loaded("user", { id: "1", name: "Ann", teamId: "t" }))
    expect(story).type.toBe<
      Story.Story<
        { readonly id: string },
        Component.Model<typeof Card>,
        Component.Message<typeof Card>,
        never,
        {
          readonly user: AsyncResult.AsyncResult<typeof User.Type, string>
          readonly team: AsyncResult.AsyncResult<typeof Team.Type, never>
        }
      >
    >()
    // `loaded()` is typed as `h.loaded` is.
    expect(story.loaded().user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
    expect(story.loaded()).type.not.toHaveProperty("n")
  })

  it("given takes loaded results by loader name", () => {
    Story.make(Card, { id: "1" }, (s) =>
      s
        .given((model) => model, { user: { id: "1", name: "Ann", teamId: "t" }, team: { id: "t", title: "T" } })
        .given((model) => model, { team: { id: "t", title: "T" } })
        // @ts-expect-error 'title' does not exist
        .given((model) => model, { user: { id: "t", title: "T" } })
        // @ts-expect-error 'n' does not exist
        .given((model) => model, { n: 1 }))
  })

  it("fromLog types the replay's props and loaded results", () => {
    const replay = Story.fromLog(Card, [])
    expect(replay.props).type.toBe<{ readonly id: string }>()
    expect(replay.loaded().user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
    expect(replay.loaded()).type.not.toHaveProperty("n")
  })
})

class GetCount extends Loader.Service<GetCount>()(
  "typetest/GetCount",
  { args: Schema.String, success: Schema.Number, error: Schema.Never, staleTime: 0 },
  Effect.succeed(() => Effect.succeed(1))
) {}

const ListMessage = Schema.TaggedUnion({
  UsersChanged: { changed: Schema.Number },
  Show: { ids: Schema.Array(Schema.String) }
})

const List = Component.define({
  name: "List",
  model: Schema.Struct({ ids: Schema.Array(Schema.String), changed: Schema.Number }),
  message: ListMessage,
  elements: Html,
  loaders: {
    users: {
      loadMany: GetUser,
      args: (model) => model.ids.map((id) => ({ id })),
      onChange: (loaded, changes) => {
        expect(loaded).type.toBe<Component.KeyedLoaded<typeof GetUser>>()
        expect(changes).type.toBe<ReadonlyArray<Component.KeyedChange<typeof GetUser>>>()
        return ListMessage.make({ _tag: "UsersChanged", changed: changes.length })
      }
    }
  }
}).make({
  init: () => ({ ids: [], changed: 0 }),
  update: (model, message, $) => {
    expect($.loaded.users).type.toBe<Component.KeyedLoaded<typeof GetUser>>()
    return ListMessage.match(message, {
      UsersChanged: ({ changed }) => ({ ...model, changed }),
      Show: ({ ids }) => ({ ...model, ids })
    })
  },
  view: (_model, h) =>
    h.ul(
      h.loaded.users.map(({ args, result, patched }) =>
        h.li.key(args.id).children(AsyncResult.isSuccess(result) ? result.value.name + (patched ? "*" : "") : "…")
      )
    )
})

describe("Keyed loaders", () => {
  it("open to entries with args, result and patched, and get by args", () => {
    type L = Component.Loaders<typeof List>
    expect<keyof L>().type.toBe<"users">()
    expect<Component.KeyedNames<L>>().type.toBe<"users">()
    expect<Component.SingleNames<L>>().type.toBe<never>()
    expect<Component.ListNames<L>>().type.toBe<never>()
    expect<Component.Requirements<typeof List>>().type.toBe<GetUser>()
    expect<Component.LoadedOf<L["users"]>>().type.toBe<Component.KeyedLoaded<typeof GetUser>>()
    expect<Component.LoadedOf<L["users"]>[number]["args"]>().type.toBe<{ readonly id: string }>()
    expect<Component.LoadedOf<L["users"]>[number]["result"]>().type.toBe<
      AsyncResult.AsyncResult<typeof User.Type, string>
    >()
    expect<ReturnType<Component.LoadedOf<L["users"]>["get"]>>().type.toBe<
      Option.Option<Component.KeyedEntry<typeof GetUser>>
    >()
    expect<Parameters<Component.LoadedOf<L["users"]>["get"]>[0]>().type.toBe<{ readonly id: string }>()
  })

  it("have no previous or patched view", () => {
    type L = Component.Loaders<typeof List>
    expect<Component.LoaderHelpers<L>["previous"]>().type.toBe<{}>()
    expect<Component.LoaderHelpers<L>["patched"]>().type.toBe<{}>()
  })

  it("a keyed loader's loaded doesn't have its own name", () => {
    Component.define({
      name: "SelfKeyed",
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        users: {
          loadMany: GetUser,
          // @ts-expect-error Property 'users' does not exist
          args: (_model, _props, loaded) => loaded.users === undefined ? [] : [{ id: "1" }]
        },
        team: {
          load: GetTeam,
          args: (_model, _props, loaded) => {
            expect(loaded.users).type.toBe<Component.KeyedLoaded<typeof GetUser>>()
            return loaded.users.length > 0 ? { id: "1" } : undefined
          }
        }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
  })

  it("take an array of args from the loader, and an onChange of entries and changes", () => {
    const model = Schema.Struct({ ids: Schema.Array(Schema.String) })
    const base = { name: "Keyed", model, message: ListMessage }
    Component.define({
      ...base,
      // @ts-expect-error is missing the following properties from type 'readonly { readonly id: string; }[]'
      loaders: { users: { loadMany: GetUser, args: (m) => ({ id: m.ids[0] }) } }
    })
    Component.define({
      ...base,
      loaders: {
        users: {
          loadMany: GetUser,
          args: (m) => m.ids.map((id) => ({ id })),
          // @ts-expect-error not assignable
          onChange: (_loaded: AsyncResult.AsyncResult<unknown, unknown>) => ListMessage.make({ _tag: "Show", ids: [] })
        }
      }
    })
  })

  it("keep a single and a keyed loader apart", () => {
    Component.define({
      name: "SingleArray",
      model: Schema.Struct({}),
      message: Message,
      loaders: {
        // @ts-expect-error Property 'id' is missing
        user: { load: GetUser, args: () => [{ id: "1" }] }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
    const Keyed = Component.define({
      name: "Counts",
      model: Schema.Struct({}),
      message: Message,
      loaders: { counts: { loadMany: GetCount, args: () => ["a", "b"] } }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: () => null as never
    })
    expect<Component.LoadedOf<Component.Loaders<typeof Keyed>["counts"]>>().type.toBe<
      Component.KeyedLoaded<typeof GetCount>
    >()
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
        .loadedMany("users", [{ args: { id: 1 }, value: { id: "1", name: "Ann", teamId: "t" } }])
        // @ts-expect-error not assignable
        .loadedMany("others", []))
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

const ChatMessage = Schema.TaggedUnion({ Changed: { count: Schema.Number }, More: {}, Refresh: {} })

const Chat = Component.define({
  name: "Chat",
  props: Schema.Struct({ room: Schema.String }),
  model: Schema.Struct({}),
  message: ChatMessage,
  elements: Html,
  loaders: {
    messages: {
      load: ListMessages,
      args: (_model, props) => ({ room: props.room }),
      onChange: (loaded) => {
        expect(loaded).type.toBe<
          AsyncResult.AsyncResult<Component.LoadedList<typeof ListMessages>, string>
        >()
        return ChatMessage.make({
          _tag: "Changed",
          count: AsyncResult.isSuccess(loaded) ? loaded.value.items.length : 0
        })
      }
    },
    user: { load: GetUser, args: () => ({ id: "1" }) }
  }
}).make({
  init: () => ({}),
  update: (model, message, $) => {
    expect($.loaded.messages).type.toBe<
      AsyncResult.AsyncResult<Component.LoadedList<typeof ListMessages>, string>
    >()
    return ChatMessage.match(message, {
      Changed: () => model,
      More: () => $.loadMore("messages"),
      Refresh: () => $.reset("messages")
    })
  },
  view: (_model, h) => {
    expect(h.loaded.messages).type.toBe<AsyncResult.AsyncResult<Component.LoadedList<typeof ListMessages>, string>>()
    expect(h.previous.messages).type.toBe<Option.Option<Omit<Component.LoadedList<typeof ListMessages>, "more">>>()
    expect(h.patched.messages).type.toBe<boolean>()
    return h.p("")
  }
})

describe("List loaders", () => {
  it("open to items, pages and more", () => {
    expect<Component.LoadedList<typeof ListMessages>>().type.toBe<{
      readonly items: ReadonlyArray<{ readonly id: string; readonly text: string }>
      readonly pages: ReadonlyArray<typeof ChatPage.Type>
      readonly more: Loader.More<string>
    }>()
    type L = Component.Loaders<typeof Chat>
    expect<Component.ListNames<L>>().type.toBe<"messages">()
    expect<Component.SingleNames<L>>().type.toBe<"messages" | "user">()
    expect<Component.KeyedNames<L>>().type.toBe<never>()
    expect<Component.Requirements<typeof Chat>>().type.toBe<ListMessages | GetUser>()
  })

  it("take loadMore and reset for a list loader only, and not in init", () => {
    Component.define({
      name: "Chat",
      props: Schema.Struct({ room: Schema.String }),
      model: Schema.Struct({}),
      message: ChatMessage,
      elements: Html,
      loaders: {
        messages: { load: ListMessages, args: (_model, props) => ({ room: props.room }) },
        user: { load: GetUser, args: () => ({ id: "1" }) }
      }
    }).make({
      // @ts-expect-error Property 'loadMore' does not exist
      init: ($) => $.set({}).loadMore("messages"),
      update: (model, message, $) =>
        ChatMessage.match(message, {
          // @ts-expect-error Argument of type '"user"' is not assignable to parameter of type '"messages"'
          Changed: () => $.set(model).loadMore("user"),
          // @ts-expect-error Argument of type '"missing"' is not assignable to parameter of type '"messages"'
          More: () => $.set(model).loadMore("missing"),
          // @ts-expect-error Argument of type '"user"' is not assignable to parameter of type '"messages"'
          Refresh: () => $.set(model).reset("user")
        }),
      view: (_model, h) => h.p("")
    })
    Component.define({
      name: "Reset",
      model: Schema.Struct({}),
      message: ChatMessage,
      loaders: { messages: { load: ListMessages, args: () => ({ room: "r" }) } }
    }).make({
      init: () => ({}),
      // @ts-expect-error Argument of type '"missing"' is not assignable to parameter of type '"messages"'
      update: (_model, _message, $) => $.reset("missing"),
      view: (_model, h) => h.text("")
    })
  })

  it("keep a list read under load, and one of load and loadMany", () => {
    Component.define({
      name: "ListMany",
      model: Schema.Struct({}),
      message: ChatMessage,
      loaders: {
        // @ts-expect-error a list read takes load, not loadMany
        messages: { loadMany: ListMessages, args: () => [{ room: "r" }] }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: (_model, h) => h.text("")
    })
    Component.define({
      name: "Both",
      model: Schema.Struct({}),
      message: ChatMessage,
      loaders: {
        // @ts-expect-error an entry takes one of load and loadMany
        user: { load: GetUser, loadMany: GetUser, args: () => [{ id: "1" }] }
      }
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: (_model, h) => h.text("")
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
        // @ts-expect-error Argument of type '"missing"' is not assignable to parameter of type '"messages"'
        .loadMoreFailed("missing", "nope")
        // @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'string'
        .loadMoreFailed("messages", 1))
  })
})

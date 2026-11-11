import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Option, Redacted, Request, RequestResolver, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, MessageLog, Route, Router } from "effect/ui"
import { Query, Story, TestHost } from "effect/ui/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

interface FetchUser extends Request.Request<typeof User.Type, string> {
  readonly _tag: "FetchUser"
  readonly id: string
}
const FetchUser = Request.tagged<FetchUser>("FetchUser")

/**
 * A fresh read, mutation and components per test: the db is closed over. The
 * read fetches through a batching resolver whose `runAll` takes 10 ms.
 */
const makeApp = (options?: {
  readonly interval?: boolean
  /** The resolver's batch window, longer than its default of one yield. */
  readonly delay?: "50 millis"
  /** `update` ignores a message with no changes: a prune. */
  readonly ignorePrunes?: boolean
}) => {
  const db = { calls: 0, batches: [] as Array<number>, names: new Map([["1", "Ann"], ["2", "Bea"], ["3", "Cy"]]) }
  const order: Array<string> = []
  let loaderRuns = 0

  const batching = RequestResolver.make<FetchUser>((entries) =>
    Effect.sleep("10 millis").pipe(Effect.andThen(Effect.sync(() => {
      db.batches.push(entries.length)
      for (const entry of entries) {
        db.calls++
        const name = db.names.get(entry.request.id)
        entry.completeUnsafe(
          entry.request.id === "boom"
            ? Exit.die("kaboom")
            : name === undefined
            ? Exit.fail("missing")
            : Exit.succeed({ id: entry.request.id, name })
        )
      }
    })))
  )
  const resolver = options?.delay === undefined ? batching : RequestResolver.setDelay(batching, options.delay)

  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: { id: Schema.String },
      success: User,
      error: Schema.String,
      staleTime: "30 seconds",
      refetchInterval: options?.interval === true ? "5 seconds" : undefined
    },
    Effect.succeed(({ id }) => Effect.request(FetchUser({ id }), resolver))
  ) {}

  class RenameUser extends Command.Service<RenameUser>()(
    "users/RenameUser",
    {
      args: { id: Schema.String, name: Schema.String },
      invalidates: ({ id }) => [GetUser.entry({ id })],
      optimistic: ({ id, name }) => [GetUser.patch({ id }, (user) => ({ ...user, name }))]
    },
    Effect.succeed(({ id, name }: { readonly id: string; readonly name: string }) =>
      Effect.gen(function*() {
        yield* Effect.sleep("10 millis")
        db.names.set(id, name)
      })
    )
  ) {}

  const Users = Loader.SnapshotMap(GetUser, "users")
  const BoardMessage = Schema.TaggedUnion({
    Show: { ids: Schema.Array(Schema.String) },
    UsersChanged: { users: Users, changed: Schema.Array(Schema.String) },
    Rename: { id: Schema.String, name: Schema.String },
    Renamed: {}
  })
  const show = (result: AsyncResult.AsyncResult<typeof User.Type, string>) =>
    AsyncResult.match(result, {
      onInitial: () => "…",
      onSuccess: (success) => success.value.name + (success.waiting ? "…" : ""),
      onFailure: () => "failed"
    })
  const Board = Component.make({
    name: "Board",
    props: Schema.Struct({ tag: Schema.String, ids: Schema.Array(Schema.String) }),
    model: Schema.Struct({ ids: Schema.Array(Schema.String), users: Users }),
    message: BoardMessage,
    loaders: {
      users: (model) => {
        loaderRuns++
        return model.ids.map((id) => ({ id }))
      }
    },
    init: ($) => ({ ...$.empty, ids: $.props.ids }),
    update: (model, message, $) =>
      BoardMessage.match(message, {
        Show: ({ ids }) => ({ ...model, ids }),
        UsersChanged: ({ users, changed }) => {
          order.push(`update ${$.props.tag} [${changed.join(",")}]`)
          return options?.ignorePrunes === true && changed.length === 0 ? model : { ...model, users }
        },
        Rename: ({ id, name }) => {
          order.push(`update ${$.props.tag} Rename`)
          return $.set(model).run(
            RenameUser.make({ id, name }).pipe(Command.map(() => BoardMessage.make({ _tag: "Renamed" })))
          )
        },
        Renamed: () => model
      }),
    subscriptions: (_model, _props, watch) => [
      watch({
        users: (users, loaded, changes) => {
          // The opened array is the collection at the loader's keys.
          assert.strictEqual(loaded.length, new Set(loaded.map((entry) => entry.args.id)).size)
          return BoardMessage.make({
            _tag: "UsersChanged",
            users,
            changed: changes.map((change) => `${change.args.id}:${show(change.result)}`)
          })
        }
      })
    ],
    view: (_model, h) => {
      const text = h.loaded.users.map(({ args, result, patched }) => `${args.id}=${show(result)}${patched ? "~" : ""}`)
        .join(" ")
      order.push(`view ${h.props.tag} ${text}`)
      return h.el("p", `${h.props.tag}: ${text}`).on(
        "click",
        BoardMessage.make({ _tag: "Rename", id: "1", name: `Bob${h.props.tag}` })
      )
    }
  })

  /** Boards side by side: "tag:id,id" each. */
  const ListMessage = Schema.TaggedUnion({ Set: { boards: Schema.Array(Schema.String) } })
  const List = Component.make({
    name: "List",
    props: Schema.Struct({ boards: Schema.Array(Schema.String) }),
    model: Schema.Array(Schema.String),
    message: ListMessage,
    init: ($) => $.props.boards,
    update: (_model, message) => message.boards,
    view: (boards, h) =>
      h.el(
        "div",
        boards.map((board) => {
          const [tag, ids] = board.split(":")
          return h.child(Board, { key: tag, props: { tag, ids: ids.split(",") } })
        })
      )
  })

  return {
    db,
    order,
    loaderRuns: () => loaderRuns,
    GetUser,
    Users,
    BoardMessage,
    Board,
    List,
    layer: RenameUser.layer.pipe(Layer.provideMerge(GetUser.layer))
  }
}

const run = <A, E>(layer: Layer.Layer<any>, effect: Effect.Effect<A, E, any>) =>
  effect.pipe(Effect.provide(layer), Effect.scoped, Effect.provide(TestHost.layer())) as Effect.Effect<A, E>

/** Starts what is due and lets the fetches finish: each batch takes 10 ms. */
const load = TestHost.settle.pipe(Effect.andThen(TestClock.adjust("10 millis")), Effect.andThen(TestHost.settle))

/** A keyed field's tuples as its JSON codec writes them. */
const tuples = <A>(schema: Schema.Codec<A>, value: A): ReadonlyArray<ReadonlyArray<unknown>> =>
  Schema.encodeSync(Schema.toCodecJson(schema))(value) as ReadonlyArray<ReadonlyArray<unknown>>

const updates = (order: ReadonlyArray<string>) => order.filter((line) => line.startsWith("update"))

describe("Keyed loader fields", () => {
  it.effect("N cold keys start N fetches in one batch, and its results are one message with N changes", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "3"] })
        assert.strictEqual(root.text(), "a: 1=… 2=… 3=…")
        yield* load
        assert.strictEqual(root.text(), "a: 1=Ann 2=Bea 3=Cy")
        assert.deepStrictEqual(updates(app.order), ["update a [1:Ann,2:Bea,3:Cy]"])
        assert.deepStrictEqual(root.fetches().map((fetch) => [fetch.logKey, fetch.trigger]), [
          ["{\"id\":\"1\"}", "watch"],
          ["{\"id\":\"2\"}", "watch"],
          ["{\"id\":\"3\"}", "watch"]
        ])
        assert.deepStrictEqual(app.db.batches, [3])
        assert.strictEqual(root.entry(app.GetUser, { id: "2" })?.watchers, 1)
        // One Subscription key per unique key.
        assert.deepStrictEqual(
          root.log().flatMap((entry) => entry._tag === "SubscriptionStarted" ? [entry.key] : []),
          ["1", "2", "3"].map((id) => `~loaded/users:${JSON.stringify(JSON.stringify({ id }))}`)
        )
      })
    )
  })

  it.effect("a typed failure for one key in a batch is one entry of the one message", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "9", "3"] })
        yield* load
        assert.strictEqual(root.text(), "a: 1=Ann 9=failed 3=Cy")
        assert.deepStrictEqual(updates(app.order), ["update a [1:Ann,9:failed,3:Cy]"])
      })
    )
  })

  it.effect("a mount over N warm keys folds one message with N changes before the first render", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { boards: ["a:1,2"] })
        yield* load
        app.order.length = 0
        const before = root.frames().length
        yield* Effect.sync(() => root.send(app.List.message.make({ _tag: "Set", boards: ["a:1,2", "b:2,1,2"] })))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), ["update b [2:Bea,1:Ann]"])
        assert.deepStrictEqual(root.frames().slice(before), ["a: 1=Ann 2=Beab: 2=Bea 1=Ann"])
        assert.strictEqual(app.db.calls, 2)
      })
    )
  })

  it.effect("each keyed loader runs once per Model change", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2"] })
        // The first Model: its watch and its view share one run.
        assert.strictEqual(app.loaderRuns(), 1)
        yield* load
        // The message's Model: one more.
        assert.strictEqual(app.loaderRuns(), 2)
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["2"] }))
        yield* TestHost.settle
        // `Show`'s Model, then the prune message's.
        assert.strictEqual(app.loaderRuns(), 4)
      })
    )
  })

  it.effect("the prune message: a removed key leaves the collection, with no changes", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "3"] })
        yield* load
        app.order.length = 0
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["1", "3"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), ["update a []"])
        const model = root.model() as { readonly users: typeof app.Users.Type }
        assert.deepStrictEqual(tuples(app.Users, model.users).map((tuple) => tuple[0]), [
          "{\"id\":\"1\"}",
          "{\"id\":\"3\"}"
        ])
        assert.strictEqual(root.entry(app.GetUser, { id: "2" })?.watchers, 0)
        assert.strictEqual(root.text(), "a: 1=Ann 3=Cy")
      })
    )
  })

  it.effect("an ignored prune isn't sent again until the key set changes", () => {
    const app = makeApp({ ignorePrunes: true })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "3"] })
        yield* load
        app.order.length = 0
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["1", "3"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), ["update a []"])
        // The Model still holds key 2; the view follows the loader.
        const model = root.model() as { readonly users: typeof app.Users.Type }
        assert.strictEqual(tuples(app.Users, model.users).length, 3)
        assert.strictEqual(root.text(), "a: 1=Ann 3=Cy")
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["3", "1"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), ["update a []"])
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["1"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), ["update a []", "update a []"])
      })
    )
  })

  it.effect("a reorder or an added duplicate sends nothing, and the view follows the loader's order", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "3"] })
        yield* load
        app.order.length = 0
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["3", "1", "2", "1"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), [])
        assert.strictEqual(root.text(), "a: 3=Cy 1=Ann 2=Bea")
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
      })
    )
  })

  it.effect("an added warm key is the only change, and an added cold key sends nothing until it loads", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "3"] })
        yield* load
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["1", "2"] }))
        yield* TestHost.settle
        app.order.length = 0
        // 3 is still cached: warm.
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["1", "2", "3"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), ["update a [3:Cy]"])
        app.order.length = 0
        app.db.names.set("4", "Di")
        root.send(app.BoardMessage.make({ _tag: "Show", ids: ["1", "2", "3", "4"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(updates(app.order), [])
        assert.strictEqual(root.text(), "a: 1=Ann 2=Bea 3=Cy 4=…")
        yield* load
        assert.deepStrictEqual(updates(app.order), ["update a [4:Di]"])
      })
    )
  })

  it.effect("refetchInterval: each of N keys refetches on its own timer, and sends its own message", () => {
    const app = makeApp({ interval: true })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "3"] })
        yield* load
        app.order.length = 0
        app.db.names.set("1", "Ann2")
        app.db.names.set("3", "Cy2")
        yield* TestClock.adjust("5 seconds")
        yield* load
        assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), [
          "watch",
          "watch",
          "watch",
          "interval",
          "interval",
          "interval"
        ])
        assert.strictEqual(root.text(), "a: 1=Ann2 2=Bea 3=Cy2")
        // Each key's timer is its own clock wake: its refetch is its own batch, and its waiting value
        // and its result are their own flushes and messages. Only results that land in one flush share one.
        assert.deepStrictEqual(app.db.batches, [3, 1, 1, 1])
        assert.deepStrictEqual(updates(app.order), [
          "update a [1:Ann…]",
          "update a [2:Bea…]",
          "update a [3:Cy…]",
          "update a [1:Ann2]",
          "update a [2:Bea]",
          "update a [3:Cy2]"
        ])
      })
    )
  })

  it.effect("a resolver with a longer delay batches the N cold keys of one pass into one runAll and one message", () => {
    const app = makeApp({ delay: "50 millis" })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "2", "9"] })
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        assert.strictEqual(root.text(), "a: 1=… 2=… 9=…")
        assert.deepStrictEqual(app.db.batches, [])
        yield* TestClock.adjust("40 millis")
        // The window has closed: one runAll of three is running.
        assert.deepStrictEqual(app.db.batches, [])
        yield* load
        assert.deepStrictEqual(app.db.batches, [3])
        // Three FetchStarted for one request.
        assert.strictEqual(root.fetches().length, 3)
        assert.strictEqual(root.text(), "a: 1=Ann 2=Bea 9=failed")
        assert.deepStrictEqual(updates(app.order), ["update a [1:Ann,2:Bea,9:failed]"])
      })
    )
  })

  it.effect("an optimistic patch on one key reaches a second keyed field before the flush that renders the issuing update", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { boards: ["a:1,2", "b:2,1"] })
        yield* load
        app.order.length = 0
        const before = root.frames().length
        Query.fire(root.get(Query.text("a: 1=Ann 2=Bea", { exact: true })), "click")
        yield* TestHost.settle
        assert.deepStrictEqual(app.order, [
          "update a Rename",
          "update a [1:Boba]",
          "update b [1:Boba]",
          "view a 1=Boba~ 2=Bea",
          "view b 2=Bea 1=Boba~"
        ])
        // One frame, with both fields patched.
        assert.deepStrictEqual(root.frames().slice(before), ["a: 1=Boba~ 2=Beab: 2=Bea 1=Boba~"])
      })
    )
  })

  it.effect("two patches issued before one flush are one message per field, in that flush's frame", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { boards: ["a:1,2", "b:2,1"] })
        yield* load
        app.order.length = 0
        const before = root.frames().length
        Query.fire(root.get(Query.text("a: 1=Ann 2=Bea", { exact: true })), "click")
        Query.fire(root.get(Query.text("b: 2=Bea 1=Ann", { exact: true })), "click")
        yield* TestHost.settle
        assert.deepStrictEqual(app.order, [
          "update a Rename",
          "update b Rename",
          "update a [1:Bobb]",
          "update b [1:Bobb]",
          "view a 1=Bobb~ 2=Bea",
          "view b 2=Bea 1=Bobb~"
        ])
        assert.deepStrictEqual(root.frames().slice(before), ["a: 1=Bobb~ 2=Beab: 2=Bea 1=Bobb~"])
      })
    )
  })

  it.effect("a single field over a key of the batch doesn't split the keyed field's message", () => {
    const app = makeApp()
    const Message = Schema.TaggedUnion({
      UsersChanged: { users: app.Users, changed: Schema.Array(Schema.String) },
      UserChanged: { user: Loader.Snapshot(app.GetUser, "user") }
    })
    const changed: Array<ReadonlyArray<string>> = []
    const Mixed = Component.make({
      name: "Mixed",
      model: Schema.Struct({ users: app.Users, user: Loader.Snapshot(app.GetUser, "user") }),
      message: Message,
      loaders: { users: () => [{ id: "1" }, { id: "2" }, { id: "3" }], user: () => ({ id: "1" }) },
      init: ($) => $.empty,
      update: (model, message) =>
        Message.match(message, {
          UsersChanged: ({ users, changed: keys }) => {
            changed.push(keys)
            return { ...model, users }
          },
          UserChanged: ({ user }) => ({ ...model, user })
        }),
      subscriptions: (_model, _props, watch) => [
        watch({
          users: (users, _loaded, changes) =>
            Message.make({ _tag: "UsersChanged", users, changed: changes.map((change) => change.args.id) }),
          user: (user) => Message.make({ _tag: "UserChanged", user })
        })
      ],
      view: (_model, h) =>
        h.el("p", h.loaded.users.map(({ result }) => AsyncResult.isSuccess(result) ? "y" : "n").join(""))
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Mixed, {})
        yield* load
        assert.deepStrictEqual(app.db.batches, [3])
        assert.deepStrictEqual(changed, [["1", "2", "3"]])
        assert.strictEqual(root.text(), "yyy")
      })
    )
  })

  it.effect("a defect on one key fails the instance holding the field, and not one sharing its batch", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { boards: ["a:1,boom", "b:1,2"] })
        yield* load
        assert.deepStrictEqual(app.db.batches, [3])
        assert.strictEqual(root.text(), "b: 1=Ann 2=Bea")
        const failed = root.log().find((entry): entry is MessageLog.Failed => entry._tag === "Failed")
        assert.deepStrictEqual([failed?.path, failed?.source, failed?.name], [
          "/List/Board[a]",
          "subscription",
          `~loaded/users:${JSON.stringify(JSON.stringify({ id: "boom" }))}`
        ])
      })
    )
  })

  it.effect("an empty array is disabled: no fetch, no message, and an empty view", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: [] })
        yield* load
        assert.strictEqual(root.text(), "a: ")
        assert.deepStrictEqual(root.fetches(), [])
        assert.deepStrictEqual(updates(app.order), [])
      })
    )
  })

  it.effect("get finds one entry by its args", () => {
    const app = makeApp()
    const Probe = Component.make({
      name: "Probe",
      model: Schema.Struct({ users: app.Users }),
      message: app.BoardMessage,
      loaders: { users: () => [{ id: "2" }, { id: "1" }] },
      init: ($) => $.empty,
      update: (model, message) => message._tag === "UsersChanged" ? { users: message.users } : model,
      subscriptions: (_model, _props, watch) => [
        watch({ users: (users) => app.BoardMessage.make({ _tag: "UsersChanged", users, changed: [] }) })
      ],
      view: (_model, h) => {
        const one = h.loaded.users.get({ id: "1" })
        const name = Option.match(one, {
          onNone: () => "none",
          onSome: ({ result }) => AsyncResult.isSuccess(result) ? result.value.name : "…"
        })
        return h.el("p", `${name} ${Option.isNone(h.loaded.users.get({ id: "3" }))}`)
      }
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Probe, {})
        assert.strictEqual(root.text(), "… true")
        yield* load
        assert.strictEqual(root.text(), "Ann true")
      })
    )
  })
})

describe("Loader.SnapshotMap", () => {
  it.effect("encodes to the single form's tuples, and a duplicate args key fails to decode", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Board, { tag: "a", ids: ["1", "9"] })
        yield* load
        const codec = Schema.toCodecJson(app.Users)
        const users = (root.model() as { readonly users: typeof app.Users.Type }).users
        const encoded = Schema.encodeSync(codec)(users) as ReadonlyArray<unknown>
        assert.deepStrictEqual(encoded, [
          ["{\"id\":\"1\"}", 0, { id: "1", name: "Ann" }, 10, false],
          ["{\"id\":\"9\"}", 1, ["missing"], null]
        ])
        assert.isTrue(Exit.isSuccess(Schema.decodeUnknownExit(codec)(encoded)))
        assert.isTrue(Exit.isFailure(Schema.decodeUnknownExit(codec)([encoded[0], encoded[0]])))
        assert.isTrue(Exit.isFailure(Schema.decodeUnknownExit(codec)([[]])))
      })
    )
  })

  it("throws at make for a keyed field whose label isn't its name, or nested", () => {
    const app = makeApp()
    assert.throws(
      () =>
        Component.make({
          name: "Bad",
          model: Schema.Struct({ people: Loader.SnapshotMap(app.GetUser, "users") }),
          message: Schema.Never,
          loaders: { people: () => [] },
          init: ($: any) => $.empty,
          update: (model: unknown) => model,
          subscriptions: (_m: unknown, _p: unknown, watch: any) => [watch({ people: () => undefined })],
          view: () => null as never
        } as any),
      /write Loader.SnapshotMap\(read, "people"\)/
    )
    assert.throws(
      () =>
        Component.make({
          name: "Nested",
          model: Schema.Struct({ inner: Schema.Struct({ users: Loader.SnapshotMap(app.GetUser, "users") }) }),
          message: Schema.Never,
          init: () => ({}),
          update: (model: unknown) => model,
          view: () => null as never
        } as any),
      /holds Loader.SnapshotMap\("users\/GetUser", "users"\) below its top level/
    )
  })
})

describe("Keyed redaction", () => {
  it.effect("Schema.Redacted in a keyed read's args and success: the log is redacted, the Model is not", () => {
    const Account = Schema.Struct({ secret: Schema.Redacted(Schema.String) })
    class GetAccount extends Loader.Service<GetAccount>()(
      "accounts/GetAccount",
      {
        args: { token: Schema.Redacted(Schema.String) },
        success: Account,
        error: Schema.Never,
        staleTime: "30 seconds"
      },
      Effect.succeed(({ token }) => Effect.succeed({ secret: Redacted.make(`secret-of-${Redacted.value(token)}`) }))
    ) {}
    const Accounts = Loader.SnapshotMap(GetAccount, "accounts")
    const Message = Schema.TaggedUnion({ Changed: { accounts: Accounts } })
    const Page = Component.make({
      name: "Page",
      props: Schema.Struct({ tokens: Schema.Array(Schema.Redacted(Schema.String)) }),
      model: Schema.Struct({ accounts: Accounts }),
      message: Message,
      loaders: { accounts: (_model, props) => props.tokens.map((token) => ({ token })) },
      init: ($) => $.empty,
      update: (_model, message) => ({ accounts: message.accounts }),
      subscriptions: (
        _model,
        _props,
        watch
      ) => [watch({ accounts: (accounts) => Message.make({ _tag: "Changed", accounts }) })],
      view: (_model, h) =>
        h.el(
          "p",
          h.loaded.accounts.map(({ result }) =>
            AsyncResult.isSuccess(result) ? Redacted.value(result.value.secret) : "…"
          )
            .join(" ")
        )
    })
    return run(
      GetAccount.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Page, { tokens: [Redacted.make("tok-1"), Redacted.make("tok-2")] })
        yield* TestHost.settle
        assert.strictEqual(root.text(), "secret-of-tok-1 secret-of-tok-2")
        const state = JSON.stringify(Schema.encodeUnknownSync(Schema.toCodecJson(Page.model))(root.model()))
        assert.include(state, "tok-2")
        assert.include(state, "secret-of-tok-2")
        const wire = JSON.stringify(root.log().map((entry) => MessageLog.makeEncoder().encode(entry)))
        assert.notInclude(wire, "tok-")
        assert.notInclude(wire, "secret-of")
        assert.include(wire, "SubscriptionStarted")
        assert.notInclude(TestHost.formatLog(root.log()), "tok-")
      })
    )
  })
})

describe("Story keyed steps", () => {
  it("loads keys one at a time or many in one message, and sends the prune message itself", () => {
    const app = makeApp()
    Story.make(app.Board, { tag: "a", ids: ["1", "2"] }, (s) =>
      s
        .loadedMany("users", [{ args: { id: "1" }, value: { id: "1", name: "Ann" } }, {
          args: { id: "2" },
          error: "gone"
        }])
        .check((story) => assert.strictEqual(Query.textOf(story.get(Query.tag("p"))), "a: 1=Ann 2=failed"))
        .loaded("users", { id: "2" }, { id: "2", name: "Bea" }, { patched: true })
        .check((story) => assert.strictEqual(Query.textOf(story.get(Query.tag("p"))), "a: 1=Ann 2=Bea~"))
        .loadFailed("users", { id: "1" }, "gone", { waiting: true })
        .check((story) => {
          const users = (story.model as { readonly users: typeof app.Users.Type }).users
          const [ann] = tuples(app.Users, users)
          // The failure keeps the key's last Success.
          assert.deepStrictEqual(ann, ["{\"id\":\"1\"}", 1, ["gone"], [{ id: "1", name: "Ann" }, 0]])
        })
        .send(app.BoardMessage.make({ _tag: "Show", ids: ["2"] }))
        .check((story) => {
          const users = (story.model as { readonly users: typeof app.Users.Type }).users
          assert.deepStrictEqual(tuples(app.Users, users).map((tuple) => tuple[0]), [
            "{\"id\":\"2\"}"
          ])
        }))
    assert.deepStrictEqual(updates(app.order), [
      "update a [1:Ann,2:failed]",
      "update a [2:Bea]",
      "update a [1:failed]",
      "update a []"
    ])
    assert.throws(
      () =>
        Story.make(app.Board, { tag: "a", ids: ["1"] }, (s) => s.loaded("users", { id: "5" }, { id: "5", name: "E" })),
      /doesn't return the args/
    )
  })

  it("sends an ignored prune once per key set, as the runtime does", () => {
    const app = makeApp({ ignorePrunes: true })
    Story.make(app.Board, { tag: "a", ids: ["1", "2", "3"] }, (s) =>
      s
        .loadedMany("users", [
          { args: { id: "1" }, value: { id: "1", name: "Ann" } },
          { args: { id: "2" }, value: { id: "2", name: "Bea" } },
          { args: { id: "3" }, value: { id: "3", name: "Cy" } }
        ])
        .send(app.BoardMessage.make({ _tag: "Show", ids: ["1", "3"] }))
        .send(app.BoardMessage.make({ _tag: "Show", ids: ["3", "1"] }))
        .loaded("users", { id: "1" }, { id: "1", name: "Al" })
        .send(app.BoardMessage.make({ _tag: "Show", ids: ["1"] })))
    assert.deepStrictEqual(updates(app.order), [
      "update a [1:Ann,2:Bea,3:Cy]",
      "update a []",
      "update a [1:Al]",
      "update a []"
    ])
  })
})

describe("Keyed history restore", () => {
  it.effect("drops each tuple taken under a patch and seeds the rest, stale", () => {
    const app = makeApp()
    const ShellRoute = Route.union({ Home: Route.make("/"), Board: Route.make("/board") })
    const ShellMessage = Schema.TaggedUnion({
      ChangedRoute: { route: ShellRoute },
      Go: { route: ShellRoute },
      Navigated: {}
    })
    const Shell = Component.make({
      name: "Shell",
      props: Schema.Struct({ route: ShellRoute }),
      model: ShellRoute,
      message: ShellMessage,
      init: ($) => $.props.route,
      update: (model, message, $) =>
        ShellMessage.match(message, {
          ChangedRoute: ({ route }) => route,
          Go: ({ route }) =>
            $.set(model).run(
              Router.push(ShellRoute, route).pipe(Command.map(() => ShellMessage.make({ _tag: "Navigated" })))
            ),
          Navigated: () => model
        }),
      subscriptions: (model) => [
        Router.subscription(ShellRoute, model, (route) => ShellMessage.make({ _tag: "ChangedRoute", route }))
      ],
      view: (model, h) =>
        h.el(
          "div",
          h.el("button", "Home").on(
            "click",
            ShellMessage.make({ _tag: "Go", route: ShellRoute.make({ _tag: "Home" }) })
          ),
          model._tag === "Board"
            ? h.child(app.Board, { key: "board", props: { tag: "a", ids: ["1", "2"] } })
            : h.el("p", "home")
        )
    })
    const history = Router.memoryHistory("/board")
    const mount = Effect.flatMap(Router.currentRoute(ShellRoute), (route) => TestHost.mount(Shell, { route }))
    const hosted = (router: Layer.Layer<Router.Services>, effect: Effect.Effect<void, unknown, any>) =>
      effect.pipe(Effect.provide(Layer.merge(router, app.layer)), Effect.scoped, Effect.provide(TestHost.layer()))
    return Effect.gen(function*() {
      yield* hosted(
        Router.make({ routes: ShellRoute, history }),
        Effect.gen(function*() {
          const root = yield* mount
          yield* load
          // The rename never finishes, so its patch on key 1 is live when the push snapshots the page.
          Query.fire(root.get(Query.text("a: 1=Ann 2=Bea", { exact: true })), "click")
          yield* TestHost.settle
          assert.isTrue(root.text().includes("1=Boba~"))
          Query.fire(root.get(Query.text("Home", { exact: true })), "click")
          yield* TestHost.settle
        })
      )
      const calls = app.db.calls
      yield* hosted(
        Router.make({ routes: ShellRoute, history }),
        Effect.gen(function*() {
          const root = yield* mount
          yield* TestHost.settle
          history.go(-1)
          yield* TestHost.settle
          const restored = root.log().find((entry): entry is MessageLog.Mounted =>
            entry._tag === "Mounted" && entry.path === "/Shell/Board[board]"
          )
          assert.isTrue(restored?.adopted)
          const model = restored!.model as { readonly users: typeof app.Users.Type }
          assert.deepStrictEqual(tuples(app.Users, model.users).map((tuple) => tuple[0]), ["{\"id\":\"2\"}"])
          // Key 2 is seeded stale and shows while it refetches; key 1 starts from loading.
          assert.isTrue(root.text().includes("a: 1=… 2=Bea…"))
          yield* load
          assert.isTrue(root.text().includes("a: 1=Ann 2=Bea"))
          assert.strictEqual(app.db.calls - calls, 2)
        })
      )
    })
  })
})

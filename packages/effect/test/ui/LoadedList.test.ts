import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Layer, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, MessageLog, Route, Router } from "effect/ui"
import { Html, HtmlServer } from "effect/ui/html"
import { Query, Story, TestHost } from "effect/ui/testing"

const Message = Schema.Struct({ id: Schema.String, text: Schema.String })
const Page = Schema.Struct({ messages: Schema.Array(Message), next: Schema.NullOr(Schema.Number) })

/** A room of `db.length` pages, 10 ms each. Every page after the first repeats the first message. */
const makeApp = () => {
  const db = { length: 3, delay: 10, fail: new Set<number>() }
  class ListMessages extends Loader.ListService<ListMessages>()(
    "chat/ListMessages",
    {
      args: { room: Schema.String },
      page: Page,
      items: (page) => page.messages,
      key: (message) => message.id,
      error: Schema.String,
      cursor: Schema.Number,
      next: (lastPage) => Option.fromNullishOr(lastPage.next),
      staleTime: "30 seconds"
    },
    Effect.succeed(({ room }, cursor) =>
      Effect.gen(function*() {
        const index = Option.getOrElse(cursor, () => 0)
        if (db.delay > 0) yield* Effect.sleep(db.delay)
        if (db.fail.has(index)) return yield* Effect.fail("nope")
        const messages = [{ id: "m" + index, text: room + index }]
        return {
          messages: index === 0 ? messages : [{ id: "m0", text: "again" }, ...messages],
          next: index + 1 < db.length ? index + 1 : null
        }
      })
    )
  ) {}

  const ChatMessage = Schema.TaggedUnion({ Changed: {}, More: {}, Refresh: {} })
  const Chat = Component.make({
    name: "Chat",
    props: Schema.Struct({ room: Schema.String }),
    model: Schema.Struct({}),
    message: ChatMessage,
    elements: Html,
    loaders: {
      messages: {
        load: ListMessages,
        args: (_model, props) => props.room === "" ? undefined : { room: props.room },
        onChange: () => ChatMessage.make({ _tag: "Changed" })
      }
    },
    init: () => ({}),
    update: (model, message, $) =>
      ChatMessage.match(message, {
        // On the server, a load more is dropped and reported.
        Changed: () => $.props.room === "ssr" ? $.loadMore("messages") : model,
        More: () => $.loadMore("messages"),
        Refresh: () => $.reset("messages")
      }),
    view: (_model, h) =>
      h.el("p").on("click", ChatMessage.make({ _tag: "More" })).children(
        AsyncResult.match(h.loaded.messages, {
          onInitial: () => "loading",
          onFailure: () => "failed",
          onSuccess: ({ value: { items, more, pages } }) =>
            items.map((message) => message.text).join(",") + " /" + pages.length + " " + more._tag
        })
      )
  })
  return { db, ListMessages, ChatMessage, Chat, layer: ListMessages.layer }
}

const run = <A, E>(layer: Layer.Layer<any>, effect: Effect.Effect<A, E, any>) =>
  effect.pipe(Effect.provide(layer), Effect.scoped, Effect.provide(TestHost.layer())) as Effect.Effect<A, E>

/** Starts what is due and lets one page finish. */
const page = TestHost.settle.pipe(Effect.andThen(TestClock.adjust("10 millis")), Effect.andThen(TestHost.settle))

describe("Loaded lists", () => {
  it.effect("h.loaded opens a list as its items, pages and more; $.loadMore appends and $.reset drops pages", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Chat, { room: "r" })
        yield* page
        assert.strictEqual(root.text(), "r0 /1 Available")
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* TestHost.settle
        // A change of `more` is a slot write of its own.
        assert.strictEqual(root.text(), "r0 /1 Loading")
        yield* page
        // The second page repeats m0: the first stays.
        assert.strictEqual(root.text(), "r0,r1 /2 Available")
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* page
        assert.strictEqual(root.text(), "r0,r1,r2 /3 End")
        assert.deepStrictEqual(root.entry(app.ListMessages, { room: "r" })?.more, { _tag: "End" })
        root.send(app.ChatMessage.make({ _tag: "Refresh" }))
        yield* page
        assert.strictEqual(root.text(), "r0 /1 Available")
        assert.deepStrictEqual(
          root.fetches().map((fetch) => fetch.trigger + "@" + fetch.page),
          ["watch@0", "loadMore@1", "loadMore@2", "reset@0"]
        )
        // Both are logged on the update entry.
        const lists = root.log().flatMap((entry) =>
          entry._tag === "Update" ? (entry as MessageLog.Update).lists ?? [] : []
        )
        assert.deepStrictEqual(lists, [
          { name: "messages", op: "loadMore" },
          { name: "messages", op: "loadMore" },
          { name: "messages", op: "reset" }
        ])
      })
    )
  })

  it.effect("a failed load more keeps the pages and shows Failed, and the next one clears it", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Chat, { room: "r" })
        yield* page
        app.db.fail.add(1)
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* page
        assert.strictEqual(root.text(), "r0 /1 Failed")
        app.db.fail.clear()
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "r0 /1 Loading")
        yield* page
        assert.strictEqual(root.text(), "r0,r1 /2 Available")
      })
    )
  })

  it.effect("a load more on a disabled loader does nothing", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Chat, { room: "" })
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* page
        assert.deepStrictEqual(root.fetches(), [])
        assert.strictEqual(root.text(), "loading")
      })
    )
  })

  it.effect("the slot writes one has-more bit and never Loading or Failed", () => {
    const app = makeApp()
    const encoder = MessageLog.makeEncoder()
    const codec = Schema.toCodecJson(Loader.snapshotSchema(app.ListMessages, "messages")) as unknown as Schema.Codec<
      unknown,
      unknown
    >
    const decode = Schema.decodeUnknownSync(codec)
    /** The last slot written for "messages", as the Wire encodes it, and that decoded back. */
    const lastSlot = (root: Pick<TestHost.TestRoot<any, any, any>, "log">) => {
      const entry = [...root.log()].reverse().find((entry): entry is MessageLog.LoaderChanged =>
        entry._tag === "LoaderChanged" && entry.name === "messages"
      )!
      const encoded = (encoder.encode(entry) as { readonly slot: ReadonlyArray<unknown> }).slot
      return { encoded, decoded: decode(encoded) }
    }
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Chat, { room: "r" })
        yield* page
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* TestHost.settle
        const loading = lastSlot(root)
        assert.strictEqual(loading.encoded.length, 6)
        assert.strictEqual(loading.encoded[5], true)
        assert.deepStrictEqual(Loader.snapshotData(loading.decoded)?.more, { _tag: "Available" })
        yield* page
        root.send(app.ChatMessage.make({ _tag: "More" }))
        yield* page
        const ended = lastSlot(root)
        assert.strictEqual(ended.encoded[5], false)
        assert.deepStrictEqual(Loader.snapshotData(ended.decoded)?.more, { _tag: "End" })
      })
    )
  })

  it.effect("the server renders the first page, ships the page array, and drops a load more", () => {
    const app = makeApp()
    app.db.delay = 0
    return Effect.gen(function*() {
      const log = MessageLog.makeMemory({ size: 100 })
      const problems: Array<Loader.Problem.Any> = []
      const result = yield* HtmlServer.renderToHtml(app.Chat.pipe(Component.provide(app.layer)), { room: "ssr" }, {
        budget: "1 hour"
      }).pipe(
        Effect.provideService(MessageLog.MessageLog, log),
        Effect.provideService(Loader.Problems, (problem) => problems.push(problem))
      )
      assert.include(result.html, "ssr0 /1 Available")
      assert.deepStrictEqual(problems.map((problem) => problem._tag), ["ServerCommandIssued"])
      assert.include(JSON.stringify(result.state["~loader"]), "ssr0")
      assert.notInclude(JSON.stringify(result.state["~loader"]), "ssr1")
    })
  })

  it("Story: a failure on a held page settles a pending load more, and reset keeps a Failure", () => {
    const app = makeApp()
    const pageAt = (index: number, next: number | null) => ({
      messages: [{ id: "m" + index, text: "r" + index }],
      next
    })
    const final = Story.make(
      app.Chat,
      { room: "r" },
      (s) =>
        s.loaded("messages", [pageAt(0, 1), pageAt(1, 2)], { waiting: true })
          .send(app.ChatMessage.make({ _tag: "More" }))
          .check((story) => assert.deepStrictEqual(story.loadingMore, ["messages"]))
          // Still walking: the load more waits on.
          .loaded("messages", [pageAt(0, 1), pageAt(1, 2)], { waiting: true })
          .check((story) => assert.deepStrictEqual(story.loadingMore, ["messages"]))
          .loadFailed("messages", "nope")
          .check((story) => assert.deepStrictEqual(story.loadingMore, []))
          .send(app.ChatMessage.make({ _tag: "Refresh" }))
    )
    const result = final.loaded().messages as AsyncResult.AsyncResult<
      { readonly pages: ReadonlyArray<unknown> },
      string
    >
    assert.strictEqual(result._tag, "Failure")
    if (result._tag === "Failure") {
      assert.isTrue(result.waiting)
      assert.deepStrictEqual(Cause.findErrorOption(result.cause), Option.some("nope"))
      assert.deepStrictEqual(
        Option.map(result.previousSuccess, (success) => success.value.pages),
        Option.some([pageAt(0, 1)])
      )
    }
    final.get(Query.text("failed", { exact: true }))
  })

  it("Story: a load more is pending until a step settles it, and reset sends the first page", () => {
    const app = makeApp()
    const pageAt = (index: number, next: number | null) => ({
      messages: [{ id: "m" + index, text: "r" + index }],
      next
    })
    const shows = (text: string) => (story: Story.Story<any, any, any, any>) => {
      story.get(Query.text(text, { exact: true }))
    }
    Story.make(app.Chat, { room: "r" }, (s) =>
      s.loaded("messages", [pageAt(0, 1)])
        .check(shows("r0 /1 Available"))
        .send(app.ChatMessage.make({ _tag: "More" }))
        .check((story) => assert.deepStrictEqual(story.loadingMore, ["messages"]))
        .check(shows("r0 /1 Loading"))
        .loadedMore("messages", pageAt(1, 2))
        .check(shows("r0,r1 /2 Available"))
        .send(app.ChatMessage.make({ _tag: "More" }))
        .loadMoreFailed("messages", "nope")
        .check(shows("r0,r1 /2 Failed"))
        .send(app.ChatMessage.make({ _tag: "Refresh" }))
        .check(shows("r0 /1 Available")))
    assert.throws(
      () =>
        Story.make(app.Chat, { room: "r" }, (s) => {
          s.loaded("messages", [pageAt(0, 1)]).send(app.ChatMessage.make({ _tag: "More" }))
        }),
      /a load more still pending at the end on "messages"/
    )
    assert.throws(
      () =>
        Story.start(app.Chat, { room: "r" }).loaded("messages", [pageAt(0, 1)]).loadedMore("messages", pageAt(1, null)),
      /no load more of "messages" is pending/
    )
  })

  it.effect("a history restore seeds the held pages stale and walks them again", () => {
    const app = makeApp()
    const ShellRoute = Route.union({ Home: Route.make("/"), Chat: Route.make("/chat") })
    const ShellMessage = Schema.TaggedUnion({ ChangedRoute: { route: ShellRoute }, Go: {}, Navigated: {} })
    const Shell = Component.make({
      name: "Shell",
      props: Schema.Struct({ route: ShellRoute }),
      model: ShellRoute,
      message: ShellMessage,
      elements: Html,
      init: ($) => $.props.route,
      update: (model, message, $) =>
        ShellMessage.match(message, {
          ChangedRoute: ({ route }) => route,
          Go: () =>
            $.set(model).run(
              Router.push(ShellRoute, ShellRoute.make({ _tag: "Home" })).pipe(
                Command.map(() => ShellMessage.make({ _tag: "Navigated" }))
              )
            ),
          Navigated: () => model
        }),
      subscriptions: (model) => [
        Router.subscription(ShellRoute, model, (route) => ShellMessage.make({ _tag: "ChangedRoute", route }))
      ],
      view: (model, h) =>
        model._tag === "Chat" ? h.child(app.Chat, { key: "chat", props: { room: "r" } }) : h.el("p", "home")
    })
    const history = Router.memoryHistory("/chat")
    const hosted = (effect: Effect.Effect<void, unknown, any>) =>
      run(Layer.merge(Router.make({ routes: ShellRoute, history }), app.layer), effect)
    const mount = Effect.flatMap(Router.currentRoute(ShellRoute), (route) => TestHost.mount(Shell, { route }))
    return Effect.gen(function*() {
      yield* hosted(Effect.gen(function*() {
        const root = yield* mount
        yield* page
        Query.fire(root.get(Query.text("r0 /1 Available", { exact: true })), "click")
        yield* page
        assert.strictEqual(root.text(), "r0,r1 /2 Available")
        root.send(ShellMessage.make({ _tag: "Go" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "home")
      }))
      yield* hosted(Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        history.go(-1)
        yield* TestHost.settle
        // The two pages show at once, from the restored slot, while they load again.
        assert.strictEqual(root.text(), "r0,r1 /2 Available")
        yield* page
        yield* page
        assert.strictEqual(root.text(), "r0,r1 /2 Available")
        assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger + "@" + fetch.page), ["watch@0", "watch@1"])
      }))
    })
  })
})

import { assert, describe, it } from "@effect/vitest"
import { Cause, Data, Effect, Layer, Option, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Command, Component, Route, Router, View } from "effect/ui"
import { Html } from "effect/ui/html"
import { Query, Story } from "effect/ui/testing"
import {
  Counter,
  SaveTodo,
  Search,
  SearchBox,
  SearchMessage,
  TodoItem,
  TodoItemEvents,
  TodoItemMessage,
  TodoList,
  TodoListMessage,
  Upload
} from "./fixtures/components.ts"
import * as users from "./fixtures/users.ts"

const todo = { id: "t1", title: "buy milk", done: false }
const todos = [todo, { id: "t2", title: "write spec", done: false }]

describe("Story", () => {
  describe("Counter", () => {
    it("counts by clicking", () => {
      Story.make(Counter, { initial: 1 }, (s) =>
        s.click("+")
          .click("+")
          .click("-")
          .model((model) => assert.strictEqual(model.count, 2))
          .view((view) => assert.strictEqual(View.textOf(view), "-2+")))
    })

    it("given starts from any Model, and a function of the cursor is a shared setup", () => {
      const twice = (s: Story.Steps<typeof Counter>) => s.click("+").click("+")
      const story = Story.make(Counter, { initial: 1 }, (s) => s.given({ count: 10 }).pipe(twice))
      assert.strictEqual(story.model.count, 12)
    })

    it("a block callback runs every step without returning the cursor", () => {
      const story = Story.make(Counter, { initial: 0 }, (s) => {
        s.click("+")
        s.click("+")
      })
      assert.strictEqual(story.model.count, 2)
    })

    it("a step shared by any component keeps the caller's type", () => {
      const clickPlus = <S extends Story.Steps.Any>(s: S): S => s.click("+")
      const story = Story.make(Counter, { initial: 0 }, (s) => s.pipe(clickPlus).model((model) => model.count))
      assert.strictEqual(story.model.count, 1)
    })

    it("the record answers locator queries over the view", () => {
      const story = Story.start(Counter, { initial: 3 }).current
      assert.strictEqual(Query.textOf(story.get(Query.tag("span"))), "3")
      assert.lengthOf(story.all(Query.tag("button")), 2)
      assert.isUndefined(story.query(Query.text("missing")))
      assert.strictEqual<unknown>(story.root, story.view())
    })
  })

  describe("events", () => {
    const Message = Schema.TaggedUnion({ Typed: { value: Schema.String }, Pressed: {} })
    const Form = Component.make({
      name: "Form",
      model: Schema.Struct({ value: Schema.String, presses: Schema.Number }),
      message: Message,
      init: () => ({ value: "", presses: 0 }),
      update: (model, message) =>
        Message.match(message, {
          Typed: ({ value }) => ({ ...model, value }),
          Pressed: () => ({ ...model, presses: model.presses + 1 })
        }),
      view: (_model, h) =>
        h.el(
          "div",
          h.el("input").attr("data-testid", "name").on(
            "input",
            (payload: unknown) => Message.make({ _tag: "Typed", value: (payload as { readonly value: string }).value })
          ),
          h.el("button").on("click", Message.make({ _tag: "Pressed" })).children(h.el("span", "Save")),
          h.el("p", "Save draft"),
          h.el("p", "plain")
        )
    })

    it("fire sends the payload to the element the locator matches", () => {
      Story.make(Form, {}, (s) =>
        s.fire(Query.testId("name"), "input", { value: "Ada" })
          .model((model) => assert.strictEqual(model.value, "Ada")))
    })

    it("click bubbles from the matched element to the nearest ancestor that handles it", () => {
      Story.make(Form, {}, (s) =>
        s.click(Query.text("Save", { exact: true }))
          .click(Query.tag("span"))
          .model((model) => assert.strictEqual(model.presses, 2)))
    })

    it("a locator that matches nothing or several elements throws", () => {
      assert.throws(() => Story.start(Form, {}).click("Save"), /Story\.click: 2 elements match text "Save"/)
      assert.throws(() => Story.start(Form, {}).click("missing"), /Story\.click: nothing matches text "missing"/)
    })

    it("an element nothing handles the event for throws", () => {
      assert.throws(
        () => Story.start(Form, {}).click("plain"),
        /Story\.click: nothing handles "click" at text "plain"/
      )
      assert.throws(
        () => Story.start(Form, {}).fire(Query.testId("name"), "change"),
        /Story\.fire: nothing handles "change"/
      )
    })

    it("defaultPrevented reports a cancelled default until the next step that makes a record", () => {
      const Sent = Schema.TaggedUnion({ Send: {}, Submitted: {} })
      const Composer = Component.make({
        name: "Composer",
        model: Schema.Number,
        message: Sent,
        init: () => 0,
        update: (sent) => sent + 1,
        view: (_sent, h) =>
          h.el(
            "div",
            h.el("textarea").on(
              "keydown",
              (payload: unknown) =>
                (payload as { readonly key: string }).key === "Enter" ? Sent.make({ _tag: "Send" }) : undefined,
              { preventDefault: true }
            ),
            h.el("form").on("submit", () => undefined).children(h.el("button", "Ignored")),
            h.el("form", h.el("button", "Unhandled")),
            h.el("p").on("contextmenu", () => undefined, { preventDefault: "always" }).children("Menu")
          )
      })
      const keyDown = (key: string) => (s: Story.Steps<typeof Composer>) =>
        s.fire(Query.tag("textarea"), "keydown", { key })
      Story.make(Composer, {}, (s) => {
        s.pipe(keyDown("Enter"))
          // Checks read the record without making a new one.
          .model((sent) => assert.strictEqual(sent, 1))
          .check((story) => assert.isTrue(story.defaultPrevented))
          .send(Sent.make({ _tag: "Submitted" }))
          .check((story) => assert.isFalse(story.defaultPrevented))
          .pipe(keyDown("Enter"))
          .pipe(keyDown("a"))
          .check((story) => assert.isFalse(story.defaultPrevented))
        // A form's submission is always cancelled, whatever its handler returns, and with no handler.
        s.fire(Query.text("Ignored"), "submit")
        assert.isTrue(s.current.defaultPrevented)
        s.fire(Query.text("Unhandled"), "submit")
        assert.isTrue(s.current.defaultPrevented)
        assert.strictEqual(s.current.model, 3)
        // "always" cancels whatever the handler returns.
        s.fire(Query.text("Menu"), "contextmenu")
        assert.isTrue(s.current.defaultPrevented)
      })
    })
  })

  describe("TodoItem", () => {
    it("reports a toggle to its parent instead of changing the todo", () => {
      Story.make(TodoItem, { todo }, (s) =>
        s.click("[ ]")
          .emitted((emitted) =>
            assert.deepStrictEqual(emitted, [TodoItemEvents.make({ _tag: "Toggled", done: true })])
          ))
    })

    it("a props change re-renders without reaching update", () => {
      Story.make(TodoItem, { todo }, (s) =>
        s.props({ todo: { ...todo, done: true } })
          .view((view) => assert.include(View.textOf(view), "[x]"))
          .model((model) => assert.strictEqual(model.saving, false)))
    })

    it("a Command stays pending as data until the test resolves it", () => {
      Story.make(TodoItem, { todo }, (s) =>
        s.click("save")
          .model((model) => assert.isTrue(model.saving))
          .expectExact(SaveTodo.make(todo))
          .expectHas(SaveTodo)
          .check((story) => {
            assert.deepStrictEqual(
              story.pending.map((entry) => [entry.command.name, entry.command.args, entry.status]),
              [["todos/SaveTodo", todo, "running"]]
            )
          })
          .resolve(SaveTodo, TodoItemMessage.make({ _tag: "SaveFailed", reason: "disk full" }))
          .model((model) => assert.isFalse(model.saving))
          .expectNone())
    })

    it("fails when a Command is still pending at the end", () => {
      assert.throws(
        () => Story.make(TodoItem, { todo }, (s) => s.send(TodoItemMessage.make({ _tag: "Save" }))),
        /still pending.*todos\/SaveTodo/
      )
    })

    it("resolving by instance matches the arguments", () => {
      assert.throws(
        () =>
          Story.make(TodoItem, { todo }, (s) =>
            s.click("save")
              .resolve(SaveTodo.make({ ...todo, id: "other" }), TodoItemMessage.make({ _tag: "Saved" }))),
        /no running todos\/SaveTodo/
      )
    })
  })

  describe("Commands that can fail", () => {
    class SaveFailed extends Data.TaggedError("SaveFailed")<{ readonly reason: string }> {}
    class Save extends Command.Service<Save>()(
      "test/Save",
      { args: { title: Schema.String }, invalidates: () => [] },
      Effect.succeed((): Effect.Effect<void, SaveFailed> => Effect.void)
    ) {}
    const Msg = Schema.TaggedUnion({ Save: {}, Saved: {}, Failed: { reason: Schema.String }, Stop: {} })
    const Editor = Component.make({
      name: "Editor",
      model: Schema.String,
      message: Msg,
      init: () => "idle",
      update: (_, message, $) =>
        Msg.match(message, {
          Save: () =>
            $.run(
              Save.make({ title: "milk" }).pipe(Command.match({
                onSuccess: () => Msg.make({ _tag: "Saved" }),
                onFailure: (error) => Msg.make({ _tag: "Failed", reason: error.reason })
              }))
            ),
          Saved: () => "saved",
          Failed: ({ reason }) => `failed: ${reason}`,
          Stop: () => $.run(Command.interrupt(Save))
        }),
      view: (model, h) =>
        h.el("div", [
          h.el("button").on("click", Msg.make({ _tag: "Save" })).children("save"),
          h.el("button").on("click", Msg.make({ _tag: "Stop" })).children("stop"),
          h.text(h.isRunning(Save) ? "saving" : model)
        ])
    })

    it("fail sends the typed failure through Command.match", () => {
      Story.make(Editor, {}, (s) =>
        s.click("save")
          .fail(Save, new SaveFailed({ reason: "disk full" }))
          .model((model) => assert.strictEqual(model, "failed: disk full")))
    })

    it("fail throws for a Command with no typed failure", () => {
      assert.throws(
        () => Story.make(TodoItem, { todo }, (s) => s.click("save").fail(SaveTodo as any, new Error("no"))),
        /has no typed failure mapped by Command\.match/
      )
    })

    it("h.isRunning is derived from the pending Commands", () => {
      Story.make(Editor, {}, (s) =>
        s.view((view) => assert.include(View.textOf(view), "idle"))
          .click("save")
          .view((view) => assert.include(View.textOf(view), "saving"))
          .resolve(Save, undefined)
          .view((view) => assert.include(View.textOf(view), "saved"))
          .click("save")
          .click("stop")
          .view((view) => assert.include(View.textOf(view), "saved"))
          .expectNone())
    })
  })

  describe("TodoList", () => {
    it("declares one keyed child per todo", () => {
      const story = Story.start(TodoList, { initial: todos }).current
      assert.deepStrictEqual(Story.children(story.view(), TodoItem).map((child) => child.key), ["t1", "t2"])
    })

    it("reacts to what a child emits", () => {
      Story.make(
        TodoList,
        { initial: todos },
        (s) =>
          s.childEmit("t2", TodoItemEvents.make({ _tag: "Toggled", done: true }))
            .model((model) => {
              assert.isTrue(model.todos[1].done)
              assert.isFalse(model.todos[0].done)
            })
      )
    })

    it("hears about a child's failure and shows the slot's fallback", () => {
      const failure = AsyncResult.failure<never, unknown>(Cause.die(new Error("boom")))
      Story.make(TodoList, { initial: todos }, (s) =>
        s.childFailure("t1", failure.cause)
          .model((model) => assert.deepStrictEqual(model.failed, ["t1"]))
          .view((view) => {
            const fallback = Story.fallback(view, "t1", failure)
            assert.strictEqual(View.textOf(fallback!), "buy milk failed")
          }))
      assert.strictEqual(
        Story.layerFailure(TodoList, failure),
        undefined
      )
    })

    it("applies Component.provide's onFailure", () => {
      const Provided = Component.provide(
        TodoList,
        () => Layer.effect(SaveTodo, Effect.fail("offline" as const)),
        { onFailure: () => TodoListMessage.make({ _tag: "RowFailed", id: "layer" }) }
      )
      assert.deepStrictEqual(
        Story.layerFailure(Provided, AsyncResult.failure(Cause.fail("offline"))),
        TodoListMessage.make({ _tag: "RowFailed", id: "layer" })
      )
    })
  })

  describe("Command modes", () => {
    it("switch interrupts the earlier run, and the result arrives once", () => {
      Story.make(SearchBox, {}, (s) =>
        s.send(SearchMessage.make({ _tag: "Query", text: "a" }))
          .send(SearchMessage.make({ _tag: "Query", text: "ab" }))
          .check((story) => {
            assert.deepStrictEqual(story.interrupted.map((command) => command.args), [{ text: "a" }])
          })
          .expectExact(Search({ text: "ab" }))
          .resolve(Search, SearchMessage.make({ _tag: "Results", items: ["ab"] }))
          .model((model) => assert.deepStrictEqual(model.items, ["ab"])))
    })

    it("a stream Command takes next and end, drop ignores a second start, and an interrupt stops it", () => {
      Story.make(SearchBox, {}, (s) =>
        s.send(SearchMessage.make({ _tag: "Start" }))
          .send(SearchMessage.make({ _tag: "Start" }))
          .check((story) => assert.strictEqual(story.dropped.length, 1))
          .next(Upload, SearchMessage.make({ _tag: "Progress", percent: 50 }))
          .model((model) => assert.strictEqual(model.percent, 50))
          .subscriptions((keys) => assert.deepStrictEqual(keys, ["tick", "query:\"\""]))
          .expectHas(Upload)
          .send(SearchMessage.make({ _tag: "Cancel" }))
          .check((story) => assert.deepStrictEqual(story.interrupted.map((command) => command.name), ["Upload"]))
          .expectNone()
          .send(SearchMessage.make({ _tag: "Start" }))
          .end(Upload)
          .expectNone())
    })

    it("next and end reject a Command that isn't a stream", () => {
      assert.throws(
        () =>
          Story.make(SearchBox, {}, (s) =>
            s.send(SearchMessage.make({ _tag: "Query", text: "a" }))
              .next(Search as any, SearchMessage.make({ _tag: "Tick" }))),
        /not a stream Command/
      )
    })
  })

  describe("Command.map", () => {
    const Message = Schema.TaggedUnion({ Upload: {}, Uploaded: { url: Schema.String } })
    const UploadFile = Command.make(
      "UploadFile",
      { args: { name: Schema.String } },
      ({ name }) => Effect.succeed(`https://cdn/${name}`)
    )
    const Avatar = Component.make({
      name: "Avatar",
      model: Schema.Struct({ url: Schema.String }),
      message: Message,
      init: () => ({ url: "" }),
      update: (_model, message, $) =>
        Message.match(message, {
          Upload: () =>
            $.run(UploadFile({ name: "me.png" }).pipe(Command.map((url) => Message.make({ _tag: "Uploaded", url })))),
          Uploaded: ({ url }) => ({ url })
        }),
      view: (model, h) => h.el("img").attr("src", model.url)
    })

    it("resolves with the Command's own message type and replays the mapping", () => {
      Story.make(Avatar, {}, (s) =>
        s.send(Message.make({ _tag: "Upload" }))
          .expectExact(UploadFile({ name: "me.png" }))
          .resolve(UploadFile, "https://cdn/me.png")
          .model((model) => assert.strictEqual(model.url, "https://cdn/me.png")))
    })

    it("a mapped Command as the target still takes the definition's own result", () => {
      const mapped = UploadFile({ name: "me.png" }).pipe(Command.map((url) => Message.make({ _tag: "Uploaded", url })))
      Story.make(Avatar, {}, (s) =>
        s.send(Message.make({ _tag: "Upload" }))
          .resolve(mapped, "https://cdn/me.png")
          .model((model) => assert.strictEqual(model.url, "https://cdn/me.png")))
    })
  })

  describe("navigation", () => {
    const AppRoute = Route.union({ Home: Route.make("/"), About: Route.make("/about") })
    const Message = Schema.TaggedUnion({
      Go: {},
      Navigated: { outcome: Schema.Literals(["navigated", "blocked"]) }
    })
    const Nav = Component.make({
      name: "Nav",
      model: Schema.Struct({ outcome: Schema.String }),
      message: Message,
      init: () => ({ outcome: "" }),
      update: (_model, message, $) =>
        Message.match(message, {
          Go: () =>
            $.run(
              Router.push(AppRoute, AppRoute.make({ _tag: "About" })).pipe(
                Command.map((outcome) => Message.make({ _tag: "Navigated", outcome }))
              )
            ),
          Navigated: ({ outcome }) => ({ outcome })
        }),
      view: (model, h) => h.el("p", model.outcome)
    })

    it("a navigation Command stays pending until resolved, like any other", () => {
      Story.make(Nav, {}, (s) =>
        s.send(Message.make({ _tag: "Go" }))
          .model((model) => assert.strictEqual(model.outcome, ""))
          .resolve(Router.Push, "navigated")
          .model((model) => assert.strictEqual(model.outcome, "navigated")))
    })

    it("a query patch is named by its class, issued with the patch, and resolves with its own outcome", () => {
      const Routes = Route.union({ Search: Route.make("/search", { query: { q: Schema.optional(Schema.String) } }) })
      const BoxMessage = Schema.TaggedUnion({
        Typed: { value: Schema.String },
        Patched: { outcome: Schema.Literals(["navigated", "blocked", "stale"]) }
      })
      const Box = Component.make({
        name: "Box",
        props: Schema.Struct({ route: Routes }),
        model: Schema.Struct({ outcome: Schema.String }),
        message: BoxMessage,
        init: () => ({ outcome: "" }),
        update: (_model, message, $) =>
          BoxMessage.match(message, {
            Typed: ({ value }) =>
              $.run(
                Router.patchQuery(Routes, $.props.route, { q: value || undefined }).pipe(
                  Command.map((outcome) => BoxMessage.make({ _tag: "Patched", outcome }))
                )
              ),
            Patched: ({ outcome }) => ({ outcome })
          }),
        view: (model, h) => h.el("p", model.outcome)
      })
      const route = Routes.make({ _tag: "Search" })
      Story.make(Box, { route }, (s) =>
        s.send(BoxMessage.make({ _tag: "Typed", value: "ada" }))
          .expectExact(Router.patchQuery(Routes, route, { q: "ada" }))
          .resolve(Router.PatchQuery, "stale")
          .model((model) => assert.strictEqual(model.outcome, "stale")))
    })
  })

  describe("view defects", () => {
    const Message = Schema.TaggedUnion({ Bump: {} })
    const Broken = Component.make({
      name: "Broken",
      model: Schema.Struct({ n: Schema.Number }),
      message: Message,
      init: () => ({ n: 0 }),
      update: (model) => ({ n: model.n + 1 }),
      view: (model, h) => {
        if (model.n > 0) throw new Error(`view broke at ${model.n}`)
        return h.el("div")
      }
    })

    it("fail the step that changed the Model, even when no step queries the view", () => {
      Story.make(Broken, {}, () => {})
      assert.throws(() => Story.make(Broken, {}, (s) => s.send(Message.make({ _tag: "Bump" }))), /view broke at 1/)
    })

    it("fail initialisation when init's Model can't be rendered", () => {
      assert.throws(() => Story.make(Broken, {}, (s) => s.given({ n: 5 })), /view broke at 5/)
      const AlwaysBroken = Component.make({
        name: "AlwaysBroken",
        model: Schema.Struct({}),
        message: Message,
        init: () => ({}),
        update: (model) => model,
        view: () => {
          throw new Error("no view")
        }
      })
      assert.throws(() => Story.make(AlwaysBroken, {}, () => {}), /no view/)
    })
  })

  describe("loaders", () => {
    const text = (story: { readonly root: Query.Node }) => Query.textOf(story.root)
    const page = (n: number, names: ReadonlyArray<string>) => ({
      page: n,
      pages: 2,
      users: names.map((name, i) => ({ id: `${n}-${i}`, name, email: "", likes: 0 }))
    })

    it("loaded writes the loader's slot, at the loader's current args", () => {
      Story.make(users.ListPage, {}, (s) =>
        s
          .check((story) => assert.include(text(story), "Loading users…"))
          .loaders((loaders) =>
            assert.deepStrictEqual(loaders, [{ name: "users", read: "users/ListUsers", args: { page: 0 } }])
          )
          .loaded("users", page(0, ["Ann", "Bea"]))
          .check((story) => assert.include(text(story), "AnnBea"))
          // The next page: h.previous keeps the page the slot holds until it is loaded.
          .click("Next")
          .loaders((loaders) => assert.deepStrictEqual(loaders.map((loader) => loader.args), [{ page: 1 }]))
          .check((story) => {
            assert.include(text(story), "AnnBea")
            assert.include(text(story), "Loading page 2…")
          })
          .loaded("users", page(1, ["Cy"]))
          .check((story) => {
            assert.include(text(story), "Cy")
            assert.notInclude(text(story), "Loading page")
          }))
    })

    it("loadFailed keeps the loader's Success at the current args as previousSuccess, and waiting shows", () => {
      Story.make(users.UserCard, { id: "1" }, (s) =>
        s
          .loaded("user", { id: "1", name: "Ann", email: "ann@x", likes: 0 }, { waiting: true })
          .check((story) => assert.include(text(story), "Updating…"))
          .loadFailed("user", new users.UserNotFound({ id: "1" }))
          .check((story) => assert.strictEqual(text(story), "This user doesn't exist."))
          .check((story) => {
            const result = story.loaded().user
            assert.isTrue(AsyncResult.isFailure(result) && Option.isSome(result.previousSuccess))
          })
          // Another user's result doesn't carry over.
          .props({ id: "2" })
          .loadFailed("user", new users.UserNotFound({ id: "2" }))
          .check((story) => {
            const result = story.loaded().user
            assert.isTrue(AsyncResult.isFailure(result) && Option.isNone(result.previousSuccess))
          }))
    })

    it("given takes an updater and keeps the slots, and loaded throws for a name that isn't a loader", () => {
      Story.make(users.RenameForm, { id: "1" }, (s) =>
        s
          .given((model) => ({ ...model, draft: Option.some("Zed") }))
          .loaded("user", { id: "1", name: "Ann", email: "", likes: 0 })
          .check((story) => assert.strictEqual(story.model.draft._tag, "Some"))
          .given((model) => ({ ...model, draft: Option.none() }))
          .check((story) => {
            assert.strictEqual(story.model.draft._tag, "None")
            assert.strictEqual(story.loaded().user._tag, "Success")
          })
          .subscriptions((keys) => assert.deepStrictEqual(keys, [])))
      assert.throws(
        () => Story.make(users.RenameForm, { id: "1" }, (s) => s.loaded("draft" as any, "x")),
        /draft/
      )
    })

    const TeamMessage = Schema.TaggedUnion({ UserChanged: {}, Bump: {} })
    const renders: Array<string> = []
    const Team = Component.make({
      name: "Team",
      props: Schema.Struct({ id: Schema.String }),
      model: Schema.Struct({ changes: Schema.Number }),
      message: TeamMessage,
      elements: Html,
      loaders: {
        // Declared before the loader it depends on, so the order of the record doesn't matter.
        friend: {
          load: users.GetUser,
          args: (_model, _props, loaded) =>
            AsyncResult.isSuccess(loaded.user) ? { id: loaded.user.value.email } : undefined
        },
        user: {
          load: users.GetUser,
          args: (_model, props) => ({ id: props.id }),
          onChange: () => TeamMessage.make({ _tag: "UserChanged" })
        },
        others: { loadMany: users.GetUser, args: () => [{ id: "8" }, { id: "9" }] },
        list: { load: users.ListUsers, args: () => ({ page: 0 }) }
      },
      init: () => ({ changes: 0 }),
      update: (model) => ({ changes: model.changes + 1 }),
      view: (model, h) => {
        const name = (result: AsyncResult.AsyncResult<users.User, unknown>) =>
          AsyncResult.isSuccess(result) ? result.value.name : "?"
        const out = [
          name(h.loaded.user),
          name(h.loaded.friend),
          h.loaded.others.map((entry) => name(entry.result)).join("+"),
          AsyncResult.isSuccess(h.loaded.list) ? String(h.loaded.list.value.users.length) : "?",
          String(model.changes)
        ].join(" ")
        renders.push(out)
        return h.p(out)
      }
    })
    const user = (id: string, name: string, email = "") => ({ id, name, email, likes: 0 })

    it("given starts from loaded results: one render, dependent and keyed loaders, and no onChange message", () => {
      const final = Story.make(Team, { id: "1" }, (s) => {
        renders.length = 0
        s.given({ changes: 0 }, {
          friend: user("2", "Bea"),
          user: user("1", "Ann", "2"),
          others: [{ args: { id: "9" }, value: user("9", "Ivy") }],
          list: { page: 0, pages: 1, users: [user("1", "Ann")] }
        })
          .check((story) => assert.strictEqual(text(story), "Ann Bea ?+Ivy 1 0"))
          // A load step after it still sends onChange.
          .loaded("user", user("1", "Anna", "2"))
          .check((story) => assert.strictEqual(text(story), "Anna Bea ?+Ivy 1 1"))
      })
      assert.deepStrictEqual(renders, ["Ann Bea ?+Ivy 1 0", "Anna Bea ?+Ivy 1 1"])
      assert.strictEqual(final.loaded().friend._tag, "Success")
      assert.throws(
        () => Story.make(Team, { id: "1" }, (s) => s.given({ changes: 0 }, { friend: user("2", "Bea") })),
        /friend.*disabled/
      )
      // A keyed entry at args the loader doesn't return.
      assert.throws(
        () =>
          Story.make(
            Team,
            { id: "1" },
            (s) => s.given({ changes: 0 }, { others: [{ args: { id: "7" }, value: user("7", "Uma") }] })
          ),
        /others.*given args/
      )
      // Loaders that aren't named keep their slots.
      Story.make(Team, { id: "1" }, (s) =>
        s.given({ changes: 0 }, { user: user("1", "Ann", "2") })
          .given({ changes: 5 }, { friend: user("2", "Bea") })
          .check((story) => assert.strictEqual(text(story), "Ann Bea ?+? ? 5")))
    })

    it("given replaces loaded results in any key order, against the new results, not the old slots", () => {
      Story.make(
        Team,
        { id: "1" },
        (s) =>
          s.given({ changes: 0 }, { user: user("1", "Ann", "2"), friend: user("2", "Bea") })
            .check((story) => assert.strictEqual(text(story), "Ann Bea ?+? ? 0"))
            // The friend is named first, while the held user still points at "2".
            .given({ changes: 0 }, { friend: user("3", "Cy"), user: user("1", "Ann", "3") })
            .check((story) => assert.strictEqual(text(story), "Ann Cy ?+? ? 0"))
      )
    })

    it("given prunes a keyed loader with no onChange message, and a later step's prune still sends it", () => {
      const Message = Schema.TaggedUnion({ FriendsChanged: {} })
      const Pals = Component.make({
        name: "Pals",
        props: Schema.Struct({ id: Schema.String }),
        model: Schema.Struct({ changes: Schema.Number }),
        message: Message,
        elements: Html,
        loaders: {
          user: { load: users.GetUser, args: (_model, props) => ({ id: props.id }) },
          friends: {
            loadMany: users.GetUser,
            args: (_model, _props, loaded) =>
              AsyncResult.isSuccess(loaded.user) ? [{ id: loaded.user.value.email }] : [],
            onChange: () => Message.make({ _tag: "FriendsChanged" })
          }
        },
        init: () => ({ changes: 0 }),
        update: (model) => ({ changes: model.changes + 1 }),
        view: (model, h) =>
          h.p(`${h.loaded.friends.filter((entry) => AsyncResult.isSuccess(entry.result)).length} ${model.changes}`)
      })
      Story.make(
        Pals,
        { id: "1" },
        (s) =>
          s.given({ changes: 0 }, {
            user: user("1", "Ann", "2"),
            friends: [{ args: { id: "2" }, value: user("2", "Bea") }]
          })
            .check((story) => assert.strictEqual(text(story), "1 0"))
            // The friend id moves to "3": the held "2" is pruned, silently.
            .given({ changes: 0 }, { user: user("1", "Ann", "3") })
            .check((story) => assert.strictEqual(text(story), "0 0"))
            .loadedMany("friends", [{ args: { id: "3" }, value: user("3", "Cy") }])
            .check((story) => assert.strictEqual(text(story), "1 1"))
            // An ordinary step's prune sends onChange.
            .loaded("user", user("1", "Ann", "4"))
            .check((story) => assert.strictEqual(text(story), "0 2"))
      )
    })

    it("given keeps a keyed result its loader returns again once the given results settle", () => {
      const Message = Schema.TaggedUnion({ FriendsChanged: {} })
      const Circle = Component.make({
        name: "Circle",
        props: Schema.Struct({}),
        model: Schema.Struct({ id: Schema.String, changes: Schema.Number }),
        message: Message,
        elements: Html,
        loaders: {
          // Declared before the loader it reads, so a first pass sees the old user at the new Model's args.
          friends: {
            loadMany: users.GetUser,
            args: (_model, _props, loaded) =>
              AsyncResult.isSuccess(loaded.user) ? [{ id: loaded.user.value.email }] : [],
            onChange: () => Message.make({ _tag: "FriendsChanged" })
          },
          user: { load: users.GetUser, args: (model) => ({ id: model.id }) }
        },
        init: () => ({ id: "1", changes: 0 }),
        update: (model) => ({ ...model, changes: model.changes + 1 }),
        view: (model, h) =>
          h.p(
            `${
              h.loaded.friends.map((entry) => AsyncResult.isSuccess(entry.result) ? entry.result.value.name : "?").join(
                "+"
              )
            } ${model.changes}`
          )
      })
      Story.make(Circle, {}, (s) =>
        s.given({ id: "1", changes: 0 }, {
          user: user("1", "Ann", "shared"),
          friends: [{ args: { id: "shared" }, value: user("shared", "Sam") }]
        })
          .check((story) => assert.strictEqual(text(story), "Sam 0"))
          // The new user points at the same friend: the held result stays.
          .given({ id: "2", changes: 0 }, { user: user("2", "Bob", "shared") })
          .check((story) => assert.strictEqual(text(story), "Sam 0"))
          // A friend the new user doesn't point at is still dropped, silently.
          .given({ id: "3", changes: 0 }, { user: user("3", "Cy", "other") })
          .check((story) => assert.strictEqual(text(story), "? 0")))
    })

    it("given with no loaded results works on a component without loaders", () => {
      Story.make(
        Counter,
        { initial: 0 },
        (s) => s.given({ count: 3 }, {}).check((story) => assert.strictEqual(story.model.count, 3))
      )
    })
  })
})

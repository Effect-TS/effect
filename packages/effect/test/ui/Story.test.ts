import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Layer, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Command, Component, View } from "effect/ui"
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
          h.el("button", h.el("span", "Save")).on("click", Message.make({ _tag: "Pressed" })),
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
              [["todos/SaveTodo", [todo], "running"]]
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
            assert.deepStrictEqual(story.interrupted.map((command) => command.args), [["a"]])
          })
          .expectExact(Search("ab"))
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
    const UploadFile = Command.make("UploadFile", (name: string) => Effect.succeed(`https://cdn/${name}`))
    const Avatar = Component.make({
      name: "Avatar",
      model: Schema.Struct({ url: Schema.String }),
      message: Message,
      init: () => ({ url: "" }),
      update: (_model, message, $) =>
        Message.match(message, {
          Upload: () => $.run(UploadFile("me.png").pipe(Command.map((url) => Message.make({ _tag: "Uploaded", url })))),
          Uploaded: ({ url }) => ({ url })
        }),
      view: (model, h) => h.el("img").attr("src", model.url)
    })

    it("resolves with the Command's own message type and replays the mapping", () => {
      Story.make(Avatar, {}, (s) =>
        s.send(Message.make({ _tag: "Upload" }))
          .expectExact(UploadFile("me.png"))
          .resolve(UploadFile, "https://cdn/me.png")
          .model((model) => assert.strictEqual(model.url, "https://cdn/me.png")))
    })

    it("a mapped Command as the target still takes the definition's own result", () => {
      const mapped = UploadFile("me.png").pipe(Command.map((url) => Message.make({ _tag: "Uploaded", url })))
      Story.make(Avatar, {}, (s) =>
        s.send(Message.make({ _tag: "Upload" }))
          .resolve(mapped, "https://cdn/me.png")
          .model((model) => assert.strictEqual(model.url, "https://cdn/me.png")))
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
})

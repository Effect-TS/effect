import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component, View } from "effect/ui"
import { Html, HtmlServer } from "effect/ui/html"

const button = () => new Html.Element("button")

const TodoMessage = Schema.TaggedUnion({ Add: {}, Draft: { value: Schema.String } })
type TodoMessage = typeof TodoMessage.Type
const NewTodo = Html.ref("NewTodo", "input")
const Item = Component.define({
  name: "Item",
  props: Schema.Struct({ title: Schema.String }),
  model: Schema.String,
  message: Schema.Never,
  elements: Html
}).make({
  init: ($) => $.props.title,
  update: (model) => model,
  view: (title, h) => h.li(title)
})
const helper = () => View.makeHelper<TodoMessage, {}, Html.Elements>({}, Html)
const element = (
  tag: string,
  fields: Partial<Omit<View.Element<TodoMessage, any>, "_tag" | "tag" | "children">>,
  children: ReadonlyArray<View.Node<TodoMessage, any>>
): View.Element<TodoMessage, any> => ({
  _tag: "Element",
  tag,
  elementKey: undefined,
  attrs: {},
  props: {},
  handlers: {},
  eventOptions: {},
  refKey: undefined,
  mount: undefined,
  owned: [],
  children,
  ...fields
})

describe("Html", () => {
  describe("builder", () => {
    const add = TodoMessage.make({ _tag: "Add" })
    const onInput = ({ value }: Html.InputPayload) => TodoMessage.make({ _tag: "Draft", value })
    const todos = ["Milk", "Eggs"]

    it("builds the tree with attributes before children", () => {
      const h = helper()
      const tree = h.form.onSubmit(add).children(
        h.input.ref(NewTodo).value("draft").onInput(onInput),
        h.button.attr("type", "submit").children("Add"),
        h.span("Todos"),
        todos.map((title) => h.child(Item, { key: title, props: { title } }))
      )
      assert.deepStrictEqual(
        tree,
        element("form", { handlers: { submit: add } }, [
          element("input", { refKey: NewTodo.key, props: { value: "draft" }, handlers: { input: onInput } }, []),
          element("button", { attrs: { type: "submit" } }, [View.text("Add")]),
          element("span", {}, [View.text("Todos")]),
          h.child(Item, { key: "Milk", props: { title: "Milk" } }),
          h.child(Item, { key: "Eggs", props: { title: "Eggs" } })
        ])
      )
    })

    it.effect("renders the example the same as the children-first form did", () =>
      Effect.gen(function*() {
        const Todos = Component.define({
          name: "Todos",
          model: Schema.String,
          message: TodoMessage,
          elements: Html
        }).make({
          init: () => "draft",
          update: (model) => model,
          view: (draft, h) =>
            h.form.onSubmit(add).children(
              h.input.ref(NewTodo).value(draft).onInput(onInput),
              h.button.attr("type", "submit").children("Add"),
              h.span("Todos"),
              todos.map((title) => h.child(Item, { key: title, props: { title } }))
            )
        })
        const rendered = yield* HtmlServer.renderToHtml(Todos, {})
        // The markup the children-first form, h.form(...children).onSubmit(add), rendered.
        assert.strictEqual(
          rendered.html,
          "<!--[/Todos--><form><input value=\"draft\"><button type=\"submit\">Add</button><span>Todos</span>" +
            "<!--[/Todos/Item[Milk]--><li>Milk</li><!--]/Todos/Item[Milk]-->" +
            "<!--[/Todos/Item[Eggs]--><li>Eggs</li><!--]/Todos/Item[Eggs]--></form><!--]/Todos-->"
        )
      }))

    it("the shorthand call is children, and a builder alone is an element with no children", () => {
      const h = helper()
      assert.deepStrictEqual(h.li("a", ["b", false], null, h.br), h.li.children("a", ["b", false], null, h.br))
      assert.deepStrictEqual(h.ul(h.li, h.li.key("k")), h.ul(h.li(), h.li.key("k").children()))
      assert.deepStrictEqual(h.el("x-foo", "a"), h.el("x-foo").children("a"))
      assert.deepStrictEqual<unknown>(View.toNode(h.input.value("a")), element("input", { props: { value: "a" } }, []))
    })

    it("a tag on h is one builder per vocabulary, shared by every render", () => {
      const first = helper()
      const second = helper()
      assert.strictEqual(first.form, second.form)
      assert.strictEqual(first.br, second.br)
      assert.strictEqual<unknown>(first.form, Html.tags.form)
      // A chain call copies the fields into a plain builder: no function is made.
      const chained = first.form.attr("method", "post")
      assert.strictEqual(typeof chained, "object")
      assert.instanceOf(chained, Html.Element)
      assert.strictEqual(typeof first.input.value("a"), "object")
    })

    it("the root's own name and length never reach a builder or a node", () => {
      const h = helper()
      const fields = ["attrs", "elementKey", "eventOptions", "handlers", "mount", "owned", "props", "refKey", "tag"]
      assert.deepStrictEqual(Object.keys(h.form.attr("method", "post")).sort(), fields)
      assert.deepStrictEqual(Object.keys(h.form("a")).sort(), ["_tag", "children", ...fields].sort())
      assert.deepStrictEqual(Object.keys(View.toNode(h.form)).sort(), ["_tag", "children", ...fields].sort())
    })

    it("builders are values: a chain call leaves its receiver alone", () => {
      const h = helper()
      const base = h.button.attr("type", "button")
      const primary = base.class("primary")
      assert.deepStrictEqual(base.attrs, { type: "button" })
      assert.deepStrictEqual(primary.attrs, { type: "button", class: "primary" })
      assert.deepStrictEqual(h.button.attrs, {})
    })

    it("setting an attribute again moves it last, and removing one keeps the others in order", () => {
      const h = helper()
      const base = h.button.attr("type", "button").attr("title", "Go").attr("name", "go")
      assert.deepStrictEqual(Object.entries(base.attr("type", "submit").attrs), [
        ["title", "Go"],
        ["name", "go"],
        ["type", "submit"]
      ])
      assert.deepStrictEqual(Object.entries(base.attr("title", undefined).attrs), [["type", "button"], ["name", "go"]])
      assert.strictEqual(base.attr("hidden", undefined).attrs, base.attrs)
      assert.deepStrictEqual(Object.keys(base.attrs), ["type", "title", "name"])
    })

    it("a handler set again without options drops the ones it had", () => {
      const h = helper()
      const once = h.button.on("click", add, { preventDefault: true }).on("focus", add, { preventDefault: "always" })
      assert.deepStrictEqual(once.eventOptions, {
        click: { preventDefault: true },
        focus: { preventDefault: "always" }
      })
      const again = once.on("click", add)
      assert.deepStrictEqual(again.handlers, { click: add, focus: add })
      assert.deepStrictEqual(again.eventOptions, { focus: { preventDefault: "always" } })
      assert.deepStrictEqual(once.eventOptions, {
        click: { preventDefault: true },
        focus: { preventDefault: "always" }
      })
      assert.strictEqual(h.button.on("click", add).eventOptions, h.button.eventOptions)
    })

    it("a builder class of the user's keeps the fields each of its builders holds", () => {
      // Only a toned builder holds `tone`.
      class Tagged extends View.ElementBuilder<TodoMessage> {
        declare tone: string | undefined
        toned(tone: string): this {
          const out = this.attr("data-tone", tone)
          out.tone = tone
          return out
        }
      }
      const plain = new Tagged("p").attr("id", "a")
      const toned = new Tagged("p").toned("warm").attr("id", "b").key("k")
      assert.isFalse("tone" in plain.attr("id", "c"))
      assert.instanceOf(toned, Tagged)
      assert.strictEqual(toned.tone, "warm")
      assert.deepStrictEqual(toned.attrs, { "data-tone": "warm", id: "b" })
      assert.strictEqual(toned.elementKey, "k")
    })
  })

  describe("classNames", () => {
    it("joins tokens with one space", () => {
      assert.strictEqual(Html.classNames("rounded px-3", "py-1"), "rounded px-3 py-1")
    })

    it("skips false, null, undefined and empty tokens", () => {
      assert.strictEqual(Html.classNames(false, "a", null, "", undefined, "b"), "a b")
    })

    it("returns an empty string when no token is left", () => {
      assert.strictEqual(Html.classNames(), "")
      assert.strictEqual(Html.classNames(false, null, undefined, ""), "")
    })
  })

  describe("Element.class", () => {
    it("still takes a single string", () => {
      assert.deepStrictEqual(button().class("primary").attrs, { class: "primary" })
    })

    it("joins several tokens and drops the falsy ones", () => {
      const saving = true
      const error: string | undefined = undefined
      const element = button().class("rounded px-3 py-1", saving && "opacity-50", error !== undefined && "ring-2")
      assert.deepStrictEqual(element.attrs, { class: "rounded px-3 py-1 opacity-50" })
    })

    it("removes the attribute when every token is falsy", () => {
      assert.deepStrictEqual(button().class(false, null, undefined, "").attrs, {})
      assert.deepStrictEqual(button().class("primary").class(false).attrs, {})
    })

    it.effect("renders the same classes on the server", () =>
      Effect.gen(function*() {
        const Classes = Component.define({
          name: "Classes",
          model: Schema.Struct({ saving: Schema.Boolean }),
          message: Schema.Never,
          elements: Html
        }).make({
          init: () => ({ saving: false }),
          update: (model) => model,
          view: (model, h) =>
            h.div(
              h.button.class("rounded", model.saving && "opacity-50", "px-3").children("Save"),
              h.p.class(model.saving && "busy").children("Idle")
            )
        })
        const rendered = yield* HtmlServer.renderToHtml(Classes, {})
        assert.include(rendered.html, `<button class="rounded px-3">Save</button>`)
        assert.include(rendered.html, "<p>Idle</p>")
      }))
  })
})

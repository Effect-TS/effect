// @vitest-environment happy-dom
import { assert, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema, Scope } from "effect"
import { Loader } from "effect/reactivity"
import { Command, Component, Route, Router, View } from "effect/ui"
import { BrowserHost, Html } from "effect/ui/html"
import { HtmlQuery } from "effect/ui/html/testing"
import { describe } from "vitest"
import { maxTitle, TodoApp } from "./fixtures/todos.ts"

/** Lets the render flush, Commands and the controlled-property restore run. */
const tick = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))

const container = Effect.acquireRelease(
  Effect.sync(() => document.body.appendChild(document.createElement("div"))),
  (element) => Effect.sync(() => element.remove())
)

// The tests share one document, and some of them move focus.
interface NativeTags<Msg> {
  readonly view: () => View.ElementBuilder<Msg>
}
interface NativeHost {
  readonly NativeHost: unique symbol
}
interface Native extends View.Elements {
  readonly Tags: NativeTags<this["Msg"]>
  readonly Host: NativeHost
}

describe("BrowserHost", { concurrent: false }, () => {
  it.effect("the layer provides the document's visibility and connectivity, and stops listening when closed", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const context = yield* Layer.buildWithScope(BrowserHost.layer(), scope)
      const visibility = Context.get(context, Loader.Visibility)
      const connectivity = Context.get(context, Loader.Connectivity)
      const seen: Array<string> = []
      visibility.subscribe(() => seen.push(`visible ${visibility.get()}`))
      connectivity.subscribe(() => seen.push(`online ${connectivity.get()}`))
      assert.deepStrictEqual([visibility.get(), connectivity.get()], [true, true])
      const setVisibility = (state: DocumentVisibilityState) => {
        Object.defineProperty(document, "visibilityState", { value: state, configurable: true })
        document.dispatchEvent(new Event("visibilitychange"))
      }
      setVisibility("hidden")
      setVisibility("visible")
      window.dispatchEvent(new Event("offline"))
      window.dispatchEvent(new Event("online"))
      // The window's focus is not visibility.
      window.dispatchEvent(new Event("blur"))
      assert.deepStrictEqual(seen, ["visible false", "visible true", "online false", "online true"])
      yield* Scope.close(scope, Exit.void)
      setVisibility("hidden")
      window.dispatchEvent(new Event("offline"))
      assert.deepStrictEqual([visibility.get(), connectivity.get()], [true, true])
      delete (document as { visibilityState?: unknown }).visibilityState
    }))

  describe("a todo app", () => {
    it.effect("adds, toggles, deletes and clears todos", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(TodoApp, {}, app)
        const field = HtmlQuery.getByRole(app, "textbox", { name: "New todo" }) as HTMLInputElement
        const add = HtmlQuery.getByRole(app, "button", { name: "Add" })

        for (const title of ["Buy milk", "Walk the dog", "Write docs"]) {
          HtmlQuery.input(field, title)
          yield* tick
          HtmlQuery.click(add)
          yield* tick
        }
        expect(field.value).toBe("")
        const list = HtmlQuery.getByRole(app, "list", { name: "Todos" })
        expect(HtmlQuery.queryAllByRole(list, "listitem").map((item) => item.textContent)).toEqual([
          "Buy milk×",
          "Walk the dog×",
          "Write docs×"
        ])
        expect(HtmlQuery.getByRole(app, "button", { name: "Clear done" }).hasAttribute("disabled")).toBe(true)

        // Toggling a row keeps every row's nodes.
        const before = HtmlQuery.queryAllByRole(list, "listitem")
        const walk = HtmlQuery.getByRole(app, "checkbox", { name: "Walk the dog" }) as HTMLInputElement
        HtmlQuery.click(walk)
        yield* tick
        expect(walk.checked).toBe(true)
        expect(root.model()!.todos.map((todo) => todo.done)).toEqual([false, true, false])
        expect(HtmlQuery.queryAllByRole(list, "listitem")).toEqual(before)
        expect(before[1]!.className).toBe("done")
        expect(HtmlQuery.queryAllByRole(app, "checkbox", { checked: true })).toEqual([walk])
        expect(app.textContent).toContain("2 items left")

        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Delete Buy milk" }))
        yield* tick
        expect(HtmlQuery.queryAllByRole(list, "listitem")).toEqual([before[1], before[2]])

        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Clear done" }))
        yield* tick
        expect(HtmlQuery.queryAllByRole(list, "listitem")).toEqual([before[2]])
        expect(app.textContent).toContain("1 item left")
      }).pipe(Effect.scoped))

    it.effect("submits with Enter in the field", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(TodoApp, {}, app)
        const field = HtmlQuery.getByRole(app, "textbox", { name: "New todo" })
        HtmlQuery.input(field, "Ship it")
        yield* tick
        HtmlQuery.submit(field)
        yield* tick
        expect(root.model()!.todos.map((todo) => todo.title)).toEqual(["Ship it"])
        expect(HtmlQuery.getByRole(app, "checkbox", { name: "Ship it" })).toBeDefined()
      }).pipe(Effect.scoped))
  })

  describe("controlled properties", () => {
    it.effect("a field keeps the Model's value when update rejects what the user typed", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(TodoApp, {}, app)
        const field = HtmlQuery.getByRole(app, "textbox", { name: "New todo" }) as HTMLInputElement
        HtmlQuery.input(field, "Short title")
        yield* tick
        expect(field.value).toBe("Short title")

        const tooLong = "x".repeat(maxTitle + 1)
        HtmlQuery.input(field, tooLong)
        expect(field.value).toBe(tooLong)
        yield* tick
        expect(root.model()!.draft).toBe("Short title")
        expect(field.value).toBe("Short title")
      }).pipe(Effect.scoped))

    const Message = Schema.TaggedUnion({ Typed: { value: Schema.String }, Checked: { checked: Schema.Boolean } })
    const Form = Component.make({
      name: "Form",
      model: Schema.Struct({ text: Schema.String, checked: Schema.Boolean, open: Schema.Boolean }),
      message: Message,
      elements: Html,
      init: () => ({ text: "fixed", checked: false, open: true }),
      // Every change is rejected.
      update: (model) => model,
      view: (model, h) =>
        h.div(
          // A handler that ignores the event: nothing reaches update.
          h.input().attr("aria-label", "Ignored").value(model.text).onInput(() => undefined),
          // No handler at all: the field is read-only, as the Model never changes.
          h.textarea().attr("aria-label", "Unhandled").value(model.text),
          h.input().attr("type", "checkbox").attr("aria-label", "Agree").checked(model.checked)
            .onInput(({ checked }) => Message.make({ _tag: "Checked", checked })),
          h.select(h.option("A").attr("value", "a"), h.option("B").attr("value", "b"))
            .attr("aria-label", "Pick")
            .value("b"),
          h.details(h.summary("More"), "Details").open(model.open)
        )
    })

    it.effect("an ignored or unhandled change is put back", () =>
      Effect.gen(function*() {
        const app = yield* container
        yield* BrowserHost.mountEffect(Form, {}, app)
        const ignored = HtmlQuery.getByRole(app, "textbox", { name: "Ignored" }) as HTMLInputElement
        const unhandled = HtmlQuery.getByRole(app, "textbox", { name: "Unhandled" }) as HTMLTextAreaElement
        const select = HtmlQuery.getByRole(app, "combobox", { name: "Pick" }) as HTMLSelectElement
        expect(select.value).toBe("b")

        HtmlQuery.input(ignored, "typed")
        HtmlQuery.input(unhandled, "typed")
        select.value = "a"
        select.dispatchEvent(new Event("change", { bubbles: true }))
        yield* tick
        expect(ignored.value).toBe("fixed")
        expect(unhandled.value).toBe("fixed")
        expect(select.value).toBe("b")
      }).pipe(Effect.scoped))

    it.effect("a checkbox keeps the Model's state when update rejects the click", () =>
      Effect.gen(function*() {
        const app = yield* container
        yield* BrowserHost.mountEffect(Form, {}, app)
        const box = HtmlQuery.getByRole(app, "checkbox", { name: "Agree" }) as HTMLInputElement
        HtmlQuery.click(box)
        yield* tick
        expect(box.checked).toBe(false)
      }).pipe(Effect.scoped))

    it.effect("a form reset is put back to what the Model says", () =>
      Effect.gen(function*() {
        const Resettable = Component.make({
          name: "Resettable",
          model: Schema.Null,
          message: Schema.Never,
          elements: Html,
          init: () => null,
          update: (model) => model,
          view: (_, h) =>
            h.form(
              h.input().attr("aria-label", "Name").value("fixed"),
              h.input().attr("type", "checkbox").attr("aria-label", "Agree").checked(true),
              h.select(h.option("A").attr("value", "a"), h.option("B").attr("value", "b").selected(true))
                .attr("aria-label", "Pick")
            )
        })
        const app = yield* container
        yield* BrowserHost.mountEffect(Resettable, {}, app)
        const name = HtmlQuery.getByRole(app, "textbox", { name: "Name" }) as HTMLInputElement
        const agree = HtmlQuery.getByRole(app, "checkbox", { name: "Agree" }) as HTMLInputElement
        const pick = HtmlQuery.getByRole(app, "combobox", { name: "Pick" }) as HTMLSelectElement
        app.querySelector("form")!.reset()
        expect([name.value, agree.checked, pick.value]).toEqual(["", false, "a"])
        yield* tick
        expect([name.value, agree.checked, pick.value]).toEqual(["fixed", true, "b"])
      }).pipe(Effect.scoped))

    it.effect("accepting what the user typed leaves the caret where it is", () =>
      Effect.gen(function*() {
        const app = yield* container
        yield* BrowserHost.mountEffect(TodoApp, {}, app)
        const field = HtmlQuery.getByRole(app, "textbox", { name: "New todo" }) as HTMLInputElement
        HtmlQuery.input(field, "abcdef")
        yield* tick
        field.setSelectionRange(2, 2)
        HtmlQuery.input(field, "abXcdef")
        field.setSelectionRange(3, 3)
        yield* tick
        expect(field.value).toBe("abXcdef")
        expect(field.selectionStart).toBe(3)
      }).pipe(Effect.scoped))
  })

  describe("a field bound to the URL", () => {
    const SearchRoute = Route.union({
      Search: Route.make("/search", { query: { q: Schema.optional(Schema.String) } }),
      NotFound: Route.make("/*")
    })
    const SearchMessage = Schema.TaggedUnion({
      Typed: { value: Schema.String },
      Patched: { outcome: Schema.Literals(["navigated", "blocked", "stale"]) }
    })
    // The query is the only copy of the text: the page's Model holds none. Digits are rejected.
    const SearchPage = Component.make({
      name: "SearchPage",
      props: Schema.Struct({ route: SearchRoute.subset(["Search"]) }),
      model: Schema.Struct({}),
      message: SearchMessage,
      elements: Html,
      init: () => ({}),
      update: (model, message, $) =>
        SearchMessage.match(message, {
          Typed: ({ value }) =>
            /\d/.test(value)
              ? model
              : $.run(
                Router.patchQuery(SearchRoute, $.props.route, { q: value || undefined }).pipe(
                  Command.map((outcome) => SearchMessage.make({ _tag: "Patched", outcome }))
                )
              ),
          Patched: () => model
        }),
      view: (_, h) =>
        h.input().attr("aria-label", "Search").value(h.props.route.query.q ?? "").onInput(({ value }) =>
          SearchMessage.make({ _tag: "Typed", value })
        )
    })
    const AppMessage = Schema.TaggedUnion({ ChangedRoute: { route: SearchRoute } })
    const SearchApp = Component.make({
      name: "SearchApp",
      props: Schema.Struct({ route: SearchRoute }),
      model: Schema.Struct({ route: SearchRoute }),
      message: AppMessage,
      elements: Html,
      init: ($) => ({ route: $.props.route }),
      update: (_, { route }) => ({ route }),
      subscriptions: (model) => [
        Router.subscription(SearchRoute, model.route, (route) => AppMessage.make({ _tag: "ChangedRoute", route }))
      ],
      view: (model, h) =>
        SearchRoute.match(model.route, {
          Search: (route) => h.child(SearchPage, { key: SearchRoute.printPath(route), props: { route } }),
          NotFound: () => h.p("Not found")
        })
    })

    /**
     * Runs a test with the app mounted at `url`. Every value the host writes to the field is
     * recorded, and `type` changes it as the user would, without recording.
     */
    const withSearch = <A, E>(
      body: (search: {
        readonly field: HTMLInputElement
        readonly history: ReturnType<typeof Router.memoryHistory>
        readonly type: (value: string) => void
        readonly writes: ReadonlyArray<string>
      }) => Effect.Effect<A, E, Scope.Scope>,
      url = "/search"
    ) => {
      const history = Router.memoryHistory(url)
      return Effect.gen(function*() {
        const app = yield* container
        yield* BrowserHost.mountEffect(SearchApp, Router.props(SearchRoute), app)
        const field = HtmlQuery.getByRole(app, "textbox", { name: "Search" }) as HTMLInputElement
        const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
        const writes: Array<string> = []
        Object.defineProperty(field, "value", {
          configurable: true,
          get: () => native.get!.call(field),
          set: (value: string) => {
            writes.push(value)
            native.set!.call(field, value)
          }
        })
        const type = (value: string) => {
          native.set!.call(field, value)
          field.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }))
        }
        return yield* body({ field, history, type, writes })
      }).pipe(Effect.scoped, Effect.provide(Router.memory({ routes: SearchRoute, history })))
    }

    it.effect("an accepted keystroke writes nothing back, and the caret stays", () =>
      withSearch(({ field, history, type, writes }) =>
        Effect.gen(function*() {
          type("abcdef")
          yield* tick
          field.setSelectionRange(2, 2)
          type("abXcdef")
          field.setSelectionRange(3, 3)
          yield* tick
          expect(field.value).toBe("abXcdef")
          expect(field.selectionStart).toBe(3)
          expect(history.entries()).toEqual(["/search?q=abXcdef"])
          expect(writes).toEqual([])
        })
      ))

    it.effect("two keystrokes inside one round trip write nothing back", () =>
      withSearch(({ field, history, type, writes }) =>
        Effect.gen(function*() {
          type("a")
          type("ab")
          yield* tick
          expect(field.value).toBe("ab")
          expect(history.entries()).toEqual(["/search?q=ab"])
          expect(writes).toEqual([])
        })
      ))

    it.effect("fast typing loses no characters, keeps the caret and keeps the params the route doesn't declare", () =>
      withSearch(({ field, history, type, writes }) =>
        Effect.gen(function*() {
          let text = ""
          for (const char of "effect") {
            text += char
            type(text)
            field.setSelectionRange(text.length, text.length)
          }
          yield* tick
          field.setSelectionRange(1, 1)
          type("eXffect")
          field.setSelectionRange(2, 2)
          type("eXYffect")
          field.setSelectionRange(3, 3)
          yield* tick
          expect(field.value).toBe("eXYffect")
          expect(field.selectionStart).toBe(3)
          expect(history.entries()).toEqual(["/search?q=eXYffect&utm_source=news"])
          expect(writes).toEqual([])
        }), "/search?utm_source=news"))

    it.effect("a rejected keystroke is put back", () =>
      withSearch(({ field, history, type }) =>
        Effect.gen(function*() {
          type("ab")
          yield* tick
          type("ab1")
          yield* tick
          expect(field.value).toBe("ab")
          expect(history.entries()).toEqual(["/search?q=ab"])
        })
      ))
  })

  describe("events", () => {
    const Message = Schema.TaggedUnion({
      Clicked: { where: Schema.String },
      Key: { key: Schema.String, shift: Schema.Boolean },
      Submitted: { title: Schema.String, tags: Schema.Array(Schema.String) },
      Focused: { where: Schema.String }
    })
    const Events = Component.make({
      name: "Events",
      model: Schema.Array(Schema.String),
      message: Message,
      elements: Html,
      init: (): ReadonlyArray<string> => [],
      update: (log, message) =>
        Message.match(message, {
          Clicked: ({ where }) => [...log, `click ${where}`],
          Key: ({ key, shift }) => [...log, `key ${key}${shift ? " shift" : ""}`],
          Submitted: ({ tags, title }) => [...log, `submit ${title} [${tags.join(",")}]`],
          Focused: ({ where }) => [...log, `focus ${where}`]
        }),
      view: (_, h) =>
        h.div(
          h.section(
            h.button("Inner").onClick(Message.make({ _tag: "Clicked", where: "inner" })),
            h.button("Plain")
          ).attr("aria-label", "Outer").onClick(Message.make({ _tag: "Clicked", where: "outer" })),
          h.div(h.input().attr("aria-label", "Focus me"))
            .on("focus", Message.make({ _tag: "Focused", where: "div" })),
          h.input().attr("aria-label", "Keys")
            .onKeyDown(({ key, shift }) => Message.make({ _tag: "Key", key, shift }))
            .onFocus(Message.make({ _tag: "Focused", where: "keys" })),
          h.form(
            h.input().attr("name", "title").attr("aria-label", "Title").attr("value", "Hello"),
            h.input().attr("type", "checkbox").attr("name", "tag").attr("value", "a").attr("checked", ""),
            h.input().attr("type", "checkbox").attr("name", "tag").attr("value", "b").attr("checked", ""),
            h.button("Send").attr("type", "submit")
          ).onSubmit(({ entries, fields }) =>
            Message.make({
              _tag: "Submitted",
              title: fields.title ?? "",
              tags: entries.filter(([name]) => name === "tag").map(([, value]) => value)
            })
          )
        )
    })

    it.effect("only the innermost element with a handler gets an event", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Events, {}, app)
        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Inner" }))
        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Plain" }))
        yield* tick
        expect(root.model()).toEqual(["click inner", "click outer"])
      }).pipe(Effect.scoped))

    it.effect("focus doesn't bubble", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Events, {}, app)
        ;(HtmlQuery.getByRole(app, "textbox", { name: "Focus me" }) as HTMLInputElement).focus()
        ;(HtmlQuery.getByRole(app, "textbox", { name: "Keys" }) as HTMLInputElement).focus()
        yield* tick
        expect(root.model()).toEqual(["focus keys"])
      }).pipe(Effect.scoped))

    it.effect("payloads are plain data", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Events, {}, app)
        HtmlQuery.keyDown(HtmlQuery.getByRole(app, "textbox", { name: "Keys" }), "Enter", { shift: true })
        yield* tick
        expect(root.model()).toEqual(["key Enter shift"])
      }).pipe(Effect.scoped))

    it.effect("submit sends the form's fields and prevents the browser's submission", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Events, {}, app)
        const form = app.querySelector("form")!
        const event = new Event("submit", { bubbles: true, cancelable: true })
        form.dispatchEvent(event)
        yield* tick
        expect(event.defaultPrevented).toBe(true)
        expect(root.model()).toEqual(["submit Hello [a,b]"])
      }).pipe(Effect.scoped))

    it.effect("a form without a submit handler is still prevented; a form outside the app isn't", () =>
      Effect.gen(function*() {
        const app = yield* container
        const outside = yield* container
        outside.innerHTML = "<form></form>"
        // `Events` handles submit on its own form, so the document listener is already there.
        yield* BrowserHost.mountEffect(Events, {}, app)
        const Bare = Component.make({
          name: "Bare",
          model: Schema.Null,
          message: Schema.Never,
          elements: Html,
          init: () => null,
          update: (model) => model,
          view: (_, h) => h.form(h.input().attr("name", "q"))
        })
        const bare = yield* container
        yield* BrowserHost.mountEffect(Bare, {}, bare)
        const submitted = (form: HTMLFormElement) => {
          const event = new Event("submit", { bubbles: true, cancelable: true })
          form.dispatchEvent(event)
          return event.defaultPrevented
        }
        expect(submitted(bare.querySelector("form")!)).toBe(true)
        expect(submitted(outside.querySelector("form")!)).toBe(false)
      }).pipe(Effect.scoped))

    it.effect("fields named like Object.prototype members are kept", () =>
      Effect.gen(function*() {
        const seen: Array<Html.SubmitPayload> = []
        const Prototype = Component.make({
          name: "Prototype",
          model: Schema.Null,
          message: Schema.Never,
          elements: Html,
          init: () => null,
          update: (model) => model,
          view: (_, h) =>
            h.form(
              h.input().attr("name", "constructor").attr("value", "a"),
              h.input().attr("name", "__proto__").attr("value", "b"),
              h.input().attr("name", "toString").attr("value", "c"),
              h.input().attr("name", "toString").attr("value", "d")
            ).onSubmit((payload) => {
              seen.push(payload)
              return undefined
            })
        })
        const app = yield* container
        yield* BrowserHost.mountEffect(Prototype, {}, app)
        HtmlQuery.submit(app.querySelector("form")!)
        const { entries, fields } = seen[0]!
        expect(Object.keys(fields)).toEqual(["constructor", "__proto__", "toString"])
        expect([fields.constructor, fields["__proto__"], fields.toString]).toEqual(["a", "b", "c"])
        expect(entries).toEqual([["constructor", "a"], ["__proto__", "b"], ["toString", "c"], ["toString", "d"]])
      }).pipe(Effect.scoped))
  })

  describe("refs and mounts", () => {
    const Field = Html.ref("Field", "input")
    const Missing = Html.ref("Missing", "input")
    const Message = Schema.TaggedUnion({
      Focus: {},
      FocusMissing: {},
      Measure: {},
      Found: { found: Schema.Boolean },
      Measured: { some: Schema.Boolean },
      Mounted: { tag: Schema.String }
    })
    const Refs = Component.make({
      name: "Refs",
      model: Schema.Array(Schema.String),
      message: Message,
      elements: Html,
      init: (): ReadonlyArray<string> => [],
      update: (log, message, $) =>
        Message.match(message, {
          Focus: () => $.run(Html.focus(Field, ({ found }) => Message.make({ _tag: "Found", found }))),
          FocusMissing: () => $.run(Html.focus(Missing, ({ found }) => Message.make({ _tag: "Found", found }))),
          Measure: () =>
            $.run(Html.measure(Field, (rect) => Message.make({ _tag: "Measured", some: Option.isSome(rect) }))),
          Found: ({ found }) => [...log, `found ${found}`],
          Measured: ({ some }) => [...log, `measured ${some}`],
          Mounted: ({ tag }) => [...log, `mounted ${tag}`]
        }),
      view: (_, h) =>
        h.div(
          h.input().attr("aria-label", "Field").ref(Field)
            .onMount("tag", (element) => Effect.succeed(Message.make({ _tag: "Mounted", tag: element.localName })))
        )
    })

    it.effect("ref Commands reach the element; onMount gets it", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Refs, {}, app)
        yield* tick
        root.send(Message.make({ _tag: "Focus" }))
        root.send(Message.make({ _tag: "FocusMissing" }))
        root.send(Message.make({ _tag: "Measure" }))
        yield* tick
        expect(document.activeElement).toBe(HtmlQuery.getByRole(app, "textbox", { name: "Field" }))
        expect(root.model()).toEqual(["mounted input", "found true", "found false", "measured true"])
      }).pipe(Effect.scoped))
  })

  describe("hosts", () => {
    const Native: View.Vocabulary<Native> = {
      name: "native",
      tags: { view: () => new View.ElementBuilder("view", []) }
    }
    const NativeBox = Component.make({
      name: "NativeBox",
      model: Schema.Null,
      message: Schema.Never,
      elements: Native,
      init: () => null,
      update: (model) => model,
      view: (_, h) => h.view()
    })
    const Page = Component.make({
      name: "Page",
      model: Schema.Null,
      message: Schema.Never,
      elements: Html,
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.div(
          h.p("before"),
          h.child(NativeBox, {
            key: "box",
            fallback: () => h.p("wrong host")
          }),
          h.p("after")
        )
    })

    it.effect("a nested component of another vocabulary fails its own slot", () =>
      Effect.gen(function*() {
        const app = yield* container
        yield* BrowserHost.mountEffect(Page, {}, app)
        yield* tick
        expect(app.textContent).toBe("beforewrong hostafter")
      }).pipe(Effect.scoped))

    it.effect("closing the Scope removes the nodes and stops their events", () =>
      Effect.gen(function*() {
        const app = yield* container
        const scope = yield* Scope.make()
        const root = yield* BrowserHost.mountEffect(TodoApp, {}, app).pipe(Scope.provide(scope))
        const field = HtmlQuery.getByRole(app, "textbox", { name: "New todo" })
        yield* Scope.close(scope, Exit.void)
        expect(app.childNodes.length).toBe(0)
        // A detached node from the old tree no longer reaches it.
        app.appendChild(field)
        HtmlQuery.input(field, "late")
        yield* tick
        expect(root.model()?.draft ?? "").toBe("")
      }).pipe(Effect.scoped))

    it.effect("mount is a Layer: the tree is live while it is built, and closing it removes the nodes", () =>
      Effect.gen(function*() {
        const app = yield* container
        const scope = yield* Scope.make()
        yield* Layer.buildWithScope(BrowserHost.mount(TodoApp, {}, app), scope)
        HtmlQuery.input(HtmlQuery.getByRole(app, "textbox", { name: "New todo" }), "Buy milk")
        yield* tick
        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Add" }))
        yield* tick
        const list = HtmlQuery.getByRole(app, "list", { name: "Todos" })
        expect(HtmlQuery.queryAllByRole(list, "listitem").map((item) => item.textContent)).toEqual(["Buy milk×"])
        yield* Scope.close(scope, Exit.void)
        expect(app.childNodes.length).toBe(0)
      }).pipe(Effect.scoped))
  })
})

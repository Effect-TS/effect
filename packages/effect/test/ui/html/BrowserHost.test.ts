// @vitest-environment happy-dom
import { assert, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema, Scope } from "effect"
import { Loader } from "effect/reactivity"
import { Command, Component, MessageLog, type Renderer, Route, Router, View } from "effect/ui"
import { BrowserHost, Html } from "effect/ui/html"
import { HtmlQuery } from "effect/ui/html/testing"
import { describe, vi } from "vitest"
import { Confirm, ConfirmMessage, Nested } from "./fixtures/confirm.ts"
import { Menu, MenuMessage, ModalMenu, popoverStub, Rows } from "./fixtures/popover.ts"
import { maxTitle, TodoApp } from "./fixtures/todos.ts"

/** Lets the render flush, Commands and the controlled-property restore run. */
const tick = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))

const container = Effect.acquireRelease(
  Effect.sync(() => document.body.appendChild(document.createElement("div"))),
  (element) => Effect.sync(() => element.remove())
)

// The tests share one document, and some of them move focus.
interface NativeTags<Msg> {
  readonly view: View.ElementBuilder<Msg>
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
          h.input.attr("aria-label", "Ignored").value(model.text).onInput(() => undefined),
          // No handler at all: the field is read-only, as the Model never changes.
          h.textarea.attr("aria-label", "Unhandled").value(model.text),
          h.input.attr("type", "checkbox").attr("aria-label", "Agree").checked(model.checked)
            .onInput(({ checked }) => Message.make({ _tag: "Checked", checked })),
          h.select
            .attr("aria-label", "Pick")
            .value("b").children(h.option.attr("value", "a").children("A"), h.option.attr("value", "b").children("B")),
          h.details.open(model.open).children(h.summary("More"), "Details")
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
              h.input.attr("aria-label", "Name").value("fixed"),
              h.input.attr("type", "checkbox").attr("aria-label", "Agree").checked(true),
              h.select
                .attr("aria-label", "Pick").children(
                  h.option.attr("value", "a").children("A"),
                  h.option.attr("value", "b").selected(true).children("B")
                )
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
        h.input.attr("aria-label", "Search").value(h.props.route.query.q ?? "").onInput(({ value }) =>
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
          h.section.attr("aria-label", "Outer").onClick(Message.make({ _tag: "Clicked", where: "outer" })).children(
            h.button.onClick(Message.make({ _tag: "Clicked", where: "inner" })).children("Inner"),
            h.button("Plain")
          ),
          h.div
            .on("focus", Message.make({ _tag: "Focused", where: "div" })).children(
              h.input.attr("aria-label", "Focus me")
            ),
          h.input.attr("aria-label", "Keys")
            .onKeyDown(({ key, shift }) => Message.make({ _tag: "Key", key, shift }))
            .onFocus(Message.make({ _tag: "Focused", where: "keys" })),
          h.form.onSubmit(({ entries, fields }) =>
            Message.make({
              _tag: "Submitted",
              title: fields.title ?? "",
              tags: entries.filter(([name]) => name === "tag").map(([, value]) => value)
            })
          ).children(
            h.input.attr("name", "title").attr("aria-label", "Title").attr("value", "Hello"),
            h.input.attr("type", "checkbox").attr("name", "tag").attr("value", "a").attr("checked", ""),
            h.input.attr("type", "checkbox").attr("name", "tag").attr("value", "b").attr("checked", ""),
            h.button.attr("type", "submit").children("Send")
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
          view: (_, h) => h.form(h.input.attr("name", "q"))
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

    it.effect("preventDefault cancels the default only when the handler sends, before the message is sent", () =>
      Effect.gen(function*() {
        let event: Event | undefined
        const seen: Array<string> = []
        const Composer = Component.make({
          name: "Composer",
          model: Schema.Number,
          message: Schema.Literals(["Send", "Menu"]),
          elements: Html,
          init: () => 0,
          update: (count, message) => {
            seen.push(`${message} prevented=${event?.defaultPrevented}`)
            return count + 1
          },
          view: (_, h) =>
            h.div.on("contextmenu", "Menu", { preventDefault: true }).children(
              h.textarea.attr("aria-label", "Message").onKeyDown(
                ({ composing, key, shift }) => key === "Enter" && !shift && !composing ? "Send" : undefined,
                { preventDefault: true }
              )
            )
        })
        const app = yield* container
        yield* BrowserHost.mountEffect(Composer, {}, app)
        const field = HtmlQuery.getByRole(app, "textbox", { name: "Message" })
        const fire = (next: Event) => {
          event = next
          field.dispatchEvent(next)
          return next.defaultPrevented
        }
        const key = (init: KeyboardEventInit) =>
          fire(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }))
        expect(key({ key: "Enter" })).toBe(true)
        expect(key({ key: "Enter", shiftKey: true })).toBe(false)
        // The Enter that ends an IME composition is the input method's.
        expect(key({ key: "Enter", isComposing: true })).toBe(false)
        expect(fire(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))).toBe(true)
        // `update` ran after the default was cancelled.
        expect(seen).toEqual(["Send prevented=true", "Menu prevented=true"])
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
            h.form.onSubmit((payload) => {
              seen.push(payload)
              return undefined
            }).children(
              h.input.attr("name", "constructor").attr("value", "a"),
              h.input.attr("name", "__proto__").attr("value", "b"),
              h.input.attr("name", "toString").attr("value", "c"),
              h.input.attr("name", "toString").attr("value", "d")
            )
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

  describe("drag and drop", () => {
    /** A `DataTransfer` as a browser shows it: string types as set, and `"Files"` when it carries files. */
    class Transfer {
      dropEffect = "none"
      effectAllowed = "uninitialized"
      readonly strings = new Map<string, string>()
      constructor(readonly files: ReadonlyArray<File> = []) {}
      get types() {
        return [...this.strings.keys(), ...(this.files.length > 0 ? ["Files"] : [])]
      }
      setData(type: string, value: string) {
        this.strings.set(type.toLowerCase(), value)
      }
      getData(type: string) {
        return this.strings.get(type.toLowerCase()) ?? ""
      }
    }
    /** Fires a drag event at `element`, reporting whether its default was cancelled. */
    const drag = (element: Element, name: string, transfer: Transfer, at = { x: 0, y: 0 }) => {
      const event = new MouseEvent(name, { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y })
      Object.defineProperty(event, "dataTransfer", { value: transfer })
      element.dispatchEvent(event)
      return event.defaultPrevented
    }
    const box = (element: Element, left: number, top: number, width: number, height: number) => {
      element.getBoundingClientRect = () => ({ left, top, width, height }) as DOMRect
    }
    const byLabel = (app: Element, label: string) => app.querySelector(`[aria-label="${label}"]`)!

    const Board = Component.make({
      name: "Board",
      model: Schema.Array(Schema.String),
      message: Schema.String,
      elements: Html,
      init: (): ReadonlyArray<string> => [],
      update: (log, message) => [...log, message],
      view: (_, h) =>
        h.div(
          // Either order keeps the data and the handler.
          h.p.attr("aria-label", "Milk").draggable({ "application/x-todo": "milk" }, { effectAllowed: "move" })
            .onDragStart("start milk").onDragEnd(({ dropped }) => `end milk dropped=${dropped}`).children("Milk"),
          h.p.attr("aria-label", "Eggs").onDragStart("start eggs").draggable({ "application/x-todo": "eggs" }).children(
            "Eggs"
          ),
          h.section.attr("aria-label", "Done")
            .onDrop(
              ({ data, files, height, width, x, y }) =>
                `drop ${
                  data["application/x-todo"] ?? files.map((file) => file.name).join(",")
                } at ${x},${y} of ${width}x${height}`,
              { accepts: ["application/x-todo", "Files"], dropEffect: "move" }
            )
            .onDragEnter("enter").onDragLeave("leave")
            .onDragOver(({ x, y }) => `over ${x},${y}`).children(
              h.p.attr("aria-label", "Header").children("Header"),
              h.p.attr("aria-label", "Body").children("Body"),
              h.div.attr("aria-label", "Inner")
                .onDrop(({ data }) => `inner drop ${data["application/x-todo"]}`, { accepts: ["text/uri-list"] })
                .onDragEnter("inner enter").onDragLeave("inner leave").children(
                  h.p.attr("aria-label", "Inner child").children("Inner child")
                )
            )
        )
    })

    it.effect("a drag between two elements carries the source's data, and the source hears it was dropped", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Board, {}, app)
        const done = byLabel(app, "Done")
        box(done, 10, 20, 200, 100)
        for (const name of ["Milk", "Eggs"]) {
          const transfer = new Transfer()
          drag(byLabel(app, name), "dragstart", transfer)
          expect(transfer.getData("application/x-todo")).toBe(name.toLowerCase())
          if (name === "Milk") expect(transfer.effectAllowed).toBe("move")
        }
        const transfer = new Transfer()
        drag(byLabel(app, "Milk"), "dragstart", transfer)
        expect(drag(done, "dragenter", transfer)).toBe(true)
        expect(transfer.dropEffect).toBe("move")
        expect(drag(done, "drop", transfer, { x: 60, y: 45 })).toBe(true)
        // The browser reports no effect on `dragend` here; the host saw the drop.
        drag(byLabel(app, "Milk"), "dragend", transfer)
        yield* tick
        expect(root.model()).toEqual([
          "start milk",
          "start eggs",
          "start milk",
          "enter",
          "drop milk at 50,25 of 200x100",
          "leave",
          "end milk dropped=true"
        ])
      }).pipe(Effect.scoped))

    it.effect("a drag of a type no target accepts is left alone, so the browser refuses the drop", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Board, {}, app)
        const transfer = new Transfer()
        transfer.setData("text/plain", "hello")
        const done = byLabel(app, "Done")
        expect([drag(done, "dragenter", transfer), drag(done, "dragover", transfer), drag(done, "drop", transfer)])
          .toEqual([false, false, false])
        drag(byLabel(app, "Milk"), "dragend", transfer)
        yield* tick
        expect(root.model()).toEqual(["end milk dropped=false"])
      }).pipe(Effect.scoped))

    it.effect("a file drop sends the files, and the log's wire encoding replaces a message it can't encode", () =>
      Effect.gen(function*() {
        const Message = Schema.TaggedUnion({ Dropped: { files: Schema.Array(Schema.instanceOf(File)) } })
        const Uploader = Component.make({
          name: "Uploader",
          model: Schema.Array(Schema.String),
          message: Message,
          elements: Html,
          init: (): ReadonlyArray<string> => [],
          // Plain facts about the files go in the Model; the files themselves would go on to a Command.
          update: (names, { files }) => [...names, ...files.map((file) => `${file.name} ${file.size}`)],
          view: (_, h) =>
            h.div.attr("aria-label", "Upload").onDrop(
              ({ files }) => Message.make({ _tag: "Dropped", files }),
              { accepts: ["Files"], dropEffect: "copy" }
            )
        })
        const log = MessageLog.makeMemory()
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Uploader, {}, app).pipe(
          Effect.provideService(MessageLog.MessageLog, log)
        )
        const transfer = new Transfer([new File(["hello"], "notes.txt")])
        const upload = byLabel(app, "Upload")
        expect(drag(upload, "dragover", transfer)).toBe(true)
        expect(drag(upload, "drop", transfer)).toBe(true)
        yield* tick
        expect(root.model()).toEqual(["notes.txt 5"])
        const update = log.entries().find((entry) => entry._tag === "Update")!
        const warnings: Array<string> = []
        const wire = MessageLog.makeEncoder({ onWarning: (warning) => warnings.push(warning) }).encode(update)
        expect((wire as MessageLog.WireEntry & { readonly message: unknown }).message).toEqual({
          "~unserialisable": "encode"
        })
        expect(warnings).toHaveLength(1)
      }).pipe(Effect.scoped))

    it.effect("enter and leave follow the active target, not its children, and a window exit leaves", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Board, {}, app)
        const todo = new Transfer()
        todo.setData("application/x-todo", "milk")
        const [header, body] = [byLabel(app, "Header"), byLabel(app, "Body")]
        drag(header, "dragenter", todo)
        // The spec's order: the enter of the element reached, then the leave of the one left.
        drag(body, "dragenter", todo)
        drag(header, "dragleave", todo)
        yield* tick
        // The other order, with the check for a window exit in between.
        drag(body, "dragleave", todo)
        drag(header, "dragenter", todo)
        yield* tick
        expect(root.model()).toEqual(["enter"])
        // Leaving the document: a leave with no enter after it.
        drag(header, "dragleave", todo)
        expect(root.model()).toEqual(["enter"])
        yield* tick
        expect(root.model()).toEqual(["enter", "leave"])

        // A nested target that accepts the drag takes over from the outer one, and hands back.
        const link = new Transfer()
        link.setData("text/uri-list", "https://example.com")
        link.setData("application/x-todo", "milk")
        drag(body, "dragenter", link)
        drag(byLabel(app, "Inner child"), "dragenter", link)
        drag(body, "dragleave", link)
        drag(body, "dragenter", link)
        drag(byLabel(app, "Inner child"), "dragleave", link)
        yield* tick
        expect(root.model()?.slice(2)).toEqual(["enter", "leave", "inner enter", "inner leave", "enter"])
      }).pipe(Effect.scoped))

    /** Binds handlers on a bare host, as the renderer does, and records what they send. */
    const bare = (seen: Array<unknown>) => {
      const host = BrowserHost.makeHost(document)
      const dispatch: Renderer.Dispatch = (_, handler, payload, onMessage) => {
        const message = typeof handler === "function" ? (handler as (payload: unknown) => unknown)(payload) : handler
        if (message === undefined) return
        onMessage?.()
        seen.push(message)
      }
      return Effect.acquireRelease(Effect.succeed({ host, dispatch }), () => Effect.sync(() => host.dispose()))
    }
    /** The options `onDrop` stores, for a target bound by hand. */
    const accepting = (...accepts: ReadonlyArray<string>): Renderer.EventOptions => {
      const drop: Html.DropTargetOptions = { accepts, preventDefault: "always" }
      return { drop }
    }

    it.effect("a queued dragover is dropped when a render takes the target's onDrop away or changes what it accepts", () =>
      Effect.gen(function*() {
        for (const rebound of [{}, { drop: () => undefined }]) {
          const seen: Array<unknown> = []
          const { dispatch, host } = yield* bare(seen)
          const element = (yield* container).appendChild(document.createElement("div"))
          const over = (payload: Html.DragOverPayload) => `over ${payload.y}`
          host.setEvents(element, { drop: () => undefined, dragover: over }, dispatch, accepting("application/x-todo"))
          const todo = new Transfer()
          todo.setData("application/x-todo", "milk")
          drag(element, "dragenter", todo)
          drag(element, "dragover", todo, { x: 0, y: 5 })
          // Before the frame, the element keeps its position handler, but no longer takes this drag.
          host.setEvents(element, { ...rebound, dragover: over }, dispatch, accepting("text/uri-list"))
          yield* tick
          expect(seen).toEqual([])
        }
      }).pipe(Effect.scoped))

    it.effect("dropped starts over with every drag, even from a source with only onDragEnd", () =>
      Effect.gen(function*() {
        const seen: Array<unknown> = []
        const { dispatch, host } = yield* bare(seen)
        const app = yield* container
        const link = app.appendChild(document.createElement("a"))
        const target = app.appendChild(document.createElement("div"))
        host.setEvents(link, { dragend: ({ dropped }: Html.DragEndPayload) => `dropped=${dropped}` }, dispatch, {})
        host.setEvents(target, { drop: () => undefined }, dispatch, accepting("text/uri-list"))
        const first = new Transfer()
        first.setData("text/uri-list", "https://example.com")
        drag(link, "dragstart", first)
        drag(target, "dragover", first)
        drag(target, "drop", first)
        drag(link, "dragend", first)
        // A second drag, cancelled: the browser reports no effect.
        const second = new Transfer()
        second.setData("text/uri-list", "https://example.com")
        drag(link, "dragstart", second)
        drag(link, "dragend", second)
        expect(seen).toEqual(["dropped=true", "dropped=false"])
      }).pipe(Effect.scoped))

    it.effect("dragover is sent once per frame when the position changed, and a queued one is dropped", () =>
      Effect.gen(function*() {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Board, {}, app)
        const done = byLabel(app, "Done")
        box(done, 0, 0, 100, 100)
        const todo = new Transfer()
        todo.setData("application/x-todo", "milk")
        drag(done, "dragenter", todo)
        for (const y of [1, 2, 3]) drag(done, "dragover", todo, { x: 5, y })
        yield* tick
        drag(done, "dragover", todo, { x: 5, y: 3 })
        yield* tick
        // Queued, then the target stops being active before the frame.
        drag(done, "dragover", todo, { x: 5, y: 9 })
        drag(byLabel(app, "Milk"), "dragenter", todo)
        yield* tick
        // Queued, then the drag ends with a drop.
        drag(done, "dragover", todo, { x: 5, y: 7 })
        drag(done, "drop", todo, { x: 5, y: 7 })
        yield* tick
        expect(root.model()).toEqual([
          "enter",
          "over 5,3",
          "leave",
          "enter",
          "drop milk at 5,7 of 100x100",
          "leave"
        ])
      }).pipe(Effect.scoped))
  })

  describe("modal dialogs", () => {
    /**
     * Records `showModal` and `close`, and makes `showModal` throw on a dialog that isn't in the document,
     * as browsers do. A `close` on a detached dialog is marked: it can't restore focus. happy-dom has no
     * top layer, so the dialogs' own state is all a test can see here.
     */
    const dialogCalls = Effect.acquireRelease(
      Effect.sync(() => {
        const calls: Array<string> = []
        const proto = window.HTMLDialogElement.prototype
        const { close, showModal } = proto
        const label = (dialog: HTMLDialogElement) => dialog.getAttribute("aria-label")
        const spies = [
          vi.spyOn(proto, "showModal").mockImplementation(function(this: HTMLDialogElement) {
            if (!this.isConnected) throw new DOMException("The dialog isn't connected", "InvalidStateError")
            calls.push(`showModal ${label(this)}`)
            showModal.call(this)
          }),
          vi.spyOn(proto, "close").mockImplementation(function(this: HTMLDialogElement, value?: string) {
            calls.push(`close ${label(this)}${this.isConnected ? "" : " (detached)"}`)
            close.call(this, value)
          })
        ]
        return { calls, close, spies }
      }),
      ({ spies }) => Effect.sync(() => spies.forEach((spy) => spy.mockRestore()))
    )
    const mountConfirm = Effect.fnUntraced(
      function*(props: { readonly state: "closed" | "open" | "modal"; readonly acceptEscape: boolean }) {
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Confirm, props, app)
        yield* tick
        const dialog = () => app.querySelector("dialog")
        return { app, dialog, root }
      }
    )
    const cancel = (dialog: Element, cancelable = true) => {
      const event = new Event("cancel", { cancelable })
      dialog.dispatchEvent(event)
      return event.defaultPrevented
    }

    it.effect("a modal opens once it's in the document and closes from the Model, and its form is the app's", () =>
      Effect.gen(function*() {
        const { calls } = yield* dialogCalls
        const { app, dialog, root } = yield* mountConfirm({ state: "modal", acceptEscape: false })
        expect(calls).toEqual(["showModal Delete note?"])
        expect(dialog()!.open).toBe(true)
        // `method="dialog"` doesn't close it: the submission is the app's, and the Model closes it.
        const form = app.querySelector("form")!
        form.requestSubmit(HtmlQuery.getByRole(app, "button", { name: "Delete" }) as HTMLButtonElement)
        yield* tick
        expect(calls).toEqual(["showModal Delete note?", "close Delete note?"])
        expect(dialog()!.open).toBe(false)
        expect(dialog()!.returnValue).toBe("")
        expect(root.model()!.log).toEqual(["delete", "closed"])
        expect(HtmlQuery.dialogState(dialog())).toBe("closed")
      }).pipe(Effect.scoped))

    it.effect("Escape is the Model's: rejected stays open, a forced close reopens, accepted closes", () =>
      Effect.gen(function*() {
        const { calls, close } = yield* dialogCalls
        const rejecting = yield* mountConfirm({ state: "modal", acceptEscape: false })
        expect(cancel(rejecting.dialog()!)).toBe(true)
        yield* tick
        expect(rejecting.dialog()!.open).toBe(true)
        // A browser that won't let the close request be cancelled closes the dialog itself.
        expect(cancel(rejecting.dialog()!, false)).toBe(false)
        close.call(rejecting.dialog()!)
        yield* tick
        expect(rejecting.dialog()!.open).toBe(true)
        expect(rejecting.root.model()!.log).toEqual(["escape rejected", "escape rejected", "closed"])
        expect(calls).toEqual(["showModal Delete note?", "showModal Delete note?"])

        calls.length = 0
        const accepting = yield* mountConfirm({ state: "modal", acceptEscape: true })
        expect(cancel(accepting.dialog()!)).toBe(true)
        yield* tick
        yield* tick
        expect(accepting.dialog()!.open).toBe(false)
        expect(accepting.root.model()!.log).toEqual(["escape", "closed"])
        expect(calls).toEqual(["showModal Delete note?", "close Delete note?"])
      }).pipe(Effect.scoped))

    it.effect("a modal removed while open is forgotten, and switching mode closes without telling the app", () =>
      Effect.gen(function*() {
        const { calls } = yield* dialogCalls
        const { app, dialog, root } = yield* mountConfirm({ state: "open", acceptEscape: false })
        expect(dialog()!.open).toBe(true)
        root.send(ConfirmMessage.make({ _tag: "Mode", state: "modal" }))
        yield* tick
        expect(calls).toEqual(["close Delete note?", "showModal Delete note?"])
        root.send(ConfirmMessage.make({ _tag: "Mode", state: "open" }))
        yield* tick
        expect(calls.slice(2)).toEqual(["close Delete note?"])
        expect(dialog()!.open).toBe(true)
        expect(root.model()!.log).toEqual([])

        root.send(ConfirmMessage.make({ _tag: "Mode", state: "modal" }))
        yield* tick
        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Remove" }))
        yield* tick
        expect(dialog()).toBeNull()
        // Later commits have nothing to show; showModal on the detached dialog would throw.
        root.send(ConfirmMessage.make({ _tag: "Ask" }))
        yield* tick
        expect(calls.filter((call) => call.startsWith("showModal"))).toHaveLength(2)
      }).pipe(Effect.scoped))

    it.each(
      [
        { name: "two mode switches, then a close", states: [true, "modal", false], closes: ["closed"] },
        { name: "a close, a reopen, then a close", states: [false, "modal", false], closes: ["closed"] },
        { name: "a close, then a reopen", states: [false, "modal"], closes: [] }
      ] as const
    )("close events reported a task later end the right showing: $name", ({ closes, states }) => {
      // Browsers close at once and report it in a later task; happy-dom reports it at once.
      const host = BrowserHost.makeHost(document)
      const dialog = document.body.appendChild(document.createElement("dialog"))
      const tasks: Array<() => void> = []
      const close = vi.spyOn(dialog, "close").mockImplementation(() => {
        dialog.open = false
        tasks.push(() => dialog.dispatchEvent(new Event("close")))
      })
      const seen: Array<unknown> = []
      try {
        host.setEvents(dialog, { close: "closed" }, (_, handler) => seen.push(handler), {})
        host.setProp(dialog, "open", "modal")
        host.commit?.()
        for (const state of states) {
          host.setProp(dialog, "open", state)
          host.commit?.()
        }
        for (const task of tasks) task()
        expect(seen).toEqual(closes)
      } finally {
        close.mockRestore()
        host.dispose()
        dialog.remove()
      }
    })

    it("a close the browser makes is the app's, unless the host has shown the dialog again first", () => {
      const host = BrowserHost.makeHost(document)
      const dialog = document.body.appendChild(document.createElement("dialog"))
      const seen: Array<unknown> = []
      try {
        host.setEvents(dialog, { close: "closed" }, (_, handler) => seen.push(handler), {})
        host.setProp(dialog, "open", "modal")
        host.commit?.()
        // A forced close reported before the reconciliation shows it again.
        dialog.open = false
        dialog.dispatchEvent(new Event("close"))
        expect(seen).toEqual(["closed"])
        host.commit?.()
        expect(dialog.open).toBe(true)
        // A forced close the reconciliation got to first: its report is stale.
        dialog.open = false
        host.commit?.()
        dialog.dispatchEvent(new Event("close"))
        expect(seen).toEqual(["closed"])
      } finally {
        host.dispose()
        dialog.remove()
      }
    })

    it("reconciling a dialog that's already open records its showing once", () => {
      const host = BrowserHost.makeHost(document)
      const dialog = document.body.appendChild(document.createElement("dialog"))
      dialog.setAttribute("open", "")
      const seen: Array<unknown> = []
      try {
        host.setEvents(dialog, { close: "closed" }, (_, handler) => seen.push(handler), {})
        for (let i = 0; i < 3; i++) {
          host.setProp(dialog, "open", true)
          host.commit?.()
        }
        // One record: the browser's close of that showing is the app's. A second would make it stale.
        dialog.open = false
        dialog.dispatchEvent(new Event("close"))
        expect(seen).toEqual(["closed"])
      } finally {
        host.dispose()
        dialog.remove()
      }
    })

    it.effect("nested modals open outer first, so the inner one is on top", () =>
      Effect.gen(function*() {
        const { calls } = yield* dialogCalls
        yield* BrowserHost.mountEffect(Nested, {}, yield* container)
        expect(calls).toEqual(["showModal Outer", "showModal Inner"])
      }).pipe(Effect.scoped))

    it.effect("a shown dialog is closed before it's removed, inner first, without telling the app", () =>
      Effect.gen(function*() {
        const { calls } = yield* dialogCalls
        const { app, root } = yield* mountConfirm({ state: "modal", acceptEscape: false })
        HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Remove" }))
        yield* tick
        expect(calls).toEqual(["showModal Delete note?", "close Delete note?"])
        expect(root.model()!.log).toEqual([])

        // A drawer: a child component mounted only while it's open.
        calls.length = 0
        const DrawerMessage = Schema.TaggedUnion({ Close: {} })
        const Drawer = Component.make({
          name: "Drawer",
          model: Schema.Boolean,
          message: DrawerMessage,
          elements: Html,
          init: () => true,
          update: () => false,
          view: (open, h) =>
            h.div(
              h.button.onClick(DrawerMessage.make({ _tag: "Close" })).children("Close"),
              open && h.child(Nested, { key: "nested" })
            )
        })
        const drawer = yield* container
        yield* BrowserHost.mountEffect(Drawer, {}, drawer)
        HtmlQuery.click(HtmlQuery.getByRole(drawer, "button", { name: "Close" }))
        yield* tick
        expect(calls).toEqual(["showModal Outer", "showModal Inner", "close Inner", "close Outer"])
      }).pipe(Effect.scoped))
  })

  describe("popovers", () => {
    const mountMenu = Effect.fnUntraced(
      function*(props: { readonly mode: "manual" | "auto"; readonly open: boolean; readonly follow: boolean }) {
        const stub = yield* popoverStub
        const app = yield* container
        const root = yield* BrowserHost.mountEffect(Menu, props, app)
        yield* tick
        const menu = () => app.querySelector("[aria-label=Menu]")
        const send = (message: typeof MenuMessage.Type) => Effect.andThen(Effect.sync(() => root.send(message)), tick)
        // Runs the queued toggle tasks, then lets the reconciliation frame run.
        const settle = Effect.andThen(Effect.sync(stub.run), tick)
        return { menu, root, send, settle, stub }
      }
    )
    const shows = (calls: ReadonlyArray<string>) => calls.filter((call) => call.startsWith("showPopover")).length

    it.effect("a manual popover is controlled: shown and hidden by the Model, and put back after other changes", () =>
      Effect.gen(function*() {
        const { menu, root, send, settle, stub } = yield* mountMenu({ mode: "manual", open: true, follow: false })
        expect(stub.calls).toEqual(["showPopover Menu"])
        yield* settle
        // Something else hides it, such as a `popovertarget` button: it's shown again.
        stub.dismiss(menu()!)
        yield* settle
        expect(stub.showing.has(menu()!)).toBe(true)
        expect(shows(stub.calls)).toBe(2)
        // Its own show's toggle changes nothing more: no loop.
        yield* settle
        expect(shows(stub.calls)).toBe(2)
        expect(root.model()!.log).toEqual(["closed->open", "open->closed", "closed->open"])

        // Hidden then shown again by the Model before the toggle task: one coalesced, stale notification.
        yield* send(MenuMessage.make({ _tag: "Set", open: false }))
        yield* send(MenuMessage.make({ _tag: "Set", open: true }))
        yield* settle
        expect(root.model()!.log.at(-1)).toBe("open->open")
        expect(stub.showing.has(menu()!)).toBe(true)
        expect(shows(stub.calls)).toBe(3)
        yield* send(MenuMessage.make({ _tag: "Set", open: false }))
        yield* settle
        expect(stub.showing.has(menu()!)).toBe(false)
        expect(stub.calls.at(-1)).toBe("hidePopover Menu")
      }).pipe(Effect.scoped))

    it.effect("a manual popover with no toggle handler is put back by the host alone", () =>
      Effect.gen(function*() {
        const stub = yield* popoverStub
        const host = BrowserHost.makeHost(document)
        yield* Effect.addFinalizer(() => Effect.sync(() => host.dispose()))
        const element = (yield* container).appendChild(document.createElement("div"))
        host.setAttr(element, "popover", "manual")
        host.setProp(element, "popoverOpen", true)
        host.commit?.()
        stub.run()
        // Nothing re-renders: the toggle's reconciliation alone shows it again.
        stub.dismiss(element)
        stub.run()
        yield* tick
        expect(stub.showing.has(element)).toBe(true)
        stub.run()
        yield* tick
        expect(shows(stub.calls)).toBe(2)
      }).pipe(Effect.scoped))

    it.effect("an auto popover is followed: a light dismiss is reported and never reverted", () =>
      Effect.gen(function*() {
        const following = yield* mountMenu({ mode: "auto", open: true, follow: true })
        yield* following.settle
        following.stub.dismiss(following.menu()!)
        yield* following.settle
        expect(following.root.model()!.open).toBe(false)
        expect(shows(following.stub.calls)).toBe(1)

        // A Model that ignores the toggle still says open, and the popover stays closed across renders.
        const ignoring = yield* mountMenu({ mode: "auto", open: true, follow: false })
        yield* ignoring.settle
        ignoring.stub.dismiss(ignoring.menu()!)
        yield* ignoring.settle
        expect(ignoring.root.model()!.open).toBe(true)
        expect(ignoring.stub.showing.has(ignoring.menu()!)).toBe(false)
        // It shows again only once the Model's value goes to false and back.
        yield* ignoring.send(MenuMessage.make({ _tag: "Set", open: false }))
        yield* ignoring.send(MenuMessage.make({ _tag: "Set", open: true }))
        expect(ignoring.stub.showing.has(ignoring.menu()!)).toBe(true)
      }).pipe(Effect.scoped))

    it.effect("a coalesced toggle with equal states still reaches the Model, which converges on the latest", () =>
      Effect.gen(function*() {
        const { menu, root, send, settle, stub } = yield* mountMenu({ mode: "auto", open: false, follow: true })
        // The Model opens it, and the browser dismisses it before the toggle task: one `closed->closed`.
        yield* send(MenuMessage.make({ _tag: "Set", open: true }))
        stub.dismiss(menu()!)
        yield* settle
        expect(root.model()!.log).toEqual(["closed->closed"])
        expect(root.model()!.open).toBe(false)
        yield* settle
        expect(stub.showing.has(menu()!)).toBe(false)
        expect(shows(stub.calls)).toBe(1)
      }).pipe(Effect.scoped))

    it.effect("a keyed move closes the popover in it: a manual one is shown again, an auto one isn't", () =>
      Effect.gen(function*() {
        const stub = yield* popoverStub
        // Reversing the rows moves one of them; the browser closes the popover in it without a toggle.
        for (const [mode, expected] of [["manual", [true, true]], ["auto", [true, false]]] as const) {
          const app = yield* container
          const root = yield* BrowserHost.mountEffect(Rows, { mode }, app)
          yield* tick
          // The opening toggles, and the reconciliation frame they schedule, are over before the move.
          stub.run()
          yield* tick
          const showing = () => Array.from(app.querySelectorAll("[popover]"), (node) => stub.showing.has(node))
          expect(showing()).toEqual([true, true])
          root.send(true)
          yield* tick
          // A manual popover is reconciled at every commit; an auto one only when its Model's value changes.
          expect(showing()).toEqual(expected)
        }
      }).pipe(Effect.scoped))

    it.effect("a mode change applies the Model's state under the new mode", () =>
      Effect.gen(function*() {
        const { menu, send, settle, stub } = yield* mountMenu({ mode: "manual", open: true, follow: false })
        // Changing the attribute hides it; the new mode shows it again from the Model.
        yield* send(MenuMessage.make({ _tag: "Mode", mode: "auto" }))
        expect(stub.showing.has(menu()!)).toBe(true)
        yield* settle
        stub.dismiss(menu()!)
        yield* settle
        expect(stub.showing.has(menu()!)).toBe(false)
        yield* send(MenuMessage.make({ _tag: "Mode", mode: "manual" }))
        expect(stub.showing.has(menu()!)).toBe(true)
        expect(shows(stub.calls)).toBe(3)
      }).pipe(Effect.scoped))

    it.effect("a detached or removed popover is never shown, and a popover in a modal opens after it", () =>
      Effect.gen(function*() {
        const { menu, root, send, stub } = yield* mountMenu({ mode: "manual", open: true, follow: false })
        const host = BrowserHost.makeHost(document)
        yield* Effect.addFinalizer(() => Effect.sync(() => host.dispose()))
        const detached = document.createElement("div")
        host.setAttr(detached, "popover", "manual")
        host.setProp(detached, "popoverOpen", true)
        // showPopover would throw on it.
        host.commit?.()
        expect(stub.calls).toEqual(["showPopover Menu"])

        const shown = menu()!
        yield* send(MenuMessage.make({ _tag: "Remove" }))
        expect(menu()).toBeNull()
        yield* send(MenuMessage.make({ _tag: "Set", open: false }))
        yield* send(MenuMessage.make({ _tag: "Set", open: true }))
        expect(stub.calls.filter((call) => call.startsWith("showPopover"))).toHaveLength(1)
        expect(root.model()!.log).toEqual([])
        expect(shown.isConnected).toBe(false)

        stub.calls.length = 0
        yield* BrowserHost.mountEffect(ModalMenu, {}, yield* container)
        // A modal opening closes the auto popovers showing, so the popover in it opens after it.
        expect(stub.calls).toEqual(["showModal Settings", "showPopover Menu"])
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
          h.input.attr("aria-label", "Field").ref(Field)
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
      tags: { view: new View.ElementBuilder("view") }
    }
    const NativeBox = Component.make({
      name: "NativeBox",
      model: Schema.Null,
      message: Schema.Never,
      elements: Native,
      init: () => null,
      update: (model) => model,
      view: (_, h) => h.view
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

import { Context, Effect, type Layer, Schema, type Scope } from "effect"
import { Component, Renderer, Route, Router, type View } from "effect/ui"
import { BrowserHost, Html, HtmlServer } from "effect/ui/html"
import { HtmlQuery } from "effect/ui/html/testing"
import type { Query } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"

const Msg = Schema.TaggedUnion({
  Typed: { value: Schema.String },
  Checked: { checked: Schema.Boolean },
  Sent: { title: Schema.String },
  Focused: { found: Schema.Boolean },
  Mounted: {}
})
type Msg = typeof Msg.Type

const Field = Html.ref("Field", "input")

class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()("Clock") {}
class Logger extends Context.Service<Logger, { readonly log: (line: string) => Effect.Effect<void> }>()("Logger") {}

const Ticker = Component.define({
  name: "Ticker",
  model: Schema.Number,
  message: Schema.Number,
  elements: Html
}).make({
  init: () => 0,
  update: (_, now) => now,
  view: (now, h) => h.time.onMount("tick", () => Clock.use((clock) => clock.now)).children(String(now))
})

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

describe("Html", () => {
  it("registers nothing: only `effect/ui/html/register` does", () => {
    expect<View.Registered>().type.toBe<never>()
  })

  it("the module is a vocabulary", () => {
    expect(Html).type.toBeAssignableTo<View.Vocabulary<Html.Elements>>()
    Component.define({
      name: "Tags",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.div(h.span("text"), "more")).type.toBe<View.Element<Msg, never>>()
        expect(h.div.class("box")).type.toBe<Html.Element<Msg, never, Html.EventsOf<"div">, HTMLDivElement>>()
        expect(h.input).type.toBe<Html.VoidElement<Msg, never, Html.EventsOf<"input">, HTMLInputElement>>()
        expect(h).type.not.toHaveProperty("script")
        return h.div()
      }
    })
  })

  it("attributes come before children, in one place", () => {
    Component.define({
      name: "Order",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (model) => model,
      view: (draft, h) => {
        // The issue's example: attributes and handlers first, children last.
        const form = h.form.onSubmit(Msg.make({ _tag: "Sent", title: draft })).children(
          h.input.ref(Field).value(draft).onInput(({ value }) => Msg.make({ _tag: "Typed", value })),
          h.button.attr("type", "submit").children("Add"),
          h.span(draft),
          h.br
        )
        expect(form).type.toBe<View.Element<Msg, never>>()
        // Both terminal forms return a node with no chain methods.
        expect(h.div("a")).type.not.toHaveProperty("class")
        expect(h.div.children("a")).type.not.toHaveProperty("class")
        expect(h.div("a")).type.not.toHaveProperty("attr")
        expect(h.form.children()).type.not.toHaveProperty("onSubmit")
        // A chained builder isn't callable: only the root is shorthand.
        expect(h.div).type.toBeCallableWith("a")
        expect(h.div.class("box")).type.not.toBeAssignableTo<(...args: never) => unknown>()
        expect(h.div.class("box").children).type.toBeCallableWith("a", h.br, [h.span("b")], false, null, undefined)
        // Void tags take no children and aren't callable.
        expect(h.input).type.not.toHaveProperty("children")
        expect(h.input.value(draft)).type.not.toHaveProperty("children")
        expect(h.br).type.not.toBeAssignableTo<(...args: never) => unknown>()
        expect(h.input).type.not.toBeAssignableTo<(...args: never) => unknown>()
        // A builder is a valid child and a valid view without a terminal call.
        expect(h.ul.children).type.toBeCallableWith(h.li, h.li.key("a"))
        return h.div.class("root")
      }
    })
  })

  it("errors point at the offending child", () => {
    Component.define({
      name: "Errors",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.div).type.not.toBeCallableWith(h.span("ok"), 1)
        expect(h.div.class("x").children).type.not.toBeCallableWith(h.span("ok"), { _tag: "Element" })
        return h.div()
      }
    })
  })

  it("events carry the tag's payloads", () => {
    Component.define({
      name: "Events",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.input.onInput).type.toBeCallableWith(
          ({ checked }: Html.InputPayload) => Msg.make({ _tag: "Checked", checked })
        )
        expect(h.textarea.on).type.toBeCallableWith(
          "input",
          ({ value }: Html.ValuePayload) => Msg.make({ _tag: "Typed", value })
        )
        expect(h.form.onSubmit).type.toBeCallableWith(({ fields }: Html.SubmitPayload) =>
          Msg.make({ _tag: "Sent", title: fields.title ?? "" })
        )
        expect(h.button.onClick).type.toBeCallableWith(({ shift }: Html.PointerPayload) =>
          shift ? undefined : Msg.make({ _tag: "Mounted" })
        )
        expect(h.div.on).type.not.toBeCallableWith("input", Msg.make({ _tag: "Mounted" }))
        expect(h.div.on).type.not.toBeCallableWith("submit", Msg.make({ _tag: "Mounted" }))
        expect(h.button.onClick).type.not.toBeCallableWith("not a message")
        return h.div()
      }
    })
  })

  it("controlled properties exist on the elements that have them", () => {
    Component.define({
      name: "Controlled",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.input.value).type.toBeCallableWith("text")
        expect(h.select.value).type.toBeCallableWith("a")
        expect(h.input.checked).type.toBeCallableWith(true)
        expect(h.option.selected).type.toBeCallableWith(true)
        expect(h.details.open).type.toBeCallableWith(true)
        expect(h.div.value).type.not.toBeCallableWith("text")
        expect(h.select.checked).type.not.toBeCallableWith(true)
        expect(h.input.open).type.not.toBeCallableWith(true)
        // A dialog is also modal; `open` stays boolean, and nothing else is modal.
        expect(h.dialog.modal).type.toBeCallableWith(true)
        expect(h.dialog.open).type.not.toBeCallableWith("modal")
        expect(h.details.modal).type.not.toBeCallableWith(true)
        expect(h.div.modal).type.not.toBeCallableWith(true)
        // Any element can be a popover, manual or auto; its toggle carries both states.
        expect(h.div.popover).type.toBeCallableWith("manual", true)
        expect(h.button.popover).type.toBeCallableWith("auto", false)
        expect(h.div.popover).type.not.toBeCallableWith("hint", true)
        expect(h.div.onToggle).type.toBeCallableWith(
          ({ newState, oldState, open }: Html.PopoverTogglePayload) =>
            Msg.make({ _tag: "Typed", value: `${oldState}${newState}${open}` })
        )
        return h.div()
      }
    })
  })

  it("refs and onMount are typed by tag", () => {
    expect(Field).type.toBe<Renderer.Ref<HTMLInputElement>>()
    Component.define({
      name: "Refs",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.input.ref).type.toBeCallableWith(Field)
        expect(h.input.value("a").ref).type.toBeCallableWith(Field)
        expect(h.textarea.ref).type.not.toBeCallableWith(Field)
        expect(h.textarea.attr("rows", "2").ref).type.not.toBeCallableWith(Field)
        return h.input.onMount("focus", (element) => {
          expect(element).type.toBe<HTMLInputElement>()
          return Effect.succeed(Msg.make({ _tag: "Mounted" }))
        })
      }
    })
  })

  it("requirements from onMount and from children reach the component", () => {
    const Mounted = Component.define({
      name: "Mounted",
      model: Schema.Null,
      message: Msg,
      elements: Html
    }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.div.onMount(
          "log",
          () => Logger.use((logger) => logger.log("up")).pipe(Effect.as(Msg.make({ _tag: "Mounted" })))
        )
          .class("box")
          .children(h.child(Ticker, { key: "ticker" }))
    })
    expect(Mounted).type.toBe<Component.Component<"Mounted", {}, null, Msg, never, Logger | Clock, Html.Elements>>()
    const Shorthand = Component.define({
      name: "Shorthand",
      model: Schema.Null,
      message: Msg,
      elements: Html
    }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) => h.section(h.p("clock"), [h.child(Ticker, { key: "ticker" })])
    })
    expect(Shorthand).type.toBe<Component.Component<"Shorthand", {}, null, Msg, never, Clock, Html.Elements>>()
    const Bare = Component.define({
      name: "Bare",
      model: Schema.Null,
      message: Msg,
      elements: Html
    }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.input.onMount(
          "log",
          () => Logger.use((logger) => logger.log("up")).pipe(Effect.as(Msg.make({ _tag: "Mounted" })))
        )
    })
    expect(Bare).type.toBe<Component.Component<"Bare", {}, null, Msg, never, Logger, Html.Elements>>()
  })

  it("class takes string tokens and rejects true and numbers", () => {
    const button = new Html.Element<Msg>("button")
    const saving = false as boolean
    const count = 0 as number
    expect(button.class("rounded", saving && "opacity-50", null, undefined)).type.toBe<Html.Element<Msg>>()
    expect(button.class).type.not.toBeCallableWith("rounded", true)
    expect(button.class).type.not.toBeCallableWith("rounded", 1)
    expect(button.class).type.not.toBeCallableWith(saving || "opacity-50")
    expect(button.class).type.not.toBeCallableWith(count && "badge")
    expect(Html.classNames).type.not.toBeCallableWith("rounded", true)
    expect(Html.classNames).type.not.toBeCallableWith("rounded", 1)
    expect(Html.classNames("rounded", saving && "opacity-50")).type.toBe<string>()
  })

  it("ref Commands add nothing to a component's requirements", () => {
    const Form = Component.define({
      name: "Form",
      model: Schema.String,
      message: Msg,
      elements: Html
    }).make({
      init: () => "",
      update: (_model, _, $) => $.run(Html.focus(Field, ({ found }) => Msg.make({ _tag: "Focused", found }))),
      view: (_, h) => h.input.ref(Field)
    })
    expect(Form).type.toBe<Component.Component<"Form", {}, string, Msg, never, never, Html.Elements>>()
  })
})

describe("HtmlQuery", () => {
  it("structural queries return a structural node, which compares with any node in the tree", () => {
    const tree = {
      tag: "form",
      children: [
        { tag: "label", attrs: { for: "new" }, children: [{ text: "New todo" }] },
        { tag: "input", attrs: { id: "new" } }
      ]
    }
    expect(HtmlQuery.getByRole(tree, "textbox")).type.toBe<Query.Node>()
    expect(HtmlQuery.queryAllByRole(tree, "textbox")).type.toBe<ReadonlyArray<Query.Node>>()
    expect(HtmlQuery.getByRole(tree, "textbox") === tree.children[1]).type.toBe<boolean>()
    expect(HtmlQuery.nameOf(tree, tree.children[1]!)).type.toBe<string>()
  })

  it("DOM queries return elements", () => {
    expect(HtmlQuery.getByRole(document, "button")).type.toBe<HTMLElement>()
    expect(HtmlQuery.queryAllByRole(document.body, "button")).type.toBe<ReadonlyArray<HTMLElement>>()
  })
})

describe("BrowserHost", () => {
  const Counter = Component.define({
    name: "Counter",
    model: Schema.Number,
    message: Msg,
    elements: Html
  }).make({
    init: () => 0,
    update: (count) => count + 1,
    view: (count, h) => h.button.onClick(Msg.make({ _tag: "Mounted" })).children(String(count))
  })

  it("mountEffect needs only a Scope for an HTML root", () => {
    expect(BrowserHost.mountEffect(Counter, {}, document.body)).type.toBe<
      Effect.Effect<Renderer.Root<number, Msg>, never, Scope.Scope>
    >()
  })

  it("mount is a Layer that needs nothing for an HTML root", () => {
    expect(BrowserHost.mount(Counter, {}, document.body)).type.toBe<Layer.Layer<never>>()
  })

  it("mount and renderToHtml with Router.props need the Router", () => {
    const AppRoute = Route.union({ Home: Route.make("/"), NotFound: Route.make("/*") })
    const App = Component.define({
      name: "App",
      props: Schema.Struct({ route: AppRoute }),
      model: AppRoute,
      message: Schema.Never,
      elements: Html
    }).make({
      init: ($) => $.props.route,
      update: (route) => route,
      view: (route, h) => h.h1(route._tag)
    })
    expect(BrowserHost.mount(App, Router.props(AppRoute), document.body)).type.toBe<
      Layer.Layer<never, never, Router.Router>
    >()
    expect(HtmlServer.renderToHtml(App, Router.props(AppRoute))).type.toBe<
      Effect.Effect<HtmlServer.Rendered<typeof AppRoute.Type>, never, Router.Router>
    >()
  })

  it("Renderer.mount of an HTML root needs Html.Host", () => {
    expect(Renderer.mount(Counter, {}, document.body)).type.toBe<
      Effect.Effect<Renderer.Root<number, Msg>, never, Html.Host | Renderer.Renderer | Scope.Scope>
    >()
  })

  it("mount rejects a root of another vocabulary", () => {
    const Native: View.Vocabulary<Native> = { name: "native", tags: {} }
    const App = Component.define({
      name: "App",
      model: Schema.Number,
      message: Msg,
      elements: Native
    }).make({
      init: () => 0,
      update: (count) => count,
      view: (_, h) => h.view
    })
    expect(BrowserHost.mount).type.not.toBeCallableWith(App, {}, document.body)
    expect(BrowserHost.mountEffect).type.not.toBeCallableWith(App, {}, document.body)
  })
})

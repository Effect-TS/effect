import { BrowserHost, Html, HtmlServer } from "@effect/ui-html"
import { ssr } from "@effect/ui-html/testing"
import { expect, it } from "@effect/vitest"
import { Context, Effect, Fiber, Layer, Option, Schema } from "effect"
import { Command, Component, Feature, Router } from "effect/ui"
import { describe } from "vitest"
import { App, AppRoute, People } from "./fixtures/routed.ts"

const tick = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))

const routed = (url: string) => {
  const route = Option.getOrThrow(AppRoute.parse(url))
  return { props: { route }, router: Router.memory({ routes: AppRoute, url }) }
}

const slowPeople = Layer.succeed(People, {
  bio: (id: number) => Effect.as(Effect.sleep("300 millis"), `Bio of person ${id}`)
})

const container = (html: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const element = document.body.appendChild(document.createElement("div"))
      element.innerHTML = html
      return element
    }),
    (element) => Effect.sync(() => element.remove())
  )

describe("HtmlServer", { concurrent: false }, () => {
  it.effect("renders the routed example with its route data, and hydration adopts it", () =>
    Effect.gen(function*() {
      const { props, router } = routed("/people/1")
      const rendered = yield* HtmlServer.renderToHtml(App, props).pipe(
        Effect.provide([People.layer, router])
      )
      expect(rendered.html).toContain("<p id=\"bio\">Bio of person 1</p>")
      expect(rendered.html).toContain("<!--[/App/Person[/people/1]-->")
      expect(rendered.state["/App/Person[/people/1]"]).toEqual({ id: 1, bio: "Bio of person 1" })
      expect(rendered.state["~pending"]).toEqual({})
      expect(rendered.head).toBe(
        "<title data-eui>Person 1 · App</title>" +
          "<meta name=\"description\" content=\"About person 1\" data-eui>" +
          "<script type=\"application/ld+json\" data-eui>{\"@type\":\"Person\",\"identifier\":1}</script>"
      )
      expect(rendered.htmlAttributes).toBe("lang=\"en\" class=\"routed\" data-eui=\"lang class\"")

      const result = yield* ssr(App, props).pipe(Effect.provide([People.layer, router]))
      expect(result.adopted).toEqual(["/App", "/App/Person[/people/1]"])
      // The bio is already in the Model, so the client doesn't load it again.
      expect(result.commands).toEqual([])
      expect(result.log).toContainEqual(
        expect.objectContaining({ _tag: "CommandDropped", name: "LoadBio", reason: "adopted" })
      )
      expect(result.document.title).toBe("Person 1 · App")
    }).pipe(Effect.scoped))

  it.live("hydrates slots that missed the budget: a pending server Command and a deferred Layer", () =>
    Effect.gen(function*() {
      const person = routed("/people/2")
      const pending = yield* ssr(App, person.props, { budget: "50 millis" }).pipe(
        Effect.provide([slowPeople, person.router])
      )
      expect(pending.html).toContain("<p id=\"bio\">Loading</p>")
      expect(pending.state["~pending"]).toEqual({ "/App/Person[/people/2]": [0] })
      expect(pending.commands).toEqual([{ path: "/App/Person[/people/2]", name: "LoadBio", index: 0 }])
      yield* Effect.sleep("400 millis")
      expect(pending.container.querySelector("#bio")!.textContent).toBe("Bio of person 2")

      const slow = routed("/slow")
      const deferred = yield* ssr(App, slow.props, { budget: "50 millis" }).pipe(
        Effect.provide([People.layer, slow.router])
      )
      expect(deferred.state["~deferred"]).toEqual(["/App/Slow[/slow]"])
      expect(deferred.state["/App/Slow[/slow]"]).toBeUndefined()
      expect(deferred.container.querySelector("h1")!.textContent).toBe("Slow")
    }).pipe(Effect.scoped))

  it.effect("runs only init's server Commands, applies events, and defers failures and opted-out Layers", () =>
    Effect.gen(function*() {
      const ChildMessage = Schema.TaggedUnion({ Loaded: {}, Tracked: {} })
      class Load extends Command.Service<Load>()(
        "Load",
        Effect.succeed(() => Effect.succeed(ChildMessage.make({ _tag: "Loaded" }))),
        { server: true }
      ) {}
      const Track = Command.make("Track", () => Effect.succeed(ChildMessage.make({ _tag: "Tracked" })))
      const Child = Component.make({
        name: "Child",
        model: Schema.String,
        message: ChildMessage,
        events: Schema.Literal("loaded"),
        elements: Html,
        init: ($) => $.set("loading").run(Load.make()),
        update: (_, message, $) => message._tag === "Loaded" ? $.set("loaded").run(Track()).emit("loaded") : "tracked",
        view: (model, h) => h.span(model)
      }).pipe(Component.provide(Load.layer))
      const Broken = Component.make({
        name: "Broken",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: () => {
          throw new Error("boom")
        }
      })
      class Connection extends Context.Service<Connection, string>()("test/Connection") {}
      const Live = Component.make({
        name: "Live",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.p("live")
      }).pipe(Component.provide(Layer.succeed(Connection, "socket"), { server: false }))
      const ParentMessage = Schema.TaggedUnion({ Ready: {} })
      const Parent = Component.make({
        name: "Parent",
        model: Schema.Boolean,
        message: ParentMessage,
        elements: Html,
        init: () => false,
        update: () => true,
        view: (ready, h) =>
          h.div(
            h.p(ready ? "ready" : "waiting"),
            h.child(Child, { key: "a", props: {}, onEmit: () => ParentMessage.make({ _tag: "Ready" }) }),
            h.child(Broken, { key: "b", props: {}, fallback: () => h.p("broken") }),
            h.child(Live, { key: "c", props: {} })
          )
      })

      // The opted-out Layer doesn't spend the budget: under the TestClock, waiting for it would never end.
      const result = yield* ssr(Parent, {}, { budget: "1 hour" })
      expect(result.html).toContain("<p>ready</p>")
      expect(result.html).toContain("<span>loaded</span>")
      expect(result.html).toContain("<!--[/Parent/Broken[b]--><p>broken</p><!--]/Parent/Broken[b]-->")
      expect(result.state["~deferred"]).toEqual(["/Parent/Broken[b]", "/Parent/Live[c]"])
      expect(result.serverLog).toContainEqual(
        expect.objectContaining({ _tag: "CommandDropped", name: "Track", reason: "server" })
      )
      expect(result.container.textContent).toBe("readyloadedbrokenlive")
    }).pipe(Effect.scoped))

  it.live("keeps a slot whose Layer is still building inert until it adopts, then fires onMount", () =>
    Effect.gen(function*() {
      class Store extends Context.Service<Store, string>()("test/Store") {}
      const Message = Schema.TaggedUnion({ Mounted: {}, Clicked: {} })
      const Panel = Component.make({
        name: "Panel",
        model: Schema.Struct({ mounted: Schema.Boolean, clicks: Schema.Number }),
        message: Message,
        elements: Html,
        init: () => ({ mounted: false, clicks: 0 }),
        update: (model, message) =>
          message._tag === "Mounted" ? { ...model, mounted: true } : { ...model, clicks: model.clicks + 1 },
        view: (model, h) =>
          h.button(`${model.clicks} ${model.mounted ? "mounted" : "server"}`)
            .onClick(Message.make({ _tag: "Clicked" }))
            .onMount("mounted", () => Effect.succeed(Message.make({ _tag: "Mounted" })))
      }).pipe(Component.provide(Layer.effect(Store, Effect.as(Effect.sleep("50 millis"), "ready"))))

      const rendered = yield* HtmlServer.renderToHtml(Panel, {})
      expect(rendered.state["~deferred"]).toEqual([])
      const app = yield* container(rendered.html)
      const button = app.querySelector("button")!
      const root = yield* BrowserHost.mount(Panel, {}, app, { state: rendered.state })
      button.click()
      yield* tick
      expect(button.textContent).toBe("0 server")

      yield* root.adopted
      yield* tick
      expect(app.querySelector("button")).toBe(button)
      expect(button.textContent).toBe("0 mounted")
      button.click()
      yield* tick
      expect(button.textContent).toBe("1 mounted")
      expect(app.innerHTML).not.toContain("<!--")
    }).pipe(Effect.scoped))

  it.effect("rebuilds only the instance whose nodes don't match", () =>
    Effect.gen(function*() {
      const Item = Component.make({
        name: "Item",
        props: Schema.Struct({ label: Schema.String }),
        model: Schema.String,
        message: Schema.Never,
        elements: Html,
        init: ($) => $.props.label,
        update: (model) => model,
        view: (label, h) => h.li(label)
      })
      const List = Component.make({
        name: "List",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) =>
          h.ul(
            h.child(Item, { key: "a", props: { label: "A" } }),
            h.child(Item, { key: "b", props: { label: "B" } })
          )
      })
      const rendered = yield* HtmlServer.renderToHtml(List, {})
      const app = yield* container(rendered.html.replace("<li>A</li>", "<li>changed</li>"))
      const [first, second] = app.querySelectorAll("li")
      yield* BrowserHost.mount(List, {}, app, { state: rendered.state })
      const [a, b] = app.querySelectorAll("li")
      expect(a.textContent).toBe("A")
      expect(a).not.toBe(first)
      expect(b).toBe(second)
      expect(app.querySelector("ul")!.childNodes.length).toBe(2)
    }).pipe(Effect.scoped))
  it.live("waits for the slot a Layer that settles in budget wakes, and for the work it starts", () =>
    Effect.gen(function*() {
      const PanelMessage = Schema.TaggedUnion({ Loaded: { text: Schema.String } })
      class LoadText extends Command.Service<LoadText>()(
        "LoadText",
        Effect.succeed(() => Effect.succeed(PanelMessage.make({ _tag: "Loaded", text: "data" }))),
        { server: true }
      ) {}
      class Panel extends Feature.Service<Panel>()("Panel", { props: Schema.Struct({}), events: Schema.Never }) {}
      const PanelLive = Component.make({
        name: "PanelLive",
        model: Schema.String,
        message: PanelMessage,
        elements: Html,
        init: ($) => $.set("loading").run(LoadText.make()),
        update: (_, message) => message.text,
        view: (text, h) => h.p(text)
      }).pipe(Component.provide(LoadText.layer))
      const Page = Component.make({
        name: "Page",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) =>
          h.div(
            h.child(Panel, { key: "p", props: {}, fallback: () => h.p("fallback") })
          )
      }).pipe(Component.provide(Layer.merge(Panel.layer(PanelLive), Layer.effectDiscard(Effect.sleep("20 millis")))))

      const rendered = yield* HtmlServer.renderToHtml(Page, {})
      expect(rendered.html).toContain("<p>data</p>")
      expect(rendered.state["~deferred"]).toEqual([])
    }))

  it.effect("fails and defers the instance whose last server Command dies", () =>
    Effect.gen(function*() {
      class Die extends Command.Service<Die>()("Die", Effect.succeed(() => Effect.die("boom")), { server: true }) {}
      const Doomed = Component.make({
        name: "Doomed",
        model: Schema.String,
        message: Schema.Never,
        elements: Html,
        init: ($) => $.set("loading").run(Die.make()),
        update: (model) => model,
        view: (text, h) => h.p(text)
      }).pipe(Component.provide(Die.layer))
      const Page = Component.make({
        name: "Page",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) =>
          h.div(
            h.child(Doomed, { key: "d", props: {}, fallback: () => h.p("failed") })
          )
      })

      const rendered = yield* HtmlServer.renderToHtml(Page, {})
      expect(rendered.html).toContain("<!--[/Page/Doomed[d]--><p>failed</p><!--]/Page/Doomed[d]-->")
      expect(rendered.state["~deferred"]).toEqual(["/Page/Doomed[d]"])
      expect(rendered.state["~pending"]).toEqual({})
    }))

  it.live("closes everything it started when the render is interrupted", () =>
    Effect.gen(function*() {
      let acquired = 0
      let released = 0
      const Held = Layer.effectDiscard(
        Effect.acquireRelease(Effect.sync(() => acquired++), () => Effect.sync(() => released++)).pipe(
          Effect.andThen(Effect.sleep("100 millis"))
        )
      )
      const Page = Component.make({
        name: "Page",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.p("page")
      }).pipe(Component.provide(Held))
      const fiber = yield* Effect.forkChild(HtmlServer.renderToHtml(Page, {}))
      yield* Effect.sleep("20 millis")
      yield* Fiber.interrupt(fiber)
      yield* Effect.sleep("150 millis")
      expect([acquired, released]).toEqual([1, 1])
    }))

  it.effect("writes only text inside a textarea, and hydration rebuilds just that text", () =>
    Effect.gen(function*() {
      const Word = Component.make({
        name: "Word",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.text("hello")
      })
      const Form = Component.make({
        name: "Form",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.div(h.textarea(h.child(Word, { key: "a", props: {} })), h.p("after"))
      })
      const result = yield* ssr(Form, {})
      expect(result.html).toBe(
        "<!--[/Form--><div><textarea>hello</textarea><p>after</p></div><!--]/Form-->"
      )
      expect(result.adopted).toEqual(["/Form", "/Form/Word[a]"])
      expect(result.container.querySelector("textarea")!.value).toBe("hello")
    }).pipe(Effect.scoped))

  it.effect("judges adoption when it commits, before onMount updates replace nodes", () =>
    Effect.gen(function*() {
      const Message = Schema.TaggedUnion({ Mounted: {} })
      const Swap = Component.make({
        name: "Swap",
        model: Schema.Boolean,
        message: Message,
        elements: Html,
        init: () => false,
        update: () => true,
        view: (mounted, h) =>
          mounted
            ? h.div("mounted")
            : h.p("server").onMount("swap", () => Effect.succeed(Message.make({ _tag: "Mounted" })))
      })
      const result = yield* ssr(Swap, {})
      yield* Effect.yieldNow
      expect(result.container.textContent).toBe("mounted")
    }).pipe(Effect.scoped))
})

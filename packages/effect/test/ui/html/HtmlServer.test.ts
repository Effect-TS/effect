// @vitest-environment happy-dom
import { expect, it } from "@effect/vitest"
import { Context, Effect, Fiber, Layer, Logger, Option, Schema } from "effect"
import { Command, Component, Feature, Head, Router } from "effect/ui"
import { BrowserHost, Html, HtmlServer } from "effect/ui/html"
import { ssr } from "effect/ui/html/testing"
import { describe } from "vitest"
import { App, AppRoute, People } from "./fixtures/routed.ts"

const tick = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))

const routed = (url: string) => {
  const route = Option.getOrThrow(AppRoute.parse(url))
  return { props: { route }, router: Router.memory({ routes: AppRoute, url }) }
}

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
  it.effect("renders the routed example without its route data, which the client loads after adopting", () =>
    Effect.gen(function*() {
      const { props, router } = routed("/people/1")
      const rendered = yield* HtmlServer.renderToHtml(App, props).pipe(
        Effect.provide([People.layer, router])
      )
      // No Command runs on the server: the page is what init returned.
      expect(rendered.html).toContain("<p id=\"bio\">Loading</p>")
      expect(rendered.html).toContain("<!--[/App/Person[/people/1]-->")
      expect(rendered.state["/App/Person[/people/1]"]).toEqual({ id: 1, bio: undefined })
      expect("~pending" in rendered.state).toBe(false)
      expect(rendered.head).toBe(
        "<title data-eui>Person 1 · App</title>" +
          "<meta name=\"description\" content=\"About person 1\" data-eui>" +
          "<script type=\"application/ld+json\" data-eui>{\"@type\":\"Person\",\"identifier\":1}</script>"
      )
      expect(rendered.htmlAttributes).toBe("lang=\"en\" class=\"routed\" data-eui=\"lang class\"")

      const result = yield* ssr(App, props).pipe(Effect.provide([People.layer, router]))
      expect(result.adopted).toEqual(["/App", "/App/Person[/people/1]"])
      // An adopted instance runs every one of its init Commands.
      expect(result.commands).toEqual([{ path: "/App/Person[/people/1]", name: "LoadBio", index: 0 }])
      // The server dropped it without a warning: an init Command is expected there.
      expect(result.serverLog).toContainEqual(
        expect.objectContaining({ _tag: "CommandDropped", name: "LoadBio", reason: "server" })
      )
      expect(result.log.filter((entry) => entry._tag === "CommandDropped")).toEqual([])
      yield* tick
      expect(result.container.querySelector("#bio")!.textContent).toBe("Bio of person 1")
    }).pipe(Effect.scoped))

  it.live("hydrates a slot that missed the budget: a deferred Layer", () =>
    Effect.gen(function*() {
      const slow = routed("/slow")
      const deferred = yield* ssr(App, slow.props, { budget: "50 millis" }).pipe(
        Effect.provide([People.layer, slow.router])
      )
      expect(deferred.state["~deferred"]).toEqual(["/App/Slow[/slow]"])
      expect(deferred.state["/App/Slow[/slow]"]).toBeUndefined()
      expect(deferred.container.querySelector("h1")!.textContent).toBe("Slow")
    }).pipe(Effect.scoped))

  it.effect("runs no Command, warns only about one update issues, and defers failures and opted-out Layers", () =>
    Effect.gen(function*() {
      const ChildMessage = Schema.TaggedUnion({ Loaded: {}, Tracked: {} })
      class Load extends Command.Service<Load>()(
        "Load",
        Effect.succeed(() => Effect.succeed(ChildMessage.make({ _tag: "Loaded" }))),
        { invalidates: () => [] }
      ) {}
      const Track = Command.make("Track", () => Effect.succeed(ChildMessage.make({ _tag: "Tracked" })))
      const Child = Component.make({
        name: "Child",
        model: Schema.String,
        message: ChildMessage,
        events: Schema.Literal("loaded"),
        elements: Html,
        init: ($) => $.set("loading").run(Load.make()).emit("loaded"),
        update: (_, message, $) => message._tag === "Loaded" ? $.set("loaded").run(Track()) : "tracked",
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
        update: (_, __, $) => $.set(true).run(Track().pipe(Command.map(() => ParentMessage.make({ _tag: "Ready" })))),
        view: (ready, h) =>
          h.div(
            h.p(ready ? "ready" : "waiting"),
            h.child(Child, { key: "a", props: {}, onEmit: () => ParentMessage.make({ _tag: "Ready" }) }),
            h.child(Broken, { key: "b", props: {}, fallback: () => h.p("broken") }),
            h.child(Live, { key: "c", props: {} })
          )
      })

      // The opted-out Layer doesn't spend the budget: under the TestClock, waiting for it would never end.
      const warnings: Array<unknown> = []
      const capture = Logger.make<unknown, void>((options) => {
        if (options.logLevel === "Warn") warnings.push(options.message)
      })
      const result = yield* ssr(Parent, {}, { budget: "1 hour" }).pipe(Effect.provide(Logger.layer([capture])))
      // init's event still reaches the parent on the server; init's Command doesn't run there.
      expect(result.html).toContain("<p>ready</p>")
      expect(result.html).toContain("<span>loading</span>")
      const dropped = result.serverLog.filter((entry) => entry._tag === "CommandDropped")
      expect(dropped.map((entry) => [entry.path, entry.name, entry.reason])).toEqual([
        ["/Parent/Child[a]", "Load", "server"],
        ["/Parent", "Track", "server"]
      ])
      // Only the Command update issued warns: on the server it's lost, where init's runs again on the client.
      expect(warnings.filter((text) => String(text).includes("Track")).length).toBe(1)
      expect(warnings.filter((text) => String(text).includes("Load")).length).toBe(0)
      expect(result.html).toContain("<!--[/Parent/Broken[b]--><p>broken</p><!--]/Parent/Broken[b]-->")
      expect(result.state["~deferred"]).toEqual(["/Parent/Broken[b]", "/Parent/Live[c]"])
      yield* tick
      expect(result.container.textContent).toBe("readytrackedbrokenlive")
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
  it.live("waits for the slot a Layer that settles in budget wakes", () =>
    Effect.gen(function*() {
      const PanelMessage = Schema.TaggedUnion({ Loaded: { text: Schema.String } })
      class LoadText extends Command.Service<LoadText>()(
        "LoadText",
        Effect.succeed(() => Effect.succeed(PanelMessage.make({ _tag: "Loaded", text: "data" }))),
        { invalidates: () => [] }
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
      // The slot mounted in budget; its init Command waits for the client.
      expect(rendered.html).toContain("<p>loading</p>")
      expect(rendered.state["~deferred"]).toEqual([])
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
  it.effect("keeps marker paths through the parser's normalisation of CR, NUL and lone surrogates", () =>
    Effect.gen(function*() {
      const Leaf = Component.make({
        name: "Leaf",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.p("leaf")
      })
      const Root = Component.make({
        name: "Root",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.child(Leaf, { key: "a\rb\r\nc\u0000d\ud800e-->", props: {} })
      })
      const rendered = yield* HtmlServer.renderToHtml(Root, {})
      // What a browser does before it parses: UTF-8 replaces a lone surrogate, the input stream turns CR
      // and CRLF into LF, and a comment turns NUL into U+FFFD. Happy DOM does none of it.
      const parsed = new TextDecoder().decode(new TextEncoder().encode(rendered.html))
        .replace(/\r\n?/g, "\n")
        .replaceAll("\u0000", "\ufffd")
      expect(parsed).toBe(rendered.html)
      const app = yield* container(parsed)
      const leaf = app.querySelector("p")
      yield* BrowserHost.mount(Root, {}, app, { state: rendered.state })
      expect(app.querySelector("p")).toBe(leaf)
      expect(app.innerHTML).toBe("<p>leaf</p>")
    }).pipe(Effect.scoped))

  it.live("compares the head at adoption, so a mount update while a slot waits isn't a mismatch", () =>
    Effect.gen(function*() {
      class Slow extends Context.Service<Slow, string>()("test/Slow") {}
      const Waiting = Component.make({
        name: "Waiting",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.p("waiting")
      }).pipe(Component.provide(Layer.effect(Slow, Effect.as(Effect.sleep("30 millis"), "ready"))))
      const Message = Schema.TaggedUnion({ Mounted: {} })
      const Titled = Component.make({
        name: "Titled",
        model: Schema.String,
        message: Message,
        elements: Html,
        init: () => "server",
        update: () => "mounted",
        head: (title) => [Head.title(title)],
        view: (_, h) =>
          h.div(h.child(Waiting, { key: "w", props: {} })).onMount(
            "title",
            () => Effect.succeed(Message.make({ _tag: "Mounted" }))
          )
      })
      const result = yield* ssr(Titled, {})
      expect(result.adopted).toEqual(["/Titled", "/Titled/Waiting[w]"])
      yield* tick
      expect(result.document.title).toBe("mounted")
    }).pipe(Effect.scoped))
  it.effect("compares the head the client evaluated, over the instance tree, not one rebuilt from paths", () =>
    Effect.gen(function*() {
      // Alternates per evaluation, so evaluating it again after adoption would agree with the server.
      let runs = 0
      const Unstable = Component.make({
        name: "Unstable",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => [Head.title(runs++ % 2 === 0 ? "server" : "client")],
        view: (_, h) => h.p("same")
      })
      const unstable = yield* Effect.flip(ssr(Unstable, {}))
      expect(unstable.problems).toEqual(["head title: the server has \"server\", the client \"client\""])
      expect(runs).toBe(2)

      // Siblings whose keys make one path look like the other's descendant: no template applies.
      const Box = Component.make({
        name: "Box",
        props: Schema.Struct({ title: Schema.String }),
        model: Schema.String,
        message: Schema.Never,
        elements: Html,
        init: ($) => $.props.title,
        update: (model) => model,
        head: (title) => [Head.title(title), Head.titleTemplate((inner) => `wrap(${inner})`)],
        view: (title, h) => h.p(title)
      })
      const Siblings = Component.make({
        name: "Siblings",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) =>
          h.div(
            h.child(Box, { key: "a", props: { title: "A" } }),
            h.child(Box, { key: "a]/Box[b", props: { title: "B" } })
          )
      })
      const siblings = yield* ssr(Siblings, {})
      expect(siblings.head.title).toBe("B")

      // A template that really applies, and differs on the client, still fails.
      let templates = 0
      const Outer = Component.make({
        name: "Outer",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => {
          const side = templates++ % 2 === 0 ? "server" : "client"
          return [Head.titleTemplate((inner) => `${inner} (${side})`)]
        },
        view: (_, h) => h.div(h.child(Box, { key: "a", props: { title: "Inner" } }))
      })
      const nested = yield* Effect.flip(ssr(Outer, {}))
      expect(nested.problems).toEqual([
        "head title: the server has \"Inner (server)\", the client \"Inner (client)\""
      ])
    }).pipe(Effect.scoped))
  it.live("snapshots the instances adoption saw, so removing one while a slot waits isn't a mismatch", () =>
    Effect.gen(function*() {
      class Slow extends Context.Service<Slow, string>()("test/Slow") {}
      const Waiting = Component.make({
        name: "Waiting",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.p("waiting")
      }).pipe(Component.provide(Layer.effect(Slow, Effect.as(Effect.sleep("30 millis"), "ready"))))
      const Titled = Component.make({
        name: "Titled",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => [Head.title("title")],
        view: (_, h) => h.p("titled")
      })
      const Message = Schema.TaggedUnion({ Mounted: {} })
      const Page = Component.make({
        name: "Page",
        model: Schema.Boolean,
        message: Message,
        elements: Html,
        init: () => true,
        update: () => false,
        view: (showTitled, h) =>
          h.div(
            showTitled ? h.child(Titled, { key: "t", props: {} }) : h.p("gone"),
            h.child(Waiting, { key: "w", props: {} })
          ).onMount("hide", () => Effect.succeed(Message.make({ _tag: "Mounted" })))
      })
      const result = yield* ssr(Page, {})
      expect(result.head.title).toBe("title")
      expect(result.adopted).toEqual(["/Page", "/Page/Titled[t]", "/Page/Waiting[w]"])
      yield* tick
      expect(result.container.textContent).toBe("gonewaiting")
    }).pipe(Effect.scoped))

  it.effect("reports the template results the client's merge computed, without calling templates again", () =>
    Effect.gen(function*() {
      const Leaf = Component.make({
        name: "Leaf",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => [Head.title("leaf")],
        view: (_, h) => h.p("leaf")
      })
      const withTemplate = (template: (calls: number) => string) => {
        let calls = 0
        const Parent = Component.make({
          name: "Parent",
          model: Schema.Struct({}),
          message: Schema.Never,
          elements: Html,
          init: () => ({}),
          update: (model) => model,
          head: () => [Head.titleTemplate(() => template(calls++))],
          view: (_, h) => h.div(h.child(Leaf, { key: "l", props: {} }))
        })
        return { Parent, calls: () => calls }
      }

      // One call on the server's merge and one on the client's; reporting adds none. Both return
      // "server", which is what the client shows, so hydration agrees.
      const agrees = withTemplate((calls) => calls < 2 ? "server" : "client")
      const result = yield* ssr(agrees.Parent, {})
      expect(agrees.calls()).toBe(2)
      expect(result.head.title).toBe("server")
      expect(result.document.title).toBe("server")

      // The client's one call differs from the server's, and the report shows the client's.
      const differs = withTemplate((calls) => calls < 1 ? "server" : "client")
      const error = yield* Effect.flip(ssr(differs.Parent, {}))
      expect(differs.calls()).toBe(2)
      expect(error.problems).toEqual(["head title: the server has \"server\", the client \"client\""])
    }).pipe(Effect.scoped))
  it.effect("leaves an instance its own title template fails out of the adoption head, as the server does", () =>
    Effect.gen(function*() {
      const Leaf = Component.make({
        name: "Leaf",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => [Head.title("leaf")],
        view: (_, h) => h.p("leaf")
      })
      const Broken = Component.make({
        name: "Broken",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => [
          Head.titleTemplate(() => {
            throw new Error("template")
          })
        ],
        view: (_, h) => h.div(h.child(Leaf, { key: "l", props: {} }))
      })
      const Parent = Component.make({
        name: "Parent",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        // Two siblings: the later one's title wins the first merge, so the earlier one's template only
        // throws in the merge after the fallback renders. Mounting drains both before it reports.
        view: (_, h) =>
          h.div(
            h.child(Broken, { key: "a", props: {}, fallback: () => h.p("fallback a") }),
            h.child(Broken, { key: "b", props: {}, fallback: () => h.p("fallback b") })
          )
      })
      const result = yield* ssr(Parent, {})
      expect(result.head.title).toBeUndefined()
      expect(result.state["~deferred"]).toEqual(["/Parent/Broken[a]", "/Parent/Broken[b]"])
      expect(result.container.textContent).toBe("fallback afallback b")
    }).pipe(Effect.scoped))

  it.live("keeps no template results outside an adoption report", () =>
    Effect.gen(function*() {
      let calls = 0
      // One entry shared by every head evaluation, so a cache keyed on entries would keep it.
      const template = Head.titleTemplate((title) => {
        calls++
        return `${title} - App`
      })
      const Leaf = Component.make({
        name: "Leaf",
        model: Schema.Struct({}),
        message: Schema.Never,
        elements: Html,
        init: () => ({}),
        update: (model) => model,
        head: () => [Head.title("leaf")],
        view: (_, h) => h.p("leaf")
      })
      const Message = Schema.TaggedUnion({ Bump: {} })
      const Layout = Component.make({
        name: "Layout",
        model: Schema.Number,
        message: Message,
        elements: Html,
        init: () => 0,
        update: (count) => count + 1,
        head: () => [template],
        view: (count, h) => h.div(h.p(String(count)), h.child(Leaf, { key: "l", props: {} }))
      })
      const bumpThrice = Effect.fnUntraced(function*(root: { readonly send: (message: typeof Message.Type) => void }) {
        for (let i = 0; i < 3; i++) {
          root.send(Message.make({ _tag: "Bump" }))
          yield* tick
        }
      })

      // A plain mount: each of the four merges (mount and three updates) calls the template.
      const app = yield* container("")
      const mounted = yield* BrowserHost.mount(Layout, {}, app)
      yield* bumpThrice(mounted)
      expect(calls).toBe(4)

      // Hydration: one call on the server's merge, one on the client's, then one per update once
      // the report is made.
      calls = 0
      const result = yield* ssr(Layout, {})
      expect(calls).toBe(2)
      yield* bumpThrice(result.root)
      expect(calls).toBe(5)
      expect(result.document.title).toBe("leaf - App")
    }).pipe(Effect.scoped))
})

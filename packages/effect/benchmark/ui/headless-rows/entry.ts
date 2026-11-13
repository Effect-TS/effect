import { Effect, Exit, Schema, Scope } from "effect"
import { Component } from "effect/ui"
import { BrowserHost, Html, HtmlServer } from "effect/ui/html"

const Row = Schema.Struct({ id: Schema.String, label: Schema.String, done: Schema.Boolean })
type Row = typeof Row.Type
const AppProps = Schema.Struct({ count: Schema.Number })
const AppMessage = Schema.TaggedUnion({ Toggle: { id: Schema.String }, Reverse: {} })
type AppMessage = typeof AppMessage.Type
const Flip = Schema.TaggedUnion({ Flip: {} })
const flip = Flip.make({ _tag: "Flip" })

const init = ($: { readonly props: { readonly count: number } }): ReadonlyArray<Row> =>
  Array.from({ length: $.props.count }, (_, i) => ({ id: "r" + i, label: "Row " + i, done: false }))
const update = (rows: ReadonlyArray<Row>, message: AppMessage): ReadonlyArray<Row> =>
  AppMessage.match(message, {
    Toggle: ({ id }) => rows.map((row) => row.id === id ? { ...row, done: !row.done } : row),
    Reverse: () => [...rows].reverse()
  })
const app = { name: "App", props: AppProps, model: Schema.Array(Row), message: AppMessage, elements: Html } as const

// Every variant renders the same row:
// li.row[data-done] > button[aria-expanded][aria-controls] + span + div#panel[hidden]

/** Rows as plain elements of the list's own view. */
const Plain = Component.define(app).make({
  init,
  update,
  view: (rows, h) =>
    h.ul.children(rows.map((row) =>
      h.li.key(row.id).class("row").attr("data-done", row.done ? "" : undefined).children(
        h.button.attr("aria-expanded", "false").attr("aria-controls", h.id("panel", row.id))
          .onClick(AppMessage.make({ _tag: "Toggle", id: row.id })).children(row.label),
        h.span(row.done ? "done" : "todo"),
        h.div.id(h.id("panel", row.id)).attr("hidden", "").children("details")
      )
    ))
})

/** A normal child per row: it owns the markup, and skips when its props are the same. */
const NormalRow = Component.define({
  name: "Row",
  props: Schema.Struct({ row: Row }),
  model: Schema.Boolean,
  message: Flip,
  elements: Html
}).make({
  init: () => false,
  update: (open) => !open,
  view: (open, h) =>
    h.li.class("row").attr("data-done", h.props.row.done ? "" : undefined).children(
      h.button.attr("aria-expanded", String(open)).attr("aria-controls", h.id("panel")).onClick(flip)
        .children(h.props.row.label),
      h.span(h.props.row.done ? "done" : "todo"),
      h.div.id(h.id("panel")).attr("hidden", open ? undefined : "").children("details")
    )
})
const Normal = Component.define(app).make({
  init,
  update,
  view: (rows, h) => h.ul.children(rows.map((row) => h.child(NormalRow, { key: row.id, props: { row } })))
})

/** The same disclosure, headless: the list's closure owns the markup. */
const Disclosure = Component.define({ name: "Disclosure", model: Schema.Boolean, message: Flip, elements: Html }).make({
  init: () => false,
  update: (open) => !open,
  parts: (open, p) => ({
    open,
    trigger: p.part(
      "button",
      (b) => b.attr("aria-expanded", String(open)).attr("aria-controls", p.id("panel")).onClick(flip)
    ),
    panel: p.part("div", (b) => b.id(p.id("panel")).attr("hidden", open ? undefined : ""))
  })
})
const Headless = Component.define(app).make({
  init,
  update,
  view: (rows, h) =>
    h.ul.children(rows.map((row) =>
      h.child(Disclosure, {
        key: row.id,
        view: (d) =>
          h.li.class("row").attr("data-done", row.done ? "" : undefined).children(
            d.trigger(h.button).children(row.label),
            h.span(row.done ? "done" : "todo"),
            d.panel(h.div).children("details")
          )
      })
    ))
})

/** The proposal's advice: a normal row component around the headless child, so the skip happens above the closure. */
const WrappedRow = Component.define({
  name: "Row",
  props: Schema.Struct({ row: Row }),
  model: Schema.Null,
  message: Schema.Never,
  elements: Html
}).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.child(Disclosure, {
      key: "d",
      view: (d) =>
        h.li.class("row").attr("data-done", h.props.row.done ? "" : undefined).children(
          d.trigger(h.button).children(h.props.row.label),
          h.span(h.props.row.done ? "done" : "todo"),
          d.panel(h.div).children("details")
        )
    })
})
const Wrapped = Component.define(app).make({
  init,
  update,
  view: (rows, h) => h.ul.children(rows.map((row) => h.child(WrappedRow, { key: row.id, props: { row } })))
})

const variants = { plain: Plain, normal: Normal, headless: Headless, wrapped: Wrapped }

// -- the render flush runs on a microtask, so a measurement ends one microtask after the send ----
const task = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => resolve()
    channel.port2.postMessage(0)
  })
let hops = 0
/** When `done` first held: after one microtask, or else after as few tasks as it takes. */
const settle = async (done: () => boolean, label = ""): Promise<number> => {
  null
  let end = performance.now()
  if (done()) return end
  for (let i = 0; i < 200; i++) {
    await task()
    hops++
    end = performance.now()
    if (done()) return end
  }
  throw new Error("bench: the change never rendered: " + label + " :: " + document.body.innerHTML.slice(0, 600))
}
const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error("bench check failed: " + message)
}
const median = (values: Array<number>) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]

const pass = async (name: keyof typeof variants, count: number, repeats: number) => {
  const App = variants[name]
  hops = 0
  const container = document.body.appendChild(document.createElement("div"))
  const scope = Effect.runSync(Scope.make())
  const rows = () => container.querySelectorAll("li.row")
  const done = () => container.querySelectorAll("li.row[data-done]").length
  let start = performance.now()
  const root = await Effect.runPromise(Scope.provide(BrowserHost.mountEffect(App, { count }, container), scope))
  const mount = (await settle(() => rows().length === count, name + " mount")) - start
  const mountHops = hops
  hops = 0

  const toggle: Array<number> = []
  for (let i = 0; i < repeats; i++) {
    const id = "r" + ((i * 37) % count)
    const before = done()
    start = performance.now()
    root.send(AppMessage.make({ _tag: "Toggle", id }))
    toggle.push((await settle(() => Math.abs(done() - before) === 1, name + " toggle")) - start)
  }
  const reverse: Array<number> = []
  for (let i = 0; i < repeats; i++) {
    const first = rows()[0]
    start = performance.now()
    root.send(AppMessage.make({ _tag: "Reverse" }))
    reverse.push((await settle(() => rows()[count - 1] === first, name + " reverse")) - start)
    check(rows().length === count, "every row is still there")
  }
  // A click on one row's button: the child's own state everywhere but in the plain list.
  const click: Array<number> = []
  for (let i = 0; i < repeats; i++) {
    const row = rows()[(i * 53) % count]
    const before = row.outerHTML
    start = performance.now()
    row.querySelector("button")!.click()
    click.push((await settle(() => row.outerHTML !== before, name + " click")) - start)
  }
  const updateHops = hops
  await Effect.runPromise(Scope.close(scope, Exit.void))
  container.remove()

  const rendered = await Effect.runPromise(HtmlServer.renderToHtml(App, { count }) as Effect.Effect<any>)
  const target = document.body.appendChild(document.createElement("div"))
  target.innerHTML = rendered.html
  check(target.querySelectorAll("li.row").length === count, "the server rendered every row")
  const firstRow = target.querySelector("li.row")!
  const hydrateScope = Effect.runSync(Scope.make())
  start = performance.now()
  const hydrated = await Effect.runPromise(
    Scope.provide(BrowserHost.mountEffect(App, { count }, target, { state: rendered.state }), hydrateScope)
  )
  await Effect.runPromise(hydrated.adopted)
  const hydrate = performance.now() - start
  check(target.querySelector("li.row") === firstRow && target.querySelectorAll("li.row").length === count, "adopted")
  // Live after hydration: the first row's button answers.
  const before = firstRow.outerHTML
  firstRow.querySelector("button")!.click()
  await settle(() => firstRow.outerHTML !== before, name + " hydrated click")
  await Effect.runPromise(Scope.close(hydrateScope, Exit.void))
  target.remove()
  return {
    mount,
    hydrate,
    toggle: median(toggle),
    reverse: median(reverse),
    click: median(click),
    mountHops,
    updateHops
  }
}
;(window as any).bench = async (name: keyof typeof variants, count: number) => {
  await pass(name, count, 5)
  return pass(name, count, 21)
}

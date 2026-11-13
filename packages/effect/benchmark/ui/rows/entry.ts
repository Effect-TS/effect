import { Effect, Exit, Schema, Scope } from "effect"
import { Component } from "effect/ui"
import { BrowserHost, Html } from "effect/ui/html"

// The keyed table of js-framework-benchmark (krausest), on effect/ui: rows of an id, a label that
// selects the row and a remove link. Two variants render the same DOM:
//
//   plain      every row is plain elements in the table's own view: one component in total.
//   component  a child component per row (key + props), which skips rendering when its props are equal.

const Row = Schema.Struct({ id: Schema.Number, label: Schema.String })
type Row = typeof Row.Type
const Model = Schema.Struct({ rows: Schema.Array(Row), selected: Schema.Number, nextId: Schema.Number })
type Model = typeof Model.Type
const Message = Schema.TaggedUnion({
  Run: { count: Schema.Number },
  Add: { count: Schema.Number },
  Update: {},
  Clear: {},
  Swap: {},
  Select: { id: Schema.Number },
  Remove: { id: Schema.Number }
})
type Message = typeof Message.Type

const adjectives = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy"
]
const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"]
const nouns = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard"
]
// A fixed seed, so every run builds the same labels.
let seed = 1
const random = (max: number) => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed % max
}
const buildRows = (from: number, count: number): Array<Row> =>
  Array.from({ length: count }, (_, i) => ({
    id: from + i,
    label: adjectives[random(adjectives.length)] + " " + colours[random(colours.length)] + " " +
      nouns[random(nouns.length)]
  }))

const update = (model: Model, message: Message): Model =>
  Message.match(message, {
    Run: ({ count }) => ({ ...model, rows: buildRows(model.nextId, count), nextId: model.nextId + count, selected: 0 }),
    Add: ({ count }) => ({
      ...model,
      rows: [...model.rows, ...buildRows(model.nextId, count)],
      nextId: model.nextId + count
    }),
    Update: () => ({
      ...model,
      rows: model.rows.map((row, i) => i % 10 === 0 ? { ...row, label: row.label + " !!!" } : row)
    }),
    Clear: () => ({ ...model, rows: [], selected: 0 }),
    Swap: () => {
      if (model.rows.length < 999) return model
      const rows = [...model.rows]
      const a = rows[1]
      rows[1] = rows[998]
      rows[998] = a
      return { ...model, rows }
    },
    Select: ({ id }) => ({ ...model, selected: id }),
    Remove: ({ id }) => ({ ...model, rows: model.rows.filter((row) => row.id !== id) })
  })

const app = { name: "Table", model: Model, message: Message, elements: Html } as const
const init = (): Model => ({ rows: [], selected: 0, nextId: 1 })

const Plain = Component.define(app).make({
  init,
  update,
  view: (model, h) =>
    h.table.class("table").children(
      h.tbody.children(model.rows.map((row) =>
        h.tr.key(String(row.id)).class(row.id === model.selected && "danger").children(
          h.td.class("col-md-1").children(String(row.id)),
          h.td.class("col-md-4").children(
            h.a.onClick(Message.make({ _tag: "Select", id: row.id })).children(row.label)
          ),
          h.td.class("col-md-1").children(
            h.a.onClick(Message.make({ _tag: "Remove", id: row.id })).children(
              h.span.class("glyphicon", "glyphicon-remove").attr("aria-hidden", "true")
            )
          ),
          h.td.class("col-md-6")
        )
      ))
    )
})

const RowMessage = Schema.TaggedUnion({ Select: {}, Remove: {} })
const RowView = Component.define({
  name: "Row",
  props: Schema.Struct({ row: Row, selected: Schema.Boolean }),
  model: Schema.Null,
  message: RowMessage,
  events: Message,
  elements: Html
}).make({
  init: () => null,
  update: (_, message, $) =>
    $.emit(
      message._tag === "Select"
        ? Message.make({ _tag: "Select", id: $.props.row.id })
        : Message.make({ _tag: "Remove", id: $.props.row.id })
    ),
  view: (_, h) =>
    h.tr.class(h.props.selected && "danger").children(
      h.td.class("col-md-1").children(String(h.props.row.id)),
      h.td.class("col-md-4").children(h.a.onClick(RowMessage.make({ _tag: "Select" })).children(h.props.row.label)),
      h.td.class("col-md-1").children(
        h.a.onClick(RowMessage.make({ _tag: "Remove" })).children(
          h.span.class("glyphicon", "glyphicon-remove").attr("aria-hidden", "true")
        )
      ),
      h.td.class("col-md-6")
    )
})
const Components = Component.define(app).make({
  init,
  update,
  view: (model, h) =>
    h.table.class("table").children(
      h.tbody.children(model.rows.map((row) =>
        h.child(RowView, {
          key: String(row.id),
          props: { row, selected: row.id === model.selected },
          onEmit: (message) => message
        })
      ))
    )
})

const variants = { plain: Plain, component: Components }

// -- timing --------------------------------------------------------------------------------------
// As in headless-rows: wall-clock time from just before the message is sent (or the click) to the
// first microtask after the render flush, so update, the view, the diff, the DOM writes and the
// commit, but not layout or paint. An update that needs more than that fails the run.
const task = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => resolve()
    channel.port2.postMessage(0)
  })
let hops = 0
const settle = async (done: () => boolean, label: string): Promise<number> => {
  await Promise.resolve()
  let end = performance.now()
  if (done()) return end
  for (let i = 0; i < 200; i++) {
    await task()
    hops++
    end = performance.now()
    if (done()) return end
  }
  throw new Error("bench: the change never rendered: " + label)
}
const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error("bench check failed: " + message)
}

const mountApp = async (name: keyof typeof variants) => {
  const container = document.body.appendChild(document.createElement("div"))
  const scope = Effect.runSync(Scope.make())
  const root = await Effect.runPromise(Scope.provide(BrowserHost.mountEffect(variants[name], {}, container), scope))
  await settle(() => container.querySelector("tbody") !== null, "mount")
  const tbody = container.querySelector("tbody")!
  const rows = () => tbody.children
  const send = async (message: Message, done: () => boolean, label: string) => {
    const start = performance.now()
    root.send(message)
    return (await settle(done, label)) - start
  }
  const click = async (element: HTMLElement, done: () => boolean, label: string) => {
    const start = performance.now()
    element.click()
    return (await settle(done, label)) - start
  }
  const close = async () => {
    await Effect.runPromise(Scope.close(scope, Exit.void))
    container.remove()
  }
  return { rows, send, click, close, root }
}

const firstLabel = (rows: HTMLCollection) => rows[0]?.children[1]?.textContent ?? ""

type Op = (app: Awaited<ReturnType<typeof mountApp>>) => Promise<number>
const run = (count: number) => (app: Awaited<ReturnType<typeof mountApp>>) =>
  app.send(Message.make({ _tag: "Run", count }), () => app.rows().length === count, "run")
const clear = (app: Awaited<ReturnType<typeof mountApp>>) =>
  app.send(Message.make({ _tag: "Clear" }), () => app.rows().length === 0, "clear")

/** Each op: a setup outside the figure, then the measured step. */
const ops: Record<string, { readonly setup: Op; readonly step: Op }> = {
  create1k: { setup: clear, step: run(1000) },
  replace1k: {
    setup: run(1000),
    step: (app) => {
      const before = app.rows()[0]
      return app.send(Message.make({ _tag: "Run", count: 1000 }), () => app.rows()[0] !== before, "replace")
    }
  },
  update10th: {
    setup: run(1000),
    step: (app) => app.send(Message.make({ _tag: "Update" }), () => firstLabel(app.rows()).endsWith("!!!"), "update")
  },
  select: {
    setup: run(1000),
    step: (app) => {
      const row = app.rows()[500] as HTMLElement
      return app.click(row.children[1].firstElementChild as HTMLElement, () => row.className === "danger", "select")
    }
  },
  swap: {
    setup: run(1000),
    step: (app) => {
      const second = app.rows()[1]
      return app.send(Message.make({ _tag: "Swap" }), () => app.rows()[998] === second, "swap")
    }
  },
  remove: {
    setup: run(1000),
    step: (app) => {
      const row = app.rows()[500] as HTMLElement
      return app.click(row.children[2].firstElementChild as HTMLElement, () => row.parentNode === null, "remove")
    }
  },
  create10k: { setup: clear, step: run(10000) },
  append1k: {
    setup: run(1000),
    step: (app) => app.send(Message.make({ _tag: "Add", count: 1000 }), () => app.rows().length === 2000, "append")
  },
  clear1k: { setup: run(1000), step: clear }
}
;(window as any).opNames = Object.keys(
  ops
) /** The median of `repeats` measured steps, after `warmup` unmeasured ones. */
;(window as any).bench = async (
  name: keyof typeof variants,
  op: string,
  warmup: number,
  repeats: number,
  profile = false
) => {
  hops = 0
  const app = await mountApp(name)
  const { setup, step } = ops[op]
  const times: Array<number> = []
  for (let i = 0; i < warmup + repeats; i++) {
    await setup(app)
    await task()
    hops = 0
    // The runner collects one CPU profile per measured step.
    if (profile) console.profile("step")
    const time = await step(app)
    if (profile) console.profileEnd("step")
    check(hops === 0, name + " " + op + ": the change rendered later than the first microtask")
    if (i >= warmup) times.push(time)
    await task()
  }
  await app.close()
  times.sort((a, b) => a - b)
  return times[Math.floor(times.length / 2)]
}

// -- memory --------------------------------------------------------------------------------------
// The runner forces a garbage collection and reads the JS heap between these steps.
let current: Awaited<ReturnType<typeof mountApp>> | undefined
;(window as any).memory = {
  mount: async (name: keyof typeof variants) => {
    current = await mountApp(name)
  },
  run: async (count: number) => {
    await run(count)(current!)
    check(current!.rows().length === count, "rows")
  },
  replace: async (count: number, times: number) => {
    for (let i = 0; i < times; i++) await run(count)(current!)
  },
  cycle: async (count: number, times: number) => {
    for (let i = 0; i < times; i++) {
      await run(count)(current!)
      await clear(current!)
    }
  },
  close: async () => {
    await current!.close()
    current = undefined
  }
}

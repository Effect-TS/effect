// The rows workload, framework-free: the data, the state transitions, the timed operations and the
// memory steps. Each entry (entry.ts for effect/ui, react.mjs for React) renders the same keyed
// table and passes its variants to `install`, which puts `bench`, `memory` and `opNames` on
// `window` for run.mjs.
//
// The table, for every variant:
//
//   table.table > tbody > tr[class=danger when selected], keyed by row id, of
//     td.col-md-1 (the id), td.col-md-4 > a (the label; a click selects the row),
//     td.col-md-1 > a > span.glyphicon.glyphicon-remove[aria-hidden=true] (a click removes the row),
//     td.col-md-6

export interface Row {
  readonly id: number
  readonly label: string
}
export interface Model {
  readonly rows: ReadonlyArray<Row>
  readonly selected: number
  readonly nextId: number
}
export type Message =
  | { readonly _tag: "Run"; readonly count: number }
  | { readonly _tag: "Add"; readonly count: number }
  | { readonly _tag: "Update" }
  | { readonly _tag: "Clear" }
  | { readonly _tag: "Swap" }
  | { readonly _tag: "Select"; readonly id: number }
  | { readonly _tag: "Remove"; readonly id: number }

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
export const buildRows = (from: number, count: number): Array<Row> =>
  Array.from({ length: count }, (_, i) => ({
    id: from + i,
    label: adjectives[random(adjectives.length)] + " " + colours[random(colours.length)] + " " +
      nouns[random(nouns.length)]
  }))

export const init = (): Model => ({ rows: [], selected: 0, nextId: 1 })

export const update = (model: Model, message: Message): Model => {
  switch (message._tag) {
    case "Run":
      return {
        ...model,
        rows: buildRows(model.nextId, message.count),
        nextId: model.nextId + message.count,
        selected: 0
      }
    case "Add":
      return {
        ...model,
        rows: [...model.rows, ...buildRows(model.nextId, message.count)],
        nextId: model.nextId + message.count
      }
    case "Update":
      return { ...model, rows: model.rows.map((row, i) => i % 10 === 0 ? { ...row, label: row.label + " !!!" } : row) }
    case "Clear":
      return { ...model, rows: [], selected: 0 }
    case "Swap": {
      if (model.rows.length < 999) return model
      const rows = [...model.rows]
      const a = rows[1]
      rows[1] = rows[998]
      rows[998] = a
      return { ...model, rows }
    }
    case "Select":
      return { ...model, selected: message.id }
    case "Remove":
      return { ...model, rows: model.rows.filter((row) => row.id !== message.id) }
  }
}

/** A mounted variant: `send` hands a message to the app, `close` unmounts it. */
export interface Mounted {
  readonly send: (message: Message) => void
  readonly close: () => Promise<void>
}
export type Variant = (container: HTMLElement) => Promise<Mounted>

// -- timing --------------------------------------------------------------------------------------
// Wall-clock time from just before the message is sent (or the click) to the first microtask after
// the change is in the DOM: update, the view, the diff, the DOM writes and the commit, but not style,
// layout or paint. An update that needs more than that fails the run.
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

const mountApp = async (variant: Variant) => {
  const container = document.body.appendChild(document.createElement("div"))
  const mounted = await variant(container)
  await settle(() => container.querySelector("tbody") !== null, "mount")
  const tbody = container.querySelector("tbody")!
  const rows = () => tbody.children
  const send = async (message: Message, done: () => boolean, label: string) => {
    const start = performance.now()
    mounted.send(message)
    return (await settle(done, label)) - start
  }
  const click = async (element: HTMLElement, done: () => boolean, label: string) => {
    const start = performance.now()
    element.click()
    return (await settle(done, label)) - start
  }
  const close = async () => {
    await mounted.close()
    container.remove()
  }
  return { rows, send, click, close }
}
type App = Awaited<ReturnType<typeof mountApp>>

const firstLabel = (rows: HTMLCollection) => rows[0]?.children[1]?.textContent ?? ""

type Op = (app: App) => Promise<number>
const run = (count: number) => (app: App) => app.send({ _tag: "Run", count }, () => app.rows().length === count, "run")
const clear = (app: App) => app.send({ _tag: "Clear" }, () => app.rows().length === 0, "clear")

/** Each op: a setup outside the figure, then the measured step. */
const ops: Record<string, { readonly setup: Op; readonly step: Op }> = {
  create1k: { setup: clear, step: run(1000) },
  replace1k: {
    setup: run(1000),
    step: (app) => {
      const before = app.rows()[0]
      return app.send({ _tag: "Run", count: 1000 }, () => app.rows()[0] !== before, "replace")
    }
  },
  update10th: {
    setup: run(1000),
    step: (app) => app.send({ _tag: "Update" }, () => firstLabel(app.rows()).endsWith("!!!"), "update")
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
      return app.send({ _tag: "Swap" }, () => app.rows()[998] === second, "swap")
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
    step: (app) => app.send({ _tag: "Add", count: 1000 }, () => app.rows().length === 2000, "append")
  },
  clear1k: { setup: run(1000), step: clear }
}

export const install = (variants: Record<string, Variant>) => {
  const variant = (name: string) => {
    const found = variants[name]
    if (found === undefined) throw new Error("bench: this bundle has no variant " + name)
    return found
  }
  ;(window as any).opNames = Object.keys(
    ops
  ) /** The median of `repeats` measured steps, after `warmup` unmeasured ones. */
  ;(window as any).bench = async (name: string, op: string, warmup: number, repeats: number, profile = false) => {
    hops = 0
    const app = await mountApp(variant(name))
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

  // The runner forces a garbage collection and reads the JS heap between these steps.
  let current: App | undefined
  ;(window as any).memory = {
    mount: async (name: string) => {
      current = await mountApp(variant(name))
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
}

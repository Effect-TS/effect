/**
 * Server rendering tests: render a tree on the server, hydrate it in a fresh
 * document, and check that hydration adopted what the server rendered.
 *
 * `ssr` fails with `SsrError` when:
 *
 * - an instance the server rendered didn't adopt its Model, or its Model,
 *   encoded again after adoption, differs from the server's. Props that drift
 *   between the server and the client show up here, as paths that don't line
 *   up;
 * - a node the server rendered outside a deferred instance was rebuilt
 *   instead of adopted, or a marker is left behind;
 * - the server's merged head differs from the client's first merge. JSON-LD
 *   is compared canonically, `class` as a set and `data-*` per name;
 * - the head sync warns about the server's document;
 * - a shipped loader entry doesn't decode and encode back as it was shipped,
 *   args key included, once the state has been through
 *   `HtmlServer.serializeState` and `JSON.parse`;
 * - the client fetched a hydrated entry into its cache inside the fetch-free
 *   window, unless the render was `static`. A caller-only fetch, which
 *   stores nothing, is allowed;
 * - a slot was still waiting for its Layer when the budget was spent;
 * - a problem was reported, on either side.
 *
 * **Example** (Checking a page hydrates)
 *
 * ```ts
 * import { ssr } from "effect/ui/html/testing"
 * import { Effect, Schema } from "effect"
 * import { Component, Head } from "effect/ui"
 * import { TestHost } from "effect/ui/testing"
 *
 * const App = Component.make({
 *   name: "App",
 *   model: Schema.Struct({}),
 *   message: Schema.Never,
 *   init: () => ({}),
 *   update: (model) => model,
 *   head: () => [Head.title("Home")],
 *   view: (_, h) => h.el("h1", "Home")
 * })
 *
 * const test = Effect.gen(function*() {
 *   const result = yield* ssr(App, {})
 *   return result.adopted // ["/App"]
 * }).pipe(Effect.scoped, Effect.provide(TestHost.layer()))
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Clock from "../../../Clock.ts"
import * as Context from "../../../Context.ts"
import * as Data from "../../../Data.ts"
import * as Duration from "../../../Duration.ts"
import * as Effect from "../../../Effect.ts"
import * as Fiber from "../../../Fiber.ts"
import * as Loader from "../../../reactivity/Loader.ts"
import type * as Scope from "../../../Scope.ts"
import * as TestClock from "../../../testing/TestClock.ts"
import type * as Component from "../../Component.ts"
import * as Head from "../../Head.ts"
import * as runtime from "../../internal/runtime.ts"
import * as MessageLog from "../../MessageLog.ts"
import * as Renderer from "../../Renderer.ts"
import * as TestHost from "../../testing/TestHost.ts"
import type * as View from "../../View.ts"
import * as BrowserHost from "../BrowserHost.ts"
import * as Html from "../Html.ts"
import * as HtmlServer from "../HtmlServer.ts"
import * as markers from "../internal/markers.ts"
import * as server from "../internal/server.ts"

/**
 * What `ssr` hands back once hydration has adopted.
 *
 * **Details**
 *
 * `html`, `model` and `head` are the server's. `state` is the server's
 * state as the client read it, after `HtmlServer.serializeState` and
 * `JSON.parse`. `document` is the hydrated page and `container` the app's
 * element in it. `root` is the client tree, registered with `TestHost` so
 * `TestHost.settle` waits for it; `root.fetches()` lists the client's
 * fetches. `adopted` lists the paths whose Model the client adopted. `log`
 * is the client's log up to adoption and `serverLog` the server's, both
 * unbounded unless `logSize` says otherwise. `commands` lists all `init`
 * Commands run by adopted instances, by position. `misses` lists loader
 * entries the server's cache had in flight when the budget
 * was spent, or never started with a budget of 0. The client fetches those.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Ssr<out Model, in Msg, out Events = never> {
  readonly html: string
  readonly state: Renderer.State
  readonly model: Model | undefined
  readonly head: Head.Head
  readonly document: Document
  readonly container: globalThis.Element
  readonly root: TestHost.Root<Model, Msg, Events>
  readonly adopted: ReadonlyArray<string>
  readonly log: ReadonlyArray<MessageLog.Entry>
  readonly serverLog: ReadonlyArray<MessageLog.Entry>
  readonly commands: ReadonlyArray<{ readonly path: string; readonly name: string; readonly index: number }>
  readonly misses: ReadonlyArray<{ readonly read: string; readonly logKey: string }>
}

/**
 * Hydration didn't adopt what the server rendered, or a check around it
 * failed. `problems` lists each one, by path, head identity or read.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class SsrError extends Data.TaggedError("SsrError")<{
  readonly problems: ReadonlyArray<string>
}> {
  override get message(): string {
    return `Server rendering and hydration disagree:\n${this.problems.map((problem) => `- ${problem}`).join("\n")}`
  }
}

/** A node the server rendered, and the paths of the instances around it, innermost last. */
interface ServerNode {
  readonly node: globalThis.Node
  readonly paths: ReadonlyArray<string>
}

/** The element and text nodes under `container`, with the marker ranges they sit in. */
const serverNodes = (container: globalThis.Element): Array<ServerNode> => {
  const out: Array<ServerNode> = []
  const paths: Array<string> = []
  const visit = (parent: globalThis.Node) => {
    for (let node = parent.firstChild; node !== null; node = node.nextSibling) {
      if (node.nodeType === 8) {
        const marker = markers.parse((node as globalThis.Comment).data)
        if (marker?._tag === "Open") paths.push(marker.path)
        else if (marker?._tag === "Close") paths.pop()
        continue
      }
      out.push({ node, paths: paths.slice() })
      // A text-only element's content is rebuilt by design: only the element itself is adopted.
      if (!server.textOnlyTags.has((node as globalThis.Element).localName)) visit(node)
    }
  }
  visit(container)
  return out
}

const markersLeft = (container: globalThis.Element): Array<string> => {
  const out: Array<string> = []
  const visit = (parent: globalThis.Node) => {
    for (let node = parent.firstChild; node !== null; node = node.nextSibling) {
      if (node.nodeType === 8) {
        const marker = markers.parse((node as globalThis.Comment).data)
        if (marker?._tag === "Open") out.push(marker.path)
      } else visit(node)
    }
  }
  visit(container)
  return out
}

const show = (value: unknown): string => value === undefined ? "nothing" : JSON.stringify(value)

/** The differences between two merged heads, one line per field or identity. */
const compareHeads = (serverHead: Head.Head, client: Head.Head): Array<string> => {
  const problems: Array<string> = []
  const same = (what: string, a: unknown, b: unknown) => {
    if (a !== b) problems.push(`head ${what}: the server has ${show(a)}, the client ${show(b)}`)
  }
  same("title", serverHead.title, client.title)
  same("html lang", serverHead.html.lang, client.html.lang)
  same("html dir", serverHead.html.dir, client.html.dir)
  const tokens = (what: string, a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
    same(what, [...new Set(a)].sort().join(" "), [...new Set(b)].sort().join(" "))
  tokens("html class", serverHead.html.class, client.html.class)
  tokens("body class", serverHead.body.class, client.body.class)
  const byName = (what: string, a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) => {
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) same(`${what} ${name}`, a[name], b[name])
  }
  byName("html", serverHead.html.data, client.html.data)
  byName("body", serverHead.body.data, client.body.data)
  const entries = (head: Head.Head) =>
    new Map<string, string>([
      ...head.meta.map((entry) => [Head.identity(entry), JSON.stringify(Head.attributes(entry))] as const),
      ...head.links.map((entry) => [Head.identity(entry), JSON.stringify(Head.attributes(entry))] as const),
      ...head.jsonLd.map((entry) => [Head.identity(entry), entry.json] as const)
    ])
  const a = entries(serverHead)
  const b = entries(client)
  for (const identity of new Set([...a.keys(), ...b.keys()])) same(identity, a.get(identity), b.get(identity))
  return problems
}

const nextMacrotask = Effect.callback<void>((resume) => {
  const handle = setTimeout(() => resume(Effect.void), 0)
  return Effect.sync(() => clearTimeout(handle))
})

/** Sleeps no tree ever wakes from: past this, a step gives up. */
const stepLimit = 10_000

/**
 * Renders a component tree on the server, hydrates the HTML in a fresh
 * document with the same props, waits for `root.adopted`, and checks that
 * hydration adopted what the server rendered.
 *
 * **Details**
 *
 * `ssr` runs on `TestHost`'s scheduler and the test clock, so it works
 * under `it.effect`. Both sides run with the caller's services, so provide
 * the ones the tree needs, such as `Router.memory`, around it.
 *
 * `props` may be an Effect, such as `Router.props(AppRoute)`. Each side runs
 * it once, before `init`, as a real server and browser would.
 *
 * The server phase drives itself: it steps the clock to each wake of the
 * tree's own sleepers, a fetch or a Layer build, until the render is idle or
 * `budget` (default 500 ms) is spent. Once the server's Scope has closed the
 * clock is set to exactly the start plus `budget`, and the client mounts
 * there. While a slot waits for its Layer before adopting, the client steps
 * the clock the same way, for up to `budget` more, and then fails naming the
 * waiting paths. A Layer that sleeps on a clock other than the one it is
 * given is not seen: either phase then spends its whole budget before it
 * gives up.
 *
 * `frames` projects the container after each client commit, starting from
 * the server's markup, for `root.frames()`. It defaults to the container's
 * text.
 *
 * `budget` and `static` are passed to the server render, and `loader` to
 * the client mount only: the server's cache is per request. With `static`
 * there is no fetch-free window, so its check is skipped; an entry is then
 * stale at hydration, and refetched, unless its read's `staleTime` is
 * `"Infinity"`.
 *
 * **Gotchas**
 *
 * Any problem fails `ssr`, including `Command.ServerCommandIssued` on the
 * server. To test one, render with `Renderer.prerender` instead.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const ssr = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements, RP = never>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & BrowserHost.HtmlRoot<V>,
  props: Props | Effect.Effect<Props, never, RP>,
  options?: {
    readonly budget?: Duration.Input | undefined
    readonly static?: boolean | undefined
    readonly loader?: Renderer.LoaderOptions | undefined
    readonly logSize?: number | undefined
    readonly frames?: ((container: globalThis.Element) => string) | undefined
  }
): Effect.Effect<
  Ssr<Model, Msg, Events>,
  SsrError,
  Exclude<R | RP, Html.Host> | TestHost.TestHost | Scope.Scope
> =>
  Effect.gen(function*() {
    const testHost = yield* TestHost.TestHost
    const outer = yield* Effect.context<never>()
    const clock = Context.get(outer, Clock.Clock)
    if (typeof (clock as Partial<TestClock.TestClock>).setTime !== "function") {
      return yield* Effect.die(new Error("[ssr] runs on the test clock: run it under it.effect, or provide TestClock"))
    }
    const budget = Duration.toMillis(options?.budget ?? "500 millis")
    const isStatic = options?.static === true
    const logSize = options?.logSize ?? Infinity
    const now = () => clock.currentTimeMillisUnsafe()

    // The wakes of the tree's own sleepers. A sleeper drains the scheduler when it wakes.
    const sleepers = new Set<{ readonly at: number }>()
    const draining = testHost.drainingClock(clock, outer)
    const tracking: Clock.Clock = Object.assign(Object.create(draining), {
      sleep: (duration: Duration.Duration) =>
        Effect.suspend(() => {
          const sleeper = { at: now() + Duration.toMillis(duration) }
          sleepers.add(sleeper)
          return Effect.ensuring(draining.sleep(duration), Effect.sync(() => sleepers.delete(sleeper)))
        })
    })
    /** Runs the scheduler until nothing is left, giving outside work a few macrotasks to come back. */
    const quiesce = Effect.gen(function*() {
      let quiet = 0
      while (quiet < 3) {
        if (testHost.busy()) {
          quiet = 0
          if (!testHost.drain(testHost.budget)) {
            return yield* new SsrError({
              problems: [`a step ran ${testHost.budget} scheduler tasks and work is still being scheduled`]
            })
          }
          continue
        }
        quiet++
        yield* nextMacrotask
      }
    })
    /** Steps the clock to each wake of the tree's sleepers until `done`, or no wake is left by `deadline`. */
    const stepUntil = Effect.fnUntraced(function*(done: () => boolean, deadline: number) {
      for (let step = 0; step < stepLimit; step++) {
        yield* quiesce
        if (done()) return true
        let next = Infinity
        for (const sleeper of sleepers) if (sleeper.at < next) next = sleeper.at
        if (next > deadline) return false
        yield* TestClock.setTime(Math.max(next, now()))
      }
      return false
    })

    // -- server ---------------------------------------------------------------
    const start = now()
    const serverLog = MessageLog.makeMemory({ size: logSize })
    let serverCache: ReturnType<typeof Loader.internals> | undefined
    let misses: ReadonlyArray<{ readonly read: string; readonly logKey: string }> = []
    const serverFiber = yield* runtime.prerender(component, props, {
      budget,
      elements: [Html.name],
      static: isStatic,
      onFinish: (cache) => {
        serverCache = cache
        misses = cache.misses()
      }
    }).pipe(
      Effect.provideService(MessageLog.MessageLog, serverLog),
      Effect.provideService(Html.Host, BrowserHost.htmlHost),
      Effect.provideService(Clock.Clock, tracking),
      Effect.provideService(Loader.Problems, testHost.report),
      Effect.forkChild
    )
    const serverDone = () => serverFiber.pollUnsafe() !== undefined
    if (!(yield* stepUntil(serverDone, start + budget))) {
      // A sleep the tree's clock didn't see: the budget is spent whole.
      yield* TestClock.setTime(start + budget)
      if (!(yield* stepUntil(serverDone, start + budget))) {
        return yield* new SsrError({ problems: ["the server render didn't finish when its budget was spent"] })
      }
    }
    const rendered = (yield* Fiber.join(serverFiber)) as Renderer.Prerendered<Model>
    if (now() < start + budget) yield* TestClock.setTime(start + budget)

    const problems: Array<string> = []
    // The state as the client reads it from the page.
    const state = JSON.parse(HtmlServer.serializeState(rendered.state)) as Renderer.State
    if (serverCache !== undefined) {
      for (const problem of serverCache.checkWire(state["~loader"] ?? {})) problems.push(`~loader: ${problem}`)
    }
    const html = server.toHtml(rendered.nodes)
    const page = `<!doctype html><html ${server.attributes(server.htmlOwned(rendered.head))}><head>${
      server.headTags(rendered.head)
    }</head><body ${server.attributes(server.bodyOwned(rendered.head))}><div id="app">${html}</div></body></html>`
    const document = new DOMParser().parseFromString(page, "text/html")
    const container = document.getElementById("app")!
    const before = serverNodes(container)
    const project = options?.frames ?? ((container: globalThis.Element) => container.textContent ?? "")
    const frames: Array<string> = []
    const frame = () => {
      const next = project(container)
      if (frames.length === 0 || frames[frames.length - 1] !== next) frames.push(next)
    }
    frame()

    // -- client ---------------------------------------------------------------
    const host = BrowserHost.makeHost(document, { warn: (message) => problems.push(message) })
    yield* Effect.addFinalizer(() => Effect.sync(host.dispose))
    const clientLog = MessageLog.makeMemory({ size: logSize })
    // Adoption is judged at the commit of the flush in which each instance adopted, so a later
    // update, such as the message an `onMount` sends, may replace nodes without counting against it.
    const deferred = new Set(state["~deferred"] ?? [])
    let unjudged = before.filter(({ paths }) => paths.length > 0 && !paths.some((path) => deferred.has(path)))
    const rebuilt = new Set<string>()
    let read = 0
    const judge = () => {
      const entries = clientLog.entries()
      const adoptedNow = new Set<string>()
      for (; read < entries.length; read++) {
        const entry = entries[read]!
        if (entry._tag === "Mounted" && entry.adopted) adoptedNow.add(entry.path)
      }
      unjudged = unjudged.filter(({ node, paths }) => {
        const owner = paths[paths.length - 1]!
        if (!adoptedNow.has(owner)) return true
        if (!container.contains(node)) rebuilt.add(owner)
        return false
      })
    }
    // The head as the runtime evaluated it at adoption, merged over its own instance tree.
    let adoptionHead: Head.Head | undefined
    const recording: Renderer.Host<globalThis.Node> = {
      ...host,
      hydration: {
        ...host.hydration!,
        adopted: (head) => {
          adoptionHead = head
        }
      },
      commit: () => {
        host.commit?.()
        judge()
        frame()
      }
    }
    const mounted = yield* runtime.mount(component, props, container, { state, loader: options?.loader }).pipe(
      Effect.provideContext(
        Context.make(Renderer.Renderer, { host: recording }).pipe(
          Context.add(Html.Host, BrowserHost.htmlHost),
          Context.add(MessageLog.MessageLog, clientLog),
          Context.add(Clock.Clock, tracking),
          Context.add(Loader.Visibility, testHost.visibility),
          Context.add(Loader.Connectivity, testHost.connectivity),
          Context.add(Loader.Problems, testHost.report)
        )
      )
    ) as Effect.Effect<runtime.Root & Renderer.Root<any, any>, never, Exclude<R | RP, Html.Host> | Scope.Scope>
    const root = yield* TestHost.register(testHost, mounted, clientLog, () => frames.slice())
    let adoptedDone = false
    yield* Effect.forkChild(Effect.andThen(mounted.adopted, Effect.sync(() => adoptedDone = true)))
    const deadline = now() + budget
    const adoptedOrFallback = Effect.gen(function*() {
      if (yield* stepUntil(() => adoptedDone, deadline)) return true
      // A sleep the tree's clock didn't see: the budget is spent whole.
      if (now() < deadline) yield* TestClock.setTime(deadline)
      return yield* stepUntil(() => adoptedDone, deadline)
    })
    if (!(yield* adoptedOrFallback)) {
      return yield* new SsrError({
        problems: mounted.waiting().map((path) =>
          `${path}: still waiting for its Layer to adopt when the budget was spent`
        )
      })
    }
    // `adopted` can resume before the flush that adopted the last slot commits; its nodes are claimed by now.
    judge()

    // -- checks ---------------------------------------------------------------
    const log = clientLog.entries()
    const adoptedEntries = log.filter((entry): entry is MessageLog.Mounted => entry._tag === "Mounted" && entry.adopted)
    const adopted = adoptedEntries.map((entry) => entry.path)
    for (const path of Object.keys(state)) {
      if (path.startsWith("~")) continue
      const entry = adoptedEntries.find((entry) => entry.path === path)
      if (entry === undefined) {
        problems.push(`${path}: the client didn't adopt the server's Model`)
        continue
      }
      // The adopted slots are logged right after the adoption, one entry per slot the server wrote.
      const slots: Record<string, unknown> = {}
      for (const later of log.slice(log.indexOf(entry) + 1)) {
        if (later.path !== path) continue
        if (later._tag !== "LoaderChanged") break
        slots[later.name] = later.slot
      }
      const encoded = runtime.stateCodecOf(entry.component).encode(
        entry.model,
        Object.keys(slots).length === 0 ? undefined : { ...(entry.component["~loaders"] as any)?.empty, ...slots }
      )
      const json = encoded._tag === "Some" ? JSON.stringify(encoded.value) : undefined
      if (json !== JSON.stringify(state[path])) {
        problems.push(
          `${path}: the adopted state encodes to ${json ?? "nothing"}, the server's is ${JSON.stringify(state[path])}`
        )
      }
    }
    for (const path of rebuilt) problems.push(`${path}: the client rebuilt the server's nodes instead of adopting them`)
    // Every server node outside a deferred instance is judged: one whose instance never adopted under
    // the path its markers carry was not adopted either.
    for (const path of new Set(unjudged.map(({ paths }) => paths[paths.length - 1]!))) {
      problems.push(`${path}: no instance adopted the server's nodes under this path`)
    }
    for (const path of markersLeft(container)) problems.push(`${path}: its markers are still in the document`)
    problems.push(...compareHeads(rendered.head, adoptionHead ?? Head.empty))
    if (!isStatic) {
      for (const entry of log) {
        // A caller-only fetch (`stored: false`) is allowed: only a fetch the cache stores defeats hydration.
        if (entry._tag === "FetchStarted" && entry.inWindow && entry.stored) {
          problems.push(`${entry.read} ${entry.logKey}: fetched inside the fetch-free window (${entry.trigger})`)
        }
      }
    }
    for (const problem of testHost.problems()) problems.push(`${problem._tag}: ${problem.message}`)
    if (problems.length > 0) return yield* new SsrError({ problems })

    const commands = adoptedEntries.flatMap((entry) =>
      entry.commands.flatMap((command, index) =>
        command._tag === "Interrupt" ? [] : [{ path: entry.path, name: command.name, index }]
      )
    )
    return {
      html,
      state,
      model: rendered.model,
      head: rendered.head,
      document,
      container,
      root: root as TestHost.Root<Model, Msg, Events>,
      adopted,
      log,
      serverLog: serverLog.entries(),
      commands,
      misses
    }
  })

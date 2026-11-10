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
 * - the head sync warns about the server's document.
 *
 * **Example** (Checking a page hydrates)
 *
 * ```ts
 * import { ssr } from "effect/ui/html/testing"
 * import { Effect, Schema } from "effect"
 * import { Component, Head } from "effect/ui"
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
 * }).pipe(Effect.scoped)
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../../../Context.ts"
import * as Data from "../../../Data.ts"
import type * as Duration from "../../../Duration.ts"
import * as Effect from "../../../Effect.ts"
import * as Loader from "../../../reactivity/Loader.ts"
import * as Schema from "../../../Schema.ts"
import type * as Scope from "../../../Scope.ts"
import type * as Component from "../../Component.ts"
import * as Head from "../../Head.ts"
import * as services from "../../internal/services.ts"
import * as MessageLog from "../../MessageLog.ts"
import * as Renderer from "../../Renderer.ts"
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
 * `html`, `state` and `model` are the server's, `head` its merged head.
 * `document` is the hydrated page and `container` the app's element in it.
 * `adopted` lists the paths whose Model the client adopted. `log` is the
 * client's log from hydration on, and `serverLog` the server's, which holds
 * a `CommandDropped` entry for every Command `init` issued there. `commands`
 * are the Commands adopted instances ran after replaying `init`, by position:
 * every one `init` issued.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Ssr<out Model, in Msg> {
  readonly html: string
  readonly state: Renderer.State
  readonly model: Model | undefined
  readonly head: Head.Head
  readonly document: Document
  readonly container: globalThis.Element
  readonly root: Renderer.Root<Model, Msg>
  readonly adopted: ReadonlyArray<string>
  readonly log: ReadonlyArray<MessageLog.Entry>
  readonly serverLog: ReadonlyArray<MessageLog.Entry>
  readonly commands: ReadonlyArray<{ readonly path: string; readonly name: string; readonly index: number }>
  /**
   * PROTOTYPE (EFF-3558): every cache fetch on each side, in order, with its trigger. `fetches.client`
   * is live: it keeps growing after `ssr` returns. `inWindow`: it started inside the fetch-free window.
   */
  readonly fetches: {
    readonly server: ReadonlyArray<Loader.FetchEvent>
    readonly client: ReadonlyArray<Loader.FetchEvent & { readonly inWindow: boolean }>
  }
  /** PROTOTYPE (EFF-3558): the state as `HtmlServer.serializeState` writes it, to measure its size. */
  readonly payload: string
  /** PROTOTYPE (EFF-3558): the client's cache, for `inspect` and `peek`. */
  readonly cache: Loader.CacheInternals
}

/**
 * Hydration didn't adopt what the server rendered. `problems` lists each
 * difference, by path or head identity.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.3
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

const encodeJson = (schema: Schema.Codec<any, any>, value: unknown): string | undefined => {
  try {
    return JSON.stringify(Schema.encodeUnknownSync(Schema.toCodecJson(schema as Schema.Codec<unknown, unknown>))(value))
  } catch {
    return undefined
  }
}

/**
 * Renders a component tree on the server, hydrates the HTML in a fresh
 * document with the same props, waits for `root.adopted`, and checks that
 * hydration adopted what the server rendered.
 *
 * **Details**
 *
 * Both sides run with the caller's services, so provide the ones the tree
 * needs, such as `Router.memory`, around `ssr`. The client mount lives as
 * long as the current Scope. `budget` is passed to `HtmlServer.renderToHtml`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const ssr = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & BrowserHost.HtmlRoot<V>,
  props: Props,
  options?: {
    readonly budget?: Duration.Input | undefined
    /** As `HtmlServer.renderToHtml` takes it: the entries hydrate with unknown age and there's no window. */
    readonly static?: boolean | undefined
    /** The client mount's cache options. The server takes none. */
    readonly loader?: { readonly idleTimeToLive?: Duration.Input | undefined } | undefined
  }
): Effect.Effect<Ssr<Model, Msg>, SsrError, Exclude<R, Html.Host> | Scope.Scope> =>
  Effect.gen(function*() {
    // -- server ---------------------------------------------------------------
    const serverLog = MessageLog.makeMemory({ size: 100_000 })
    const serverFetches: Array<Loader.FetchEvent> = []
    const clientFetches: Array<Loader.FetchEvent & { readonly inWindow: boolean }> = []
    let clientCache: Loader.CacheInternals | undefined
    const rendered = yield* Renderer.prerender(component, props, {
      budget: options?.budget,
      elements: [Html.name],
      static: options?.static
    })
      .pipe(
        Effect.provideService(services.CacheObserver, (cache) => {
          Loader.internals(cache as Loader.Cache["Service"]).onFetch((event) => serverFetches.push(event))
        }),
        Effect.provideService(MessageLog.MessageLog, serverLog),
        Effect.provideService(Html.Host, BrowserHost.htmlHost)
      )
    const html = server.toHtml(rendered.nodes)
    const page = `<!doctype html><html ${server.attributes(server.htmlOwned(rendered.head))}><head>${
      server.headTags(rendered.head)
    }</head><body ${server.attributes(server.bodyOwned(rendered.head))}><div id="app">${html}</div></body></html>`
    const document = new DOMParser().parseFromString(page, "text/html")
    const container = document.getElementById("app")!
    const before = serverNodes(container)

    // -- client ---------------------------------------------------------------
    const problems: Array<string> = []
    const host = BrowserHost.makeHost(document, { warn: (message) => problems.push(message) })
    yield* Effect.addFinalizer(() => Effect.sync(host.dispose))
    const clientLog = MessageLog.makeMemory({ size: 100_000 })
    // Adoption is judged at the commit of the flush in which each instance adopted, so a later
    // update, such as the message an `onMount` sends, may replace nodes without counting against it.
    const deferred = new Set(rendered.state["~deferred"] ?? [])
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
      }
    }
    // The state crosses the wire as JSON, so the client adopts what a browser would parse.
    const payload = HtmlServer.serializeState(rendered.state)
    const root = yield* Renderer.mount(component, props, container, {
      state: JSON.parse(payload),
      loader: options?.loader
    }).pipe(
      Effect.provideContext(
        Context.make(Renderer.Renderer, { host: recording }).pipe(
          Context.add(Html.Host, BrowserHost.htmlHost),
          Context.add(MessageLog.MessageLog, clientLog),
          Context.add(services.CacheObserver, (cache) => {
            const internals = Loader.internals(cache as Loader.Cache["Service"])
            clientCache = internals
            internals.onFetch((event) => clientFetches.push({ ...event, inWindow: internals.isWindowOpen() }))
          })
        )
      )
    ) as Effect.Effect<Renderer.Root<Model, Msg>, never, Exclude<R, Html.Host> | Scope.Scope>
    yield* root.adopted
    // `adopted` can resume before the flush that adopted the last slot commits; its nodes are claimed by now.
    judge()

    // -- checks ---------------------------------------------------------------
    const log = clientLog.entries()
    const mounted = log.filter((entry): entry is MessageLog.Mounted => entry._tag === "Mounted" && entry.adopted)
    const adopted = mounted.map((entry) => entry.path)
    for (const path of Object.keys(rendered.state)) {
      if (path.startsWith("~")) continue
      const entry = mounted.find((entry) => entry.path === path)
      if (entry === undefined) {
        problems.push(`${path}: the client didn't adopt the server's Model`)
        continue
      }
      const encoded = encodeJson(entry.component.model, entry.model)
      if (encoded !== JSON.stringify(rendered.state[path])) {
        problems.push(
          `${path}: the adopted Model encodes to ${encoded ?? "nothing"}, the server's is ${
            JSON.stringify(rendered.state[path])
          }`
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
    // Inside the fetch-free window only invalidation, a host edge or the interval may fetch a shipped
    // entry. One the server didn't ship (a budget miss) is cold, and fetches as usual.
    const shipped = new Set<string>()
    const entries = rendered.state["~loader"]
    if (typeof entries === "object" && entries !== null) {
      for (const [read, tuples] of Object.entries(entries)) {
        if (Array.isArray(tuples)) { for (const tuple of tuples) shipped.add(`${read}\u0000${tuple?.[0]}`) }
      }
    }
    for (const event of clientFetches) {
      if (!shipped.has(`${event.read}\u0000${event.argsKey}`)) continue
      if (event.inWindow && (event.trigger === "watch" || event.trigger === "get" || event.trigger === "prefetch")) {
        problems.push(`${event.read} ${event.argsKey}: a ${event.trigger} fetched inside the fetch-free window`)
      }
    }
    if (problems.length > 0) return yield* new SsrError({ problems })

    // Hydration replays every one of `init`'s Commands.
    const commands = mounted.flatMap((entry) =>
      entry.commands.flatMap((command, index) =>
        command._tag === "Interrupt" ? [] : [{ path: entry.path, name: command.name, index }]
      )
    )
    return {
      html,
      state: rendered.state,
      model: rendered.model,
      head: rendered.head,
      document,
      container,
      root,
      adopted,
      log,
      serverLog: serverLog.entries(),
      commands,
      fetches: { server: serverFetches, client: clientFetches },
      payload,
      cache: clientCache!
    }
  })

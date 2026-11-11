/**
 * The `Router`: the current URL as a route value, its changes, and the
 * navigation Commands.
 *
 * `Router` is a host service. Its Layers are `Router.memory` (tests and
 * `TestHost`), `Router.static` (server rendering) and, in
 * `effect/ui/html`, `BrowserRouter.layer` and `BrowserRouter.layerHash`.
 * Each provides the `Router` service and the navigation Commands, `Push`,
 * `Replace`, `Back`, `Forward` and `Load`. A component
 * that navigates has them in its requirements, so a missing Router is a
 * compile error at `mount`.
 *
 * **Where the route lives**
 *
 * The root's Model holds the route. The initial route comes in through the
 * root's props, and later changes arrive as a message from
 * `Router.subscription`, so every route change is in the log. The Router is
 * shaped like a `SubscriptionRef`: `changes` starts with the current
 * location, so a change made before the Subscription starts isn't lost. The
 * root's `update` must therefore ignore a route it already has.
 *
 * Pages are chosen with the union's exhaustive `match` and keyed by the whole
 * printed route, so a route change re-keys the page:
 * `h.child(Page, { key: AppRoute.print(route), props: route })`.
 *
 * **Example** (A root that follows the route)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { Command, Component, Route, Router } from "effect/ui"
 *
 * const AppRoute = Route.union({
 *   Home: Route.make("/"),
 *   About: Route.make("/about"),
 *   NotFound: Route.make("/*")
 * })
 *
 * const Message = Schema.TaggedUnion({
 *   ChangedRoute: { route: AppRoute },
 *   Go: { route: AppRoute },
 *   Navigated: {}
 * })
 *
 * const App = Component.make({
 *   name: "App",
 *   props: Schema.Struct({ route: AppRoute }),
 *   model: Schema.Struct({ route: AppRoute }),
 *   message: Message,
 *   init: ($) => ({ route: $.props.route }),
 *   update: (model, message, $) =>
 *     Message.match(message, {
 *       ChangedRoute: ({ route }) => AppRoute.print(route) === AppRoute.print(model.route) ? model : { route },
 *       Go: ({ route }) =>
 *         $.run(Router.push(AppRoute, route).pipe(Command.map(() => Message.make({ _tag: "Navigated" })))),
 *       Navigated: () => model
 *     }),
 *   subscriptions: () => [Router.subscription(AppRoute, (route) => Message.make({ _tag: "ChangedRoute", route }))],
 *   view: (model, h) => h.el("p", model.route._tag)
 * })
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as SubscriptionRef from "../SubscriptionRef.ts"
import * as Command from "./Command.ts"
import type * as Head from "./Head.ts"
import * as services from "./internal/services.ts"
import type * as Route from "./Route.ts"
import * as Subscription from "./Subscription.ts"

/**
 * Where the Router is: the route, its printed URL (path and query, under the
 * base) and its `#hash`, and the navigation that got there.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Location {
  readonly route: { readonly _tag: string }
  readonly url: string
  readonly hash: string
  readonly action: Action
  /** Counts navigations: 0 for the initial location. */
  readonly seq: number
}

/**
 * How a location was reached: the first load, a push, a replace, or a move
 * through history (`pop`), such as the back button.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Action = "initial" | "push" | "replace" | "pop"

/**
 * What a navigation Command returns: `"blocked"` when a block was held,
 * else `"navigated"`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Outcome = "navigated" | "blocked"

/**
 * The `Router` service.
 *
 * **Details**
 *
 * `changes` starts with the current location, then emits each route change.
 * A change to the `#hash` alone within the same route isn't a route change.
 * `navigate` takes an href: one the routes parse is pushed (or replaced), and
 * anything else is a full page load.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Router {
  readonly routes: Route.AnyUnion
  readonly location: () => Location
  readonly changes: Stream.Stream<Location>
  readonly navigate: (href: string, options?: { readonly replace?: boolean | undefined }) => Effect.Effect<Outcome>
  readonly push: (route: { readonly _tag: string }) => Effect.Effect<Outcome>
  readonly replace: (route: { readonly _tag: string }) => Effect.Effect<Outcome>
  readonly back: Effect.Effect<Outcome>
  readonly forward: Effect.Effect<Outcome>
  readonly load: (href: string) => Effect.Effect<Outcome>
  /** Holds a block under `key` until the Scope closes. */
  readonly block: (key: string) => Effect.Effect<void, never, Scope.Scope>
  /** Whether any block is held. */
  readonly blocked: () => boolean
}

/**
 * The `Router` service.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export const Router: Context.Service<Router, Router> = Context.Service<Router>("effect/ui/Router")

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * A route union, with its route values' type.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Routes = Route.AnyUnion & { readonly Type: { readonly _tag: string } }

/**
 * A route value of some union: the args Schema of `Push` and `Replace`. The
 * log encodes it structurally.
 */
const RouteValue = Schema.declare(
  (u: unknown): u is { readonly _tag: string } => Predicate.hasProperty(u, "_tag") && typeof u._tag === "string"
)

/**
 * The Command behind `push`. Use `push`, which types the route value; the
 * class is what a Layer fake or a story's `resolve` step names.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export class Push extends Command.Service<Push>()("effect/ui/Router/Push", {
  args: { route: RouteValue },
  invalidates: () => []
}, Effect.map(Router, (router) => ({ route }: { readonly route: { readonly _tag: string } }) => router.push(route))) {}

/**
 * The Command behind `replace`. Use `replace`, which types the route value;
 * the class is what a Layer fake or a story's `resolve` step names.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export class Replace extends Command.Service<Replace>()(
  "effect/ui/Router/Replace",
  {
    args: { route: RouteValue },
    invalidates: () => []
  },
  Effect.map(Router, (router) => ({ route }: { readonly route: { readonly _tag: string } }) => router.replace(route))
) {}

/**
 * Pushes a history entry for a route value of the given union.
 *
 * **Details**
 *
 * The route must be a complete value of `routes`, such as one built with
 * `routes.make`; pass the union given to the Router Layer or one of its
 * subsets. A route equal to the current one does nothing. It returns
 * `"blocked"` without navigating while a `Router.blocked` Subscription holds
 * a block. Map the outcome to a message with `Command.map`. The component
 * requires `Push`.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export const push = <U extends Routes>(_routes: U, route: U["Type"]): Command.Effectful<Outcome, Push> =>
  Push.make({ route })

/**
 * Replaces the current history entry with a route value of the given union.
 *
 * **Details**
 *
 * Typed like `push`. A replace that keeps the pathname, such as a search box
 * writing `?q=`, isn't announced and leaves focus alone. The component
 * requires `Replace`.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export const replace = <U extends Routes>(_routes: U, route: U["Type"]): Command.Effectful<Outcome, Replace> =>
  Replace.make({ route })

/**
 * Goes back one history entry.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export class Back extends Command.Service<Back>()("effect/ui/Router/Back", {
  args: {},
  invalidates: () => []
}, Effect.map(Router, (router) => () => router.back)) {}

/**
 * Goes forward one history entry.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export class Forward extends Command.Service<Forward>()("effect/ui/Router/Forward", {
  args: {},
  invalidates: () => []
}, Effect.map(Router, (router) => () => router.forward)) {}

/**
 * Loads an href with a full page load, such as an external URL.
 *
 * @stability experimental
 * @category commands
 * @since 4.1.3
 */
export class Load extends Command.Service<Load>()("effect/ui/Router/Load", {
  args: { href: Schema.String },
  invalidates: () => []
}, Effect.map(Router, (router) => ({ href }: { readonly href: string }) => router.load(href))) {}

/**
 * Blocks navigation under a key while the Subscription runs, such as while a
 * form has unsaved changes.
 *
 * **Details**
 *
 * While any block is held, `Push`, `Replace`, `Back`, `Forward` and `Load`
 * return `"blocked"` and links aren't followed. Back and forward in the
 * browser can't be blocked, only reverted: the Router moves back to the
 * entry it was on, announces nothing and leaves focus alone. The block is
 * held while `subscriptions` returns it, so the Model says when, and it's
 * released when the instance unmounts. It sends no messages.
 *
 * **Example** (Blocking navigation while a form is dirty)
 *
 * ```ts
 * import { Router } from "effect/ui"
 *
 * const subscriptions = (model: { readonly dirty: boolean }) => model.dirty ? [Router.blocked("form")] : []
 * ```
 *
 * @stability experimental
 * @category subscriptions
 * @since 4.1.3
 */
export const blocked = (key: string): Subscription.Subscription<never, Router> =>
  Subscription.make(
    `effect/ui/Router/blocked/${key}`,
    Stream.unwrap(Router.use((router) => Effect.as(router.block(key), Stream.never)))
  )

/**
 * Everything a Router Layer provides.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Services = Router | Push | Replace | Back | Forward | Load

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

const engines = new WeakMap<Router, Engine>()

/**
 * The Subscription that feeds route changes into a root's `update`.
 *
 * **Details**
 *
 * It maps each location's route to a message. The first one is the current
 * route, which the root usually has already, so `update` must ignore a route
 * equal to its own. Pass the union given to the Router Layer; a subset only
 * sees its own routes.
 *
 * Use this helper rather than `Router.changes` directly: the browser Router
 * times scroll, announcements and focus from the flush in which the root
 * received the change.
 *
 * @stability experimental
 * @category subscriptions
 * @since 4.1.3
 */
export const subscription = <U extends Routes, Msg>(
  routes: U,
  f: (route: U["Type"]) => Msg
): Subscription.Subscription<Msg, Router> => {
  const seqs = new WeakMap<object, number>()
  let last: number | undefined
  let engine: Engine | undefined
  const union: Route.AnyUnion = routes
  const stream = Stream.unwrap(Effect.map(Router, (router) => {
    engine = engines.get(router)
    return router.changes.pipe(
      Stream.map((location) => {
        const route = router.routes === union ? Option.some(location.route) : union.parse(location.url)
        if (Option.isNone(route)) return Option.none<Msg>()
        const message = f(route.value as U["Type"])
        if (typeof message === "object" && message !== null) seqs.set(message, location.seq)
        else last = location.seq
        return Option.some(message)
      }),
      Stream.filter(Option.isSome),
      Stream.map((message) => message.value)
    )
  }))
  return Object.assign(Subscription.make("effect/ui/Router", stream), {
    [services.onDeliver]: (message: unknown) => {
      const seq = typeof message === "object" && message !== null ? seqs.get(message) : last
      if (seq !== undefined) engine?.delivered(seq)
    }
  })
}

// ---------------------------------------------------------------------------
// History and the engine
// ---------------------------------------------------------------------------

/**
 * A history a Router runs on: `Router.memory` keeps one in memory, and the
 * browser Router wraps `window.history`.
 *
 * **Details**
 *
 * `go` moves through the entries and, synchronously or later, reports the
 * entry it landed on to the listener given to `listen`, as the browser's
 * `popstate` does. `state` is opaque to the history; the Router stores the
 * entry's index and its history-restore snapshot in it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface History {
  readonly current: () => { readonly url: string; readonly state: unknown }
  readonly push: (url: string, state: unknown) => void
  readonly replace: (url: string, state: unknown) => void
  readonly go: (delta: number) => void
  readonly load: (href: string) => void
  readonly listen: (popped: (url: string, state: unknown) => void) => () => void
}

/**
 * A navigation the Router has finished: the first flush after the root
 * received it in which no provided Layer build begun since is still pending.
 * The browser Router scrolls, announces and moves focus then.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Settled {
  readonly location: Location
  /** The pathname before the navigation. */
  readonly from: string
  /** The history entry's index. */
  readonly index: number
  /** The root's container. */
  readonly container: unknown
  /** The merged head after the flush. */
  readonly head: Head.Head
}

/**
 * The options of `make`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Options {
  readonly routes: Route.AnyUnion
  readonly history: History
  /** Called once per announced navigation, when it settles. */
  readonly onSettled?: ((settled: Settled) => void) | undefined
  /**
   * Called for a change to the `#hash` alone within the same route, with the
   * index of the history entry it moved to. `onLeave` was called for the entry
   * it left, so a pop can restore that entry's scroll position.
   */
  readonly onHash?: ((hash: string, action: "push" | "pop", index: number) => void) | undefined
  /** Called before the Router leaves the history entry at `index`. */
  readonly onLeave?: ((index: number) => void) | undefined
}

interface Engine {
  readonly delivered: (seq: number) => void
}

interface EntryState {
  readonly index: number
  readonly snapshot?: Record<string, unknown> | undefined
}

const stateKey = "effect/ui"

const readState = (state: unknown): EntryState | undefined => {
  if (typeof state !== "object" || state === null) return undefined
  const value = (state as Record<string, unknown>)[stateKey]
  return typeof value === "object" && value !== null && typeof (value as EntryState).index === "number"
    ? value as EntryState
    : undefined
}

const writeState = (entry: EntryState): unknown => ({ [stateKey]: entry })

const splitHash = (href: string): readonly [string, string] => {
  const at = href.indexOf("#", 1)
  return at < 0 ? [href, ""] : [href.slice(0, at), href.slice(at)]
}

/** A redirect or a trailing slash is replaced with the printed route. Anything else keeps its URL. */
const canonical = (
  routes: Route.AnyUnion,
  resolved: Route.Resolved<{ readonly _tag: string }>,
  url: string
): string => resolved.redirected ? routes.print(resolved.route) : url

const pathnameOf = (url: string): string => {
  const at = url.indexOf("?")
  return at < 0 ? url : url.slice(0, at)
}

const commandLayers = Layer.mergeAll(
  Push.layer,
  Replace.layer,
  Back.layer,
  Forward.layer,
  Load.layer
)

/**
 * Builds a Router Layer on a `History`, for hosts that bring their own.
 *
 * **Details**
 *
 * The Router resolves every href through `routes`: redirects and a trailing
 * slash are replaced with the canonical URL, and an href the routes don't
 * parse is a full page load. It implements blocking, history restore and the
 * settle timing; a host adds scroll, announcements and focus in `onSettled`.
 *
 * History restore: before leaving an entry, the Router saves the encoded
 * Model of every mounted instance by path. It can't save only the page's
 * subtree, because which instances the navigation unmounts is only known
 * after it. On back and forward, an instance created for the entry adopts its
 * saved Model, so only the re-keyed subtree is restored, and an instance that
 * stayed mounted keeps its own. As with hydration, `init` is replayed: its
 * Commands from `Command.Service`s declared `server: true` are dropped, so
 * nothing is fetched again, and its other Commands run.
 *
 * The snapshot is kept in memory per entry. When a push leaves an entry, it's
 * also written into that entry's `state`, so it survives a reload. When back
 * or forward leaves an entry, the host has already moved to the other entry,
 * so the snapshot stays in memory only. After a reload, that entry restores
 * the snapshot written when a push last left it, or starts fresh.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const make = (options: Options): Layer.Layer<Services> =>
  Layer.provideMerge(commandLayers, Layer.effectContext(Effect.suspend(() => build(options))))

const build = (options: Options): Effect.Effect<Context.Context<Router>, never, Scope.Scope> =>
  Effect.gen(function*() {
    const { history, routes } = options
    // With the `#` base the URL is the fragment, so there's no in-page hash.
    const split = (href: string): readonly [string, string] => routes.base() === "#" ? [href, ""] : splitHash(href)
    const start = history.current()
    const [startUrl, startHash] = split(start.url)
    const resolved = routes.resolve(startUrl)
    if (Option.isNone(resolved)) {
      return yield* Effect.die(new Error(`The Router's routes don't parse the initial URL "${start.url}"`))
    }
    let index = readState(start.state)?.index ?? 0
    const initialUrl = canonical(routes, resolved.value, startUrl)
    if (resolved.value.redirected || readState(start.state) === undefined || initialUrl !== startUrl) {
      history.replace(initialUrl + startHash, writeState({ index }))
    }
    let current: Location = { route: resolved.value.route, url: initialUrl, hash: startHash, action: "initial", seq: 0 }
    const ref = yield* SubscriptionRef.make(current)
    // Each key's holders: two instances may block under one key.
    const blocks = new Map<string, number>()
    const snapshots = new Map<number, Record<string, unknown>>()
    const roots = new Set<services.RootHandle>()
    let restoring: Map<string, unknown> | undefined
    let pending: {
      readonly location: Location
      readonly from: string
      readonly index: number
      since: number | undefined
    } | undefined
    let reverting = 0

    const primary = (): services.RootHandle | undefined => roots.values().next().value
    const snapshot = (): Record<string, unknown> => {
      const out: Record<string, unknown> = {}
      for (const root of roots) Object.assign(out, root.snapshot())
      return out
    }
    const leave = () => {
      options.onLeave?.(index)
      snapshots.set(index, snapshot())
    }
    const set = (next: Location, announce: boolean) => {
      const from = pathnameOf(current.url)
      current = next
      restoring = undefined
      if (announce) pending = { location: next, from, index, since: undefined }
      Effect.runSync(SubscriptionRef.set(ref, next))
    }

    const navigate = (href: string, replace: boolean): Outcome => {
      if (blocks.size > 0) return "blocked"
      const [url, hash] = split(href)
      const found = routes.resolve(url)
      if (Option.isNone(found)) {
        history.load(href)
        return "navigated"
      }
      const route = found.value.route
      const printed = canonical(routes, found.value, url)
      if (printed === current.url) {
        if (hash === current.hash) return "navigated"
        // A change to the hash alone: a new entry, and no route change.
        if (replace) history.replace(printed + hash, writeState({ index }))
        else {
          leave()
          index++
          history.push(printed + hash, writeState({ index }))
        }
        current = { ...current, hash }
        options.onHash?.(hash, "push", index)
        return "navigated"
      }
      const seq = current.seq + 1
      if (replace) {
        snapshots.delete(index)
        history.replace(printed + hash, writeState({ index }))
        const samePath = pathnameOf(printed) === pathnameOf(current.url)
        set({ route, url: printed, hash, action: "replace", seq }, !samePath)
      } else {
        leave()
        // The Model snapshot also goes into the entry itself, so it survives a reload.
        history.replace(current.url + current.hash, writeState({ index, snapshot: snapshots.get(index) }))
        index++
        for (const key of snapshots.keys()) if (key >= index) snapshots.delete(key)
        history.push(printed + hash, writeState({ index }))
        set({ route, url: printed, hash, action: "push", seq }, true)
      }
      return "navigated"
    }

    const popped = (href: string, state: unknown) => {
      const entry = readState(state)
      const target = entry?.index ?? 0
      if (reverting > 0) {
        reverting--
        index = target
        return
      }
      if (blocks.size > 0) {
        // Back and forward can't be blocked, only reverted.
        if (target !== index) {
          reverting++
          history.go(index - target)
        }
        return
      }
      const [url, hash] = split(href)
      const found = routes.resolve(url)
      if (Option.isNone(found)) return
      const printed = canonical(routes, found.value, url)
      if (printed === current.url) {
        if (hash === current.hash) {
          index = target
          return
        }
        options.onLeave?.(index)
        index = target
        current = { ...current, hash }
        options.onHash?.(hash, "pop", target)
        return
      }
      leave()
      index = target
      const saved = snapshots.get(target) ?? entry?.snapshot
      set({ route: found.value.route, url: printed, hash, action: "pop", seq: current.seq + 1 }, true)
      restoring = saved === undefined ? undefined : new Map(Object.entries(saved))
    }
    const unlisten = history.listen(popped)
    yield* Effect.addFinalizer(() => Effect.sync(unlisten))

    const hooks: services.RootHooks = {
      attach: (root) => {
        roots.add(root)
        return () => {
          roots.delete(root)
        }
      },
      restore: (path) => {
        if (restoring === undefined) return undefined
        const found = restoring.get(path)
        restoring.delete(path)
        return found
      },
      afterFlush: (root, info) => {
        if (pending === undefined || pending.since === undefined || root !== primary()) return
        if (info.flush < pending.since || info.buildsPendingSince(pending.since) > 0) return
        const done = pending
        pending = undefined
        restoring = undefined
        options.onSettled?.({
          location: done.location,
          from: done.from,
          index: done.index,
          container: root.container,
          head: info.head
        })
      }
    }

    const router: Router = {
      routes,
      location: () => current,
      changes: SubscriptionRef.changes(ref),
      navigate: (href, navigateOptions) => Effect.sync(() => navigate(href, navigateOptions?.replace === true)),
      push: (route) => Effect.sync(() => navigate(routes.print(route) as string, false)),
      replace: (route) => Effect.sync(() => navigate(routes.print(route) as string, true)),
      back: Effect.sync(() => {
        if (blocks.size > 0) return "blocked"
        history.go(-1)
        return "navigated"
      }),
      forward: Effect.sync(() => {
        if (blocks.size > 0) return "blocked"
        history.go(1)
        return "navigated"
      }),
      load: (href) =>
        Effect.sync(() => {
          if (blocks.size > 0) return "blocked"
          history.load(href)
          return "navigated"
        }),
      block: (key) =>
        Effect.flatMap(Effect.scope, (scope) => {
          blocks.set(key, (blocks.get(key) ?? 0) + 1)
          return Scope.addFinalizer(
            scope,
            Effect.sync(() => {
              const held = blocks.get(key)! - 1
              if (held === 0) blocks.delete(key)
              else blocks.set(key, held)
            })
          )
        }),
      blocked: () => blocks.size > 0
    }
    engines.set(router, {
      delivered: (seq) => {
        const root = primary()
        if (
          pending !== undefined && pending.location.seq === seq && pending.since === undefined && root !== undefined
        ) {
          pending.since = root.flush() + 1
        }
      }
    })
    return Context.make(Router, router).pipe(Context.add(services.RootHooks, hooks)) as Context.Context<Router>
  })

/**
 * A history kept in memory, starting at `url`.
 *
 * **Details**
 *
 * `go` reports the entry it lands on synchronously, and does nothing past
 * either end. `load` records the href in `loaded` instead of leaving the page.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const memoryHistory = (url: string = "/"): History & {
  readonly entries: () => ReadonlyArray<string>
  readonly index: () => number
  readonly loaded: () => ReadonlyArray<string>
} => {
  const entries: Array<{ url: string; state: unknown }> = [{ url, state: undefined }]
  const loaded: Array<string> = []
  const listeners = new Set<(url: string, state: unknown) => void>()
  let index = 0
  return {
    entries: () => entries.map((entry) => entry.url),
    index: () => index,
    loaded: () => loaded,
    current: () => entries[index]!,
    push: (url, state) => {
      entries.splice(index + 1)
      entries.push({ url, state })
      index++
    },
    replace: (url, state) => {
      entries[index] = { url, state }
    },
    go: (delta) => {
      const target = index + delta
      if (delta === 0 || target < 0 || target >= entries.length) return
      index = target
      const entry = entries[index]!
      for (const listener of listeners) listener(entry.url, entry.state)
    },
    load: (href) => {
      loaded.push(href)
    },
    listen: (popped) => {
      listeners.add(popped)
      return () => {
        listeners.delete(popped)
      }
    }
  }
}

/**
 * A Router on an in-memory history, for tests and `TestHost`.
 *
 * **Details**
 *
 * It needs no DOM. Pass your own `memoryHistory` as `history` to inspect the
 * entries, or to move through them as the back button would. A full page
 * load is recorded by the history instead of leaving the page.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const memory = (options: {
  readonly routes: Route.AnyUnion
  readonly url?: string | undefined
  readonly history?: History | undefined
}): Layer.Layer<Services> =>
  Layer.unwrap(
    Effect.sync(() => make({ routes: options.routes, history: options.history ?? memoryHistory(options.url ?? "/") }))
  )

const static_ = (options: { readonly routes: Route.AnyUnion; readonly url: string }): Layer.Layer<Services> =>
  Layer.provideMerge(
    commandLayers,
    Layer.effect(
      Router,
      Effect.suspend(() => {
        const [url, hash] = splitHash(options.url)
        const found = options.routes.parse(url)
        if (Option.isNone(found)) {
          return Effect.die(new Error(`The Router's routes don't parse "${options.url}"`))
        }
        const location: Location = {
          route: found.value,
          url: options.routes.print(found.value),
          hash,
          action: "initial",
          seq: 0
        }
        const blocked = Effect.succeed<Outcome>("blocked")
        return Effect.succeed<Router>({
          routes: options.routes,
          location: () => location,
          changes: Stream.succeed(location),
          navigate: () => blocked,
          push: () => blocked,
          replace: () => blocked,
          back: blocked,
          forward: blocked,
          load: () => blocked,
          block: () => Effect.void,
          blocked: () => false
        })
      })
    )
  )

export {
  /**
   * A Router fixed at one URL, for server rendering.
   *
   * **Details**
   *
   * Navigation Commands return `"blocked"` and change nothing. The server
   * parses the URL itself first, to answer a `NotFound` route with a 404 and a
   * redirect with a 301.
   *
   * @stability experimental
   * @category layers
   * @since 4.1.3
   */
  static_ as static
}

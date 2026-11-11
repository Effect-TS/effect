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
 * The root's Model holds the route. Read the initial route with
 * `Router.currentRoute(AppRoute)` at mount and pass it through the root's props.
 * Later changes arrive as a message from
 * `Router.subscription`, so every route change is in the log. The Router is
 * shaped like a `SubscriptionRef`: `changes` starts with the current
 * location, so a change made before the Subscription starts isn't lost. The
 * Subscription suppresses the first delivery when the root already holds it.
 *
 * Pages are chosen with the union's exhaustive `match` and keyed by the whole
 * printed route, so a route change re-keys the page:
 * `h.child(Page, { key: AppRoute.print(route), props: route })`.
 *
 * **Example** (A root that follows the route)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Command, Component, Route, Router } from "effect/ui"
 * import { TestHost } from "effect/ui/testing"
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
 *       ChangedRoute: ({ route }) => ({ route }),
 *       Go: ({ route }) =>
 *         $.run(Router.push(AppRoute, route).pipe(Command.map(() => Message.make({ _tag: "Navigated" })))),
 *       Navigated: () => model
 *     }),
 *   subscriptions: (model) => [Router.subscription(AppRoute, model.route, (route) => Message.make({ _tag: "ChangedRoute", route }))],
 *   view: (model, h) => h.el("p", model.route._tag)
 * })
 *
 * const mount = Effect.gen(function*() {
 *   return yield* TestHost.mount(App, { route: yield* Router.currentRoute(AppRoute) })
 * }).pipe(Effect.provide(Router.memory({ routes: AppRoute, url: "/about" })))
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Loader from "../reactivity/Loader.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as SubscriptionRef from "../SubscriptionRef.ts"
import type * as Types from "../Types.ts"
import * as Command from "./Command.ts"
import type * as Component from "./Component.ts"
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
  /**
   * The user showed intent to follow a link to `href`: each mounted
   * `Router.prefetch` declaration covering its route runs, unless it ran for
   * that route less than 30 seconds ago. An href the routes don't parse, or
   * one for the current route, does nothing. `BrowserRouter` calls it on
   * hover, focus and touch, and a test calls it directly.
   */
  readonly intent: (href: string) => Effect.Effect<void>
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

/** A location's route as a value of `union`: the Router's own route for its union, a parse of the URL for another. */
const routeOf = (router: Router, union: Route.AnyUnion, location: Location): Option.Option<{ readonly _tag: string }> =>
  router.routes === union ? Option.some(location.route) : union.parse(location.url)

/**
 * Reads the Router's current route as a value of the given union.
 *
 * **When to use**
 *
 * Use to initialize a routed root's props from its Router rather than stating
 * the initial URL again at the mount site.
 *
 * **Gotchas**
 *
 * Dies if the given union cannot parse the current location. Pass the union
 * used by the Router Layer, or a subset that includes the current route.
 *
 * @stability experimental
 * @category accessors
 * @since 4.1.3
 */
export const currentRoute = <U extends Routes>(routes: U): Effect.Effect<U["Type"], never, Router> =>
  Effect.map(Router, (router) => Option.getOrThrow(routeOf(router, routes, router.location())) as U["Type"])

/**
 * The Subscription that feeds route changes into a root's `update`.
 *
 * **Details**
 *
 * Pass the route held in the Model. The first location is suppressed when its
 * tag and printed URL match that route. Otherwise it is delivered, and a
 * `RouteMismatch` is reported if the Router has not navigated (sequence 0).
 * Hydrated hash roots skip that report. Later locations are always delivered.
 * The key stays stable as the held route changes. A subset only sees its own
 * routes. On the server the root is checked once without running its Streams,
 * regardless of the navigation sequence.
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
  held: U["Type"],
  f: (route: U["Type"]) => Msg
): Subscription.Subscription<Msg, Router> => {
  const seqs = new WeakMap<object, number>()
  let last: number | undefined
  let engine: Engine | undefined
  const union: Route.AnyUnion = routes
  const have = union.print(held)
  const same = (route: { readonly _tag: string }) => route._tag === held._tag && union.print(route) === have
  const mismatch = (route: { readonly _tag: string }) => {
    const router = union.print(route)
    return new RouteMismatch({
      have,
      router,
      message:
        `The component holds "${have}" but the Router is at "${router}". Initialize the root with Router.currentRoute.`
    })
  }
  const stream = Stream.unwrap(Effect.gen(function*() {
    const router = yield* Router
    const report = yield* Loader.Problems
    const root = (yield* services.CurrentRoot)()
    engine = engines.get(router)
    let first = true
    return router.changes.pipe(
      Stream.map((location) => {
        const route = routeOf(router, union, location)
        const initial = first
        first = false
        if (Option.isNone(route)) return Option.none<Msg>()
        if (initial) {
          if (same(route.value)) return Option.none<Msg>()
          if (location.seq === 0 && !(router.routes.base() === "#" && root?.hydrated)) {
            try {
              report(mismatch(route.value))
            } catch {
              // A problem sink cannot prevent route delivery.
            }
          }
        }
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
    [services.onServer]: (ctx: Context.Context<never>, report: (problem: Loader.Problem.Any) => void) => {
      const router = Context.getOption(ctx as Context.Context<Router>, Router)
      if (Option.isNone(router)) return
      const route = routeOf(router.value, union, router.value.location())
      if (Option.isSome(route) && !same(route.value)) report(mismatch(route.value))
    },
    [services.onDeliver]: (message: unknown) => {
      const seq = typeof message === "object" && message !== null ? seqs.get(message) : last
      if (seq !== undefined) engine?.delivered(seq)
    }
  })
}

// ---------------------------------------------------------------------------
// Prefetch
// ---------------------------------------------------------------------------

const PageTypeId = "~effect/ui/Router/Page" as const

/**
 * A page a `Router.prefetch` handler names: a component and its props.
 * `R` is the reads the component's own loaders name.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Page<out R = never> {
  readonly [PageTypeId]: { readonly _R: Types.Covariant<R> }
  readonly component: Component.Any
  readonly props: unknown
}

/**
 * The reads a component's own loaders name: what `Router.page` adds to the
 * declarer's requirements.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type PageRequirements<C> = Component.LoaderServices<Component.Model<C>>

// A `Mountable` has its Model erased, and with it the reads `Router.page` adds to the declarer.
type PageInput<C> = [Component.Model<C>] extends [never] ? ErasedPage
  : 0 extends (1 & Component.Model<C>) ? ErasedPage
  : unknown

interface ErasedPage {
  readonly "Router.page needs the component's Model to find its reads. Pass the component, not a Mountable":
    unique symbol
}

/**
 * Names a page for a `Router.prefetch` handler: a component and its props.
 *
 * **Details**
 *
 * The props argument is left out when the component takes none, as with
 * `h.child`. The page's own reads join the declaring component's
 * requirements, so a read the page provides itself is a compile error at
 * `mount`: provide it at the declarer, or return `[]` for that route.
 *
 * **Gotchas**
 *
 * It takes a component as `Component.make` returns it, with or without
 * `Component.provide`. A `Component.Mountable` has its Model erased, and
 * with it the reads, so it is rejected, and so is a feature.
 *
 * @stability experimental
 * @category subscriptions
 * @since 4.1.3
 */
export const page = <C extends Component.Any>(
  component: C & PageInput<C>,
  ...props: {} extends Component.Props<C> ? [props?: Component.Props<C>] : [props: Component.Props<C>]
): Page<PageRequirements<C>> => ({ [PageTypeId]: pageVariance, component, props: props[0] ?? {} })

const pageVariance = { _R: (_: never) => _ }

/**
 * The map `Router.prefetch` takes: a handler per route tag, given the route
 * value as `match` gives it, returning the route's pages.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type PrefetchMap<U extends Routes> = {
  readonly [K in U["Type"]["_tag"]]: (route: Extract<U["Type"], { readonly _tag: K }>) => ReadonlyArray<Page<any>>
}

/**
 * The reads every page of a `Router.prefetch` map names.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type PrefetchRequirements<M> = {
  readonly [K in keyof M]: M[K] extends (route: any) => ReadonlyArray<infer P> ? PageRequirement<P> : never
}[keyof M]

// Distributes over the pages, so a handler returning `[]` adds nothing.
type PageRequirement<P> = P extends Page<infer R> ? R : never

/**
 * Declares the reads of each route's pages, so they are fetched before the
 * pages mount: on link intent and on navigation.
 *
 * **Details**
 *
 * Return it from a component's `subscriptions`. The map is exhaustive over
 * the routes it is given: pass `AppRoute.subset(...)` to declare a section's
 * routes only, and return `[]` for a route with nothing to fetch. For each
 * page the runtime runs `init` with the page's props, discarding its
 * Commands, prefetches what its loaders would watch first, and walks its
 * initial view into its component children. A loader that waits on loaded
 * data is skipped, and so is a feature child.
 *
 * The declaration runs in the declaring instance's context, so the reads must
 * be provided at the declarer or above it. A read below the page that the
 * declarer can't see is skipped, and reported as `PrefetchReadNotProvided`
 * unless a `Component.provide` sits between the page and the component that
 * needs it. A throw from `init`, a loader or `view` during the walk stops
 * that page's walk and is reported as `PrefetchThrew`.
 *
 * It runs on `intent(href)`, which `BrowserRouter` calls on hover, focus
 * and touch, at most once per route every 30 seconds per declarer. A push, a
 * link click and a replace that changes the pathname run it as well, before
 * the route changes, and never wait for it. Back, forward, a reload and the
 * first mount run nothing. Once a push settles, each declared page with no
 * mounted instance is reported as `PrefetchPageNotMounted`, and each entry
 * an instance created since the push never watched as
 * `PrefetchEntryNotWatched`.
 *
 * With `staleTime: 0` a prefetch buys the instant paint only: the page still
 * refetches when it mounts. A read
 * with a `staleTime` between 0 and 30 seconds gets a stale paint and a
 * refetch where a second hover would have refreshed it, because of the guard.
 *
 * One `Router.prefetch` per instance: a second one throws. Nothing runs on
 * the server.
 *
 * **Example** (Prefetching a detail page)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Loader } from "effect/reactivity"
 * import { Component, Route, Router } from "effect/ui"
 *
 * const AppRoute = Route.union({
 *   Home: Route.make("/"),
 *   Person: Route.make("/people/:id", { params: { id: Schema.Number } })
 * })
 *
 * class GetPerson extends Loader.Service<GetPerson>()("GetPerson", {
 *   args: { id: Schema.Number },
 *   success: Schema.String
 * }, Effect.succeed(({ id }) => Effect.succeed(`Person ${id}`))) {}
 *
 * const PersonMessage = Schema.TaggedUnion({ Loaded: {} })
 *
 * const Person = Component.make({
 *   name: "Person",
 *   props: Schema.Struct({ id: Schema.Number }),
 *   model: Schema.Struct({ person: Loader.Snapshot(GetPerson, "person") }),
 *   message: PersonMessage,
 *   loaders: { person: (_model, props) => ({ id: props.id }) },
 *   init: ($) => $.empty,
 *   update: (model) => model,
 *   subscriptions: (_model, _props, watch) => [watch({ person: () => PersonMessage.make({ _tag: "Loaded" }) })],
 *   view: (_model, h) => h.el("p", "Person")
 * })
 *
 * const subscriptions = () => [
 *   Router.prefetch(AppRoute, {
 *     Home: () => [],
 *     Person: ({ params }) => [Router.page(Person, { id: params.id })]
 *   })
 * ]
 * ```
 *
 * @stability experimental
 * @category subscriptions
 * @since 4.1.3
 */
export const prefetch = <U extends Routes, const M extends PrefetchMap<U>>(
  routes: U,
  map: M
): Subscription.Subscription<never, Router | PrefetchRequirements<M>> => {
  const declaration: services.Prefetch = { routes, map: map as services.Prefetch["map"] }
  return Object.assign(Subscription.make("effect/ui/Router/prefetch", Stream.never), {
    [services.prefetch]: declaration
  }) as Subscription.Subscription<never, Router | PrefetchRequirements<M>>
}

/**
 * A component or view threw while a `Router.prefetch` declaration walked a
 * page. That page's walk stopped. The declarer is unaffected.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class PrefetchThrew extends Data.TaggedClass("PrefetchThrew")<{
  readonly message: string
  /** The declaring instance's path. */
  readonly path: string
  /** The page's component name. */
  readonly page: string
  /** What `init`, a loader or `view` threw. */
  readonly error: unknown
}> {}

/**
 * A read in a `Router.prefetch` walk is missing from the declarer's context,
 * with no `Component.provide` between the page and the component that needs
 * it. That read was skipped.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class PrefetchReadNotProvided extends Data.TaggedClass("PrefetchReadNotProvided")<{
  readonly message: string
  /** The declaring instance's path. */
  readonly path: string
  /** The page's component name. */
  readonly page: string
  /** The read's name. */
  readonly read: string
}> {}

/**
 * After a push settled, a page its `Router.prefetch` declaration named has
 * no mounted instance.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class PrefetchPageNotMounted extends Data.TaggedClass("PrefetchPageNotMounted")<{
  readonly message: string
  /** The declaring instance's path. */
  readonly path: string
  /** The page's component name. */
  readonly page: string
}> {}

/**
 * After a push settled, the page instances created since the push never
 * watched an entry the `Router.prefetch` declaration fetched for them.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class PrefetchEntryNotWatched extends Data.TaggedClass("PrefetchEntryNotWatched")<{
  readonly message: string
  /** The declaring instance's path. */
  readonly path: string
  /** The page's component name. */
  readonly page: string
  /** The read's name. */
  readonly read: string
  /** The entry's log key. */
  readonly logKey: string
}> {}

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

/**
 * Reports that an initial held route differs from the Router location.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class RouteMismatch extends Data.TaggedClass("RouteMismatch")<{
  readonly message: string
  readonly have: string
  readonly router: string
}> {}

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

/**
 * Writing the Model snapshot into `history.state` threw, as a browser does
 * when the state is too large. The history entry was written with its index
 * only, so the snapshot survives in memory and not across a reload.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class SnapshotWriteFailed extends Data.TaggedClass("SnapshotWriteFailed")<{
  readonly message: string
  /** What the history threw. */
  readonly error: unknown
}> {}

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
 * stayed mounted keeps its own. As with hydration, `init` is replayed and
 * every one of its Commands runs.
 *
 * A restored loader field seeds the cache when its entry is cold, as after a
 * reload: the entry is stored stale, so the first frame shows the data with
 * `waiting: true` and one refetch runs. If the refetch fails, the data stays
 * as the Failure's previous Success. A warm entry is used as it is. A field
 * whose snapshot was taken under an optimistic patch is never a seed: it is
 * dropped from the restored Model and starts from loading.
 *
 * The snapshot is kept in memory per entry. When a push leaves an entry, it's
 * also written into that entry's `state`, so it survives a reload. When back
 * or forward leaves an entry, the host has already moved to the other entry,
 * so the snapshot stays in memory only. After a reload, that entry restores
 * the snapshot written when a push last left it, or starts fresh. When that
 * write throws, the entry is written with its index only and
 * `SnapshotWriteFailed` is reported.
 *
 * Every navigation the Router makes closes the cache's fetch-free window
 * after hydration, if adoption hasn't closed it yet.
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
    // The problems sink of the first mounted root, or the one where the Router is built.
    const fallbackReport = yield* Loader.Problems
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
      /** The checks of the declarations the navigation ran, run when it settles. */
      readonly checks: ReadonlyArray<services.PrefetchCheck>
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
    const report = (problem: SnapshotWriteFailed) => {
      const root = primary()
      try {
        if (root !== undefined) root.report(problem)
        else fallbackReport(problem)
      } catch {
        // A sink can't change what the Router does.
      }
    }
    /** Writes the entry being left with its snapshot, so it survives a reload. A throw keeps the index only. */
    const writeSnapshot = (url: string, entry: EntryState) => {
      try {
        history.replace(url, writeState(entry))
      } catch (error) {
        history.replace(url, writeState({ index: entry.index }))
        report(
          new SnapshotWriteFailed({
            error,
            message:
              "[effect/ui] the Router couldn't write the Model snapshot into history.state. It is kept in memory only, so a reload starts the entry fresh."
          })
        )
      }
    }
    // The mounted `Router.prefetch` declarations.
    const declarers = new Set<services.Declarer>()
    /** Runs every declaration covering the location's route, and returns a navigation's checks. */
    const runDeclarations = (
      location: { readonly route: { readonly _tag: string }; readonly url: string },
      intent: boolean
    ): Array<services.PrefetchCheck> => {
      const checks: Array<services.PrefetchCheck> = []
      for (const declarer of Array.from(declarers)) {
        const union = declarer.routes()
        const route = union === routes ? Option.some(location.route) : union.parse(location.url)
        if (Option.isNone(route)) continue
        const check = declarer.run(route.value, intent)
        if (check !== undefined) checks.push(check)
      }
      return checks
    }
    /** Ends the checks of a navigation that won't settle: superseded, or the Router closed. */
    const dropChecks = () => {
      if (pending === undefined) return
      for (const check of pending.checks) check.dropped()
    }
    /**
     * `prefetch`: a push, a link click or a replace that changes the pathname runs the destination's
     * declarations, after the hydration window closes and before the route changes.
     */
    const set = (next: Location, announce: boolean, prefetch: boolean) => {
      // First, so whatever the navigation starts sees the cache with the hydration window closed.
      for (const root of roots) root.navigated()
      const checks = prefetch ? runDeclarations(next, false) : []
      const from = pathnameOf(current.url)
      current = next
      restoring = undefined
      if (announce) {
        dropChecks()
        pending = { location: next, from, index, since: undefined, checks }
      }
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
        set({ route, url: printed, hash, action: "replace", seq }, !samePath, !samePath)
      } else {
        leave()
        // The Model snapshot also goes into the entry itself, so it survives a reload.
        writeSnapshot(current.url + current.hash, { index, snapshot: snapshots.get(index) })
        index++
        for (const key of snapshots.keys()) if (key >= index) snapshots.delete(key)
        history.push(printed + hash, writeState({ index }))
        set({ route, url: printed, hash, action: "push", seq }, true, true)
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
      set({ route: found.value.route, url: printed, hash, action: "pop", seq: current.seq + 1 }, true, false)
      restoring = saved === undefined ? undefined : new Map(Object.entries(saved))
    }
    const unlisten = history.listen(popped)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unlisten()
        dropChecks()
        pending = undefined
      })
    )

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
      declare: (declarer) => {
        declarers.add(declarer)
        return () => {
          declarers.delete(declarer)
        }
      },
      afterFlush: (root, info) => {
        if (pending === undefined || pending.since === undefined || root !== primary()) return
        if (info.flush < pending.since || info.buildsPendingSince(pending.since) > 0) return
        const done = pending
        pending = undefined
        restoring = undefined
        for (const check of done.checks) check.settled()
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
      blocked: () => blocks.size > 0,
      intent: (href) =>
        Effect.sync(() => {
          const [url] = split(href)
          const found = routes.resolve(url)
          if (Option.isNone(found)) return
          // Identity is the printed route: a redirect prefetches its target, and two spellings of one route
          // value are one route. The current route is already mounted.
          const printed = routes.print(found.value.route)
          if (printed === routes.print(current.route)) return
          runDeclarations({ route: found.value.route, url: printed }, true)
        })
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
          blocked: () => false,
          intent: () => Effect.void
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
   * redirect with a 301. For a prerendered hash-routing shell, first call
   * `routes.setBase("#")` and render at `"#/"`, so links and keys agree with
   * `BrowserRouter.layerHash` during hydration.
   *
   * @stability experimental
   * @category layers
   * @since 4.1.3
   */
  static_ as static
}

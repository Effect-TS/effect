/**
 * Runtime tests: mount a component tree on a plain-object host, drive it, and
 * wait for it to settle.
 *
 * `TestHost` records what it's asked to do, implements every event behaviour
 * `h` promises (only the innermost element with a handler for an event gets
 * it), and never runs `onMount` work: the test sends the message instead. Its
 * Layer swaps in a test scheduler that Commands, Subscriptions, Layer builds
 * and the render flush all go through, so `settle` can drain everything, and
 * provides `MessageLog.memory`, so `root.log()` reads back what happened.
 *
 * Runtime tests are plain scoped Effects. Anything that crosses a child slot
 * is tested here; one instance on its own is a `Story`.
 *
 * **Example** (Counting on a TestHost)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Component } from "effect/ui"
 * import { Query, TestHost } from "effect/ui/testing"
 *
 * const Msg = Schema.TaggedUnion({ Increment: {} })
 *
 * const Counter = Component.define({
 *   name: "Counter",
 *   model: Schema.Number,
 *   message: Msg
 * }).make({
 *   init: () => 0,
 *   update: (count) => count + 1,
 *   view: (count, h) => h.el("button").on("click", Msg.make({ _tag: "Increment" })).children(String(count))
 * })
 *
 * const program = Effect.gen(function*() {
 *   const root = yield* TestHost.mount(Counter, {})
 *   Query.fire(root.get(Query.text("0")), "click")
 *   yield* TestHost.settle
 *   return root.text()
 * }).pipe(Effect.scoped, Effect.provide(TestHost.layer()))
 *
 * console.log(Effect.runSync(program)) // "1"
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import type * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Queue from "../../Queue.ts"
import type * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Loader from "../../reactivity/Loader.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as TestLoader from "../../testing/TestLoader.ts"
import * as Component from "../Component.ts"
import * as Feature from "../Feature.ts"
import type * as Head from "../Head.ts"
import * as Executor from "../internal/executor.ts"
import * as runtime from "../internal/runtime.ts"
import * as MessageLog from "../MessageLog.ts"
import * as Renderer from "../Renderer.ts"
import * as Subscription from "../Subscription.ts"
import type * as View from "../View.ts"
import * as Query from "./Query.ts"

/**
 * An element on the test host.
 *
 * **Details**
 *
 * `attrs` and `props` hold what the renderer set. To act as the user editing
 * a controlled property, set `props` directly, then fire the event.
 * `eventOptions` holds the options set with the handlers. The test host has
 * no default actions, so it applies none of them; a `Story` reports
 * `defaultPrevented`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface TestElement extends Query.Firable {
  readonly _tag: "Element"
  readonly tag: string
  readonly attrs: Record<string, string>
  readonly props: Record<string, unknown>
  readonly children: Array<TestNode>
  parent: TestElement | undefined
  handlers: Readonly<Record<string, View.Handler<unknown, any>>>
  eventOptions: Readonly<Record<string, View.EventOptions>>
  dispatch: Renderer.Dispatch | undefined
}

/**
 * A text node on the test host.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface TestText extends Query.Firable {
  readonly _tag: "Text"
  readonly tag?: undefined
  text: string
  parent: TestElement | undefined
}

/**
 * Any node on the test host.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type TestNode = TestElement | TestText

function fireFrom(this: TestNode, event: string, payload: unknown): void {
  let node: TestElement | undefined = this._tag === "Element" ? this : this.parent
  while (node !== undefined) {
    const handler = node.handlers[event]
    if (handler !== undefined && node.dispatch !== undefined) return node.dispatch(event, handler, payload)
    node = node.parent
  }
  throw new Error(`TestHost: nothing handles "${event}" here or above`)
}

const makeElement = (tag: string): TestElement => ({
  _tag: "Element",
  tag,
  attrs: {},
  props: {},
  children: [],
  parent: undefined,
  handlers: {},
  eventOptions: {},
  dispatch: undefined,
  fire: fireFrom
})

const describe = (node: TestNode): string => node._tag === "Text" ? JSON.stringify(node.text) : `<${node.tag}>`

const detach = (node: TestNode) => {
  const parent = node.parent
  if (parent === undefined) return
  parent.children.splice(parent.children.indexOf(node), 1)
  node.parent = undefined
}

/**
 * Makes a test host. `operations` lists what the renderer asked of it, which
 * `clearOperations` empties.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const makeHost = (): Renderer.Host<TestNode> & {
  readonly operations: () => ReadonlyArray<string>
  readonly clearOperations: () => void
  readonly commits: () => number
  /** Calls `listener` after every commit. Returns the unsubscribe. */
  readonly onCommit: (listener: () => void) => () => void
} => {
  let operations: Array<string> = []
  let commits = 0
  const listeners = new Set<() => void>()
  return {
    operations: () => operations,
    clearOperations: () => {
      operations = []
    },
    commits: () => commits,
    onCommit: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    createElement(tag) {
      operations.push(`create <${tag}>`)
      return makeElement(tag)
    },
    createText(text) {
      operations.push(`create ${JSON.stringify(text)}`)
      return { _tag: "Text", text, parent: undefined, fire: fireFrom }
    },
    setText(node, text) {
      operations.push(`text ${describe(node)} -> ${JSON.stringify(text)}`)
      ;(node as TestText).text = text
    },
    setAttr(node, name, value) {
      const element = node as TestElement
      operations.push(`attr ${describe(node)} ${name}=${value === undefined ? "(removed)" : JSON.stringify(value)}`)
      if (value === undefined) delete element.attrs[name]
      else element.attrs[name] = value
    },
    setProp(node, name, value) {
      const element = node as TestElement
      // A no-op is skipped, as the browser host does for controlled properties.
      if (element.props[name] === value && name in element.props) return
      operations.push(`prop ${describe(node)} ${name}`)
      if (value === undefined) delete element.props[name]
      else element.props[name] = value
    },
    insertBefore(parent, node, ref) {
      operations.push(`insert ${describe(node)}${ref === undefined ? "" : ` before ${describe(ref)}`}`)
      const into = parent as TestElement
      detach(node)
      const index = ref === undefined ? into.children.length : into.children.indexOf(ref)
      into.children.splice(index < 0 ? into.children.length : index, 0, node)
      node.parent = into
    },
    remove(node) {
      operations.push(`remove ${describe(node)}`)
      detach(node)
    },
    parentOf: (node) => node.parent,
    nextOf(node) {
      const parent = node.parent
      return parent === undefined ? undefined : parent.children[parent.children.indexOf(node) + 1]
    },
    setEvents(node, handlers, dispatch, options) {
      const element = node as TestElement
      element.handlers = handlers
      element.eventOptions = options
      element.dispatch = dispatch
    },
    elements: "any",
    controlled: new Set(["value", "checked", "selected", "open"]),
    runsMounts: false,
    commit: () => {
      commits++
      for (const listener of Array.from(listeners)) listener()
    },
    head: () => {
      operations.push("head")
    }
  }
}

/**
 * The `TestHost` service: the host, the test scheduler and the log.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export interface TestHost {
  readonly host: ReturnType<typeof makeHost>
  readonly log: MessageLog.Memory
  /** Drains the test scheduler once. Returns whether it finished within the budget. */
  readonly drain: (budget: number) => boolean
  /** Whether the test scheduler has work queued. */
  readonly busy: () => boolean
  /** The Command runs and fetches still in flight in every tree mounted on this host. */
  readonly pending: () => ReadonlyArray<Pending>
  readonly budget: number
  /** Adds a mounted tree to `pending` and `settle`, until the returned function is called. */
  readonly register: (tree: Tree) => () => void
  /** The settable `Loader.Visibility` every mount gets. */
  readonly visibility: Loader.Signal & { readonly set: (value: boolean) => void }
  /** The settable `Loader.Connectivity` every mount gets. */
  readonly connectivity: Loader.Signal & { readonly set: (value: boolean) => void }
  /** The problems reported and not yet taken. */
  readonly problems: () => ReadonlyArray<Loader.Problem.Any>
  /** Collects a problem. Every mount's cache reports here. */
  readonly report: (problem: Loader.Problem.Any) => void
  /** Takes every problem with this tag. Throws when there is none. */
  readonly expectProblem: (tag: string) => ReadonlyArray<Loader.Problem.Any>
  /** Wraps a `Clock` so that a woken sleeper drains the test scheduler. */
  readonly drainingClock: (clock: Clock.Clock, context: Context.Context<never>) => Clock.Clock
  /** The trees mounted on this host. */
  readonly trees: () => ReadonlySet<Tree>
}

/**
 * A tree registered with `TestHost`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Tree {
  readonly pending: () => ReadonlyArray<Pending>
  /** The root's failure, once it crashed. */
  readonly crashed: () => Cause.Cause<unknown> | undefined
  readonly path: string
}

/**
 * Work still in flight: a Command run or a fetch.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Pending = PendingCommand | PendingFetch

/**
 * A Command run still in flight: the instance that issued it, its name, and
 * whether it's `running`, `queued` or `awaiting`: its fiber exited and its
 * message waits, on a `Command.afterRefetch` wait or, under `queue`, behind
 * an earlier message of its group.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface PendingCommand {
  readonly _tag: "Command"
  readonly path: string
  readonly name: string
  readonly status: string
  /** A detached run: owned by its Layer build, it may outlive its instance. */
  readonly detached: boolean
}

/**
 * A fetch the cache holds: `running`, or `held` until a live patch's run
 * exits, with the trigger it started or will start with.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface PendingFetch {
  readonly _tag: "Fetch"
  /** The root's path. */
  readonly path: string
  readonly read: string
  readonly logKey: string
  readonly status: "running" | "held"
  readonly trigger: Loader.Trigger
}

/**
 * A drain woken by the clock ran out of budget. What was queued stays queued,
 * and the next `settle` runs it and fails on this problem.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.5
 */
export class DrainExhausted extends Data.TaggedClass("DrainExhausted")<{
  readonly message: string
}> {}

/**
 * The `TestHost` service.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export const TestHost: Context.Service<TestHost, TestHost> = Context.Service<TestHost>("effect/ui/testing/TestHost")

/**
 * Provides `TestHost`, the `Renderer` for it, the test scheduler and a
 * `MessageLog.memory` log.
 *
 * **Details**
 *
 * `budget` is how many scheduler tasks `settle` and a clock wake run before
 * they give up (100,000 by default), and `logSize` the size of the log's ring
 * buffer, unbounded by default.
 *
 * The Layer owns settable `Loader.Visibility` and `Loader.Connectivity`, both
 * starting true, and collects the problems every mounted cache reports.
 *
 * **Gotchas**
 *
 * A problem fails the test: `settle` fails with a `ProblemsError`, and the
 * Layer's Scope closes with one as a defect, unless `expectProblem` took it.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (options?: {
  readonly budget?: number | undefined
  readonly logSize?: number | undefined
}): Layer.Layer<TestHost | Renderer.Renderer> =>
  Layer.effectContext(Effect.gen(function*() {
    const host = makeHost()
    const executor = new Executor.TestExecutor()
    const log = MessageLog.makeMemory({ size: options?.logSize ?? Infinity })
    const trees = new Set<Tree>()
    const budget = options?.budget ?? 100_000
    let problems: Array<Loader.Problem.Any> = []
    let draining = false
    // Re-entrant calls return at once: the outer drain runs what they would.
    const drain = (n: number): boolean => {
      if (draining) return true
      draining = true
      try {
        return executor.drain(n)
      } finally {
        draining = false
      }
    }
    const report = (problem: Loader.Problem.Any) => {
      problems.push(problem)
    }
    const drainingClock = (clock: Clock.Clock, context: Context.Context<never>): Clock.Clock => {
      const run = Effect.runForkWith(context)
      const sleep = (duration: Duration.Duration): Effect.Effect<void> =>
        Effect.callback<void>((resume) => {
          const fiber = run(clock.sleep(duration))
          let done = false
          fiber.addObserver(() => {
            // Cancelled: the sleeper is gone, and nothing woke.
            if (done) return
            done = true
            resume(Effect.void)
            if (!drain(budget)) {
              report(
                new DrainExhausted({
                  message: `[TestHost] a clock wake ran ${budget} tasks and work is still being scheduled.`
                })
              )
            }
          })
          return Effect.sync(() => {
            if (done) return
            done = true
            fiber.interruptUnsafe()
          })
        })
      return Object.assign(Object.create(clock), { sleep }) as Clock.Clock
    }
    const service: TestHost = {
      host,
      log,
      drain,
      busy: () => executor.size > 0,
      pending: () => [...trees].flatMap((tree) => tree.pending()),
      budget,
      register: (tree) => {
        trees.add(tree)
        return () => {
          trees.delete(tree)
        }
      },
      visibility: Loader.makeSignal(true),
      connectivity: Loader.makeSignal(true),
      problems: () => problems.slice(),
      report,
      expectProblem: (tag) => {
        const matched = problems.filter((problem) => problem._tag === tag)
        if (matched.length === 0) {
          throw new Error(
            "[TestHost] expected a " + tag + " problem, and the cache reported " +
              (problems.length === 0 ? "none" : problems.map((problem) => problem._tag).join(", "))
          )
        }
        problems = problems.filter((problem) => problem._tag !== tag)
        return matched
      },
      drainingClock,
      trees: () => trees
    }
    yield* Effect.addFinalizer(() =>
      Effect.suspend(() => problems.length === 0 ? Effect.void : Effect.die(new TestLoader.ProblemsError({ problems })))
    )
    return Context.make(TestHost, service).pipe(
      Context.add(Renderer.Renderer, { host }),
      Context.add(Executor.CurrentExecutor, executor),
      Context.add(MessageLog.MessageLog, log)
    ) as Context.Context<TestHost | Renderer.Renderer>
  }))

/**
 * A tree mounted on `TestHost`'s scheduler, whatever host renders it: what
 * a test reads and drives without looking at nodes.
 *
 * **Details**
 *
 * `mount` hands back a `TestRoot`, which adds the test host's node queries.
 * `Ssr.ssr` hands back this part only, since its client renders into a real
 * document.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Root<out Model, in Msg, out Events> {
  /** The root instance's path, `/<name>`. */
  readonly path: string
  readonly session: string
  /** The root's current Model, or `undefined` after it crashed. */
  readonly model: () => Model | undefined
  /** Sends a message to the root. The log shows it as a `Dispatch`. */
  readonly send: (message: Msg) => void
  /** What the root emitted, in order. */
  readonly emitted: ReadonlyArray<Events>
  /** This mount's log entries, oldest first. */
  readonly log: () => ReadonlyArray<MessageLog.Entry>
  /** The Command runs and fetches still in flight in this tree. */
  readonly pending: () => ReadonlyArray<Pending>
  /** Every fetch the tree's cache started, oldest first: the log's `FetchStarted` entries. */
  readonly fetches: () => ReadonlyArray<MessageLog.FetchStarted>
  /**
   * A read-only view of the cache's entry for a read and arguments, or
   * `undefined` when it has none. It doesn't create the entry or keep it alive.
   */
  readonly entry: <R extends Loader.Read.Any>(
    read: R,
    args: Loader.Read.Args<R>
  ) => TestLoader.Entry<Loader.Read.Success<R>, Loader.Read.Error<R>> | undefined
  /** The tree's merged document head, as last given to the host. */
  readonly head: () => Head.Head
  /** The `frames` projection after each commit, without consecutive repeats. */
  readonly frames: () => ReadonlyArray<string>
}

/**
 * A tree mounted on `TestHost`, with queries over its nodes.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface TestRoot<out Model, in Msg, out Events> extends Root<Model, Msg, Events> {
  /** The element the tree is mounted in. */
  readonly container: TestElement
  /** The text of everything mounted. */
  readonly text: () => string
  readonly all: (locator: Query.Locator) => ReadonlyArray<TestNode>
  readonly query: (locator: Query.Locator) => TestNode | undefined
  readonly get: (locator: Query.Locator) => TestNode
}

/**
 * Mounts a component tree on the test host, for the life of the current
 * Scope.
 *
 * **Details**
 *
 * The first render happens at once. Commands, Subscriptions, fetches and
 * Layer builds wait for `settle`. The test host shows every vocabulary, so
 * any root mounts.
 *
 * The mount uses the host's `Loader.Visibility`, `Loader.Connectivity` and
 * problem collector even if a nearer provide overrides them. Its `Clock`
 * drains the test scheduler whenever a sleeper wakes, so `TestClock.adjust`
 * runs the awakened work without waiting for `settle`.
 * `frames` projects the tree after each commit for `root.frames()`, and
 * defaults to `root.text()`.
 *
 * `props` may be an Effect, such as `Router.props(AppRoute)` under
 * `Router.memory`, run once before `init`, as with `Renderer.mount`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const mount = <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
  RF = never,
  RP = never,
  Rcv = never
>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V, any, Rcv>,
  props: Props | Effect.Effect<Props, never, RP>,
  options?: {
    readonly fallback?:
      | ((
        failure: AsyncResult.Failure<never, unknown>,
        h: View.Helper<never, {}> & View.Tags<V, never>
      ) => View.Content<never, RF>)
      | undefined
    readonly loader?: Renderer.LoaderOptions | undefined
    readonly frames?: ((root: TestRoot<Model, Msg, Events>) => string) | undefined
  }
): Effect.Effect<TestRoot<Model, Msg, Events>, never, R | RF | RP | TestHost | Scope.Scope> =>
  Effect.gen(function*() {
    const testHost = yield* TestHost
    const container = makeElement("#root")
    const outer = yield* Effect.context<never>()
    const project = options?.frames ?? ((root: TestRoot<Model, Msg, Events>) => root.text())
    const frames: Array<string> = []
    let testRoot: TestRoot<Model, Msg, Events> | undefined
    const frame = () => {
      if (testRoot === undefined) return
      const next = project(testRoot)
      if (frames.length === 0 || frames[frames.length - 1] !== next) frames.push(next)
    }
    const offCommit = testHost.host.onCommit(frame)
    yield* Effect.addFinalizer(() => Effect.sync(offCommit))
    const root = yield* runtime.mount(component, props, container, options as any).pipe(
      Effect.provideService(Clock.Clock, testHost.drainingClock(Context.get(outer, Clock.Clock), outer)),
      Effect.provideService(Loader.Visibility, testHost.visibility),
      Effect.provideService(Loader.Connectivity, testHost.connectivity),
      Effect.provideService(Loader.Problems, testHost.report)
    )
    const neutral = yield* register(testHost, root, testHost.log, () => frames.slice())
    testRoot = {
      ...neutral,
      container,
      text: () => Query.textOf(container),
      all: (locator) => Query.all(container as TestNode, locator),
      query: (locator) => Query.query(container as TestNode, locator),
      get: (locator) => Query.get(container as TestNode, locator)
    }
    frame()
    return testRoot
  }) as any

/**
 * Registers a mounted tree with `TestHost`, so `settle` waits for it and
 * fails when it crashes, and builds its host-neutral view over `log` and
 * the frames its host recorded.
 *
 * @internal
 */
export const register = (
  testHost: TestHost,
  root: runtime.Root & Renderer.Root<any, any>,
  log: MessageLog.Memory,
  frames: () => ReadonlyArray<string>
): Effect.Effect<Root<any, any, any>, never, Scope.Scope> =>
  Effect.gen(function*() {
    const pending = (): ReadonlyArray<Pending> => [
      ...root.pending().map((run): Pending => ({ _tag: "Command", ...run })),
      ...root.cache.pending().map((fetch): Pending => ({ _tag: "Fetch", path: root.path, ...fetch }))
    ]
    const unregister = testHost.register({ path: root.path, pending, crashed: root.crashed })
    yield* Effect.addFinalizer(() => Effect.sync(unregister))
    const entries = () => log.entries().filter((entry) => entry.session === root.session)
    return {
      path: root.path,
      session: root.session,
      model: root.model,
      send: root.send,
      emitted: root.emitted,
      log: entries,
      pending,
      fetches: () => entries().filter((entry): entry is MessageLog.FetchStarted => entry._tag === "FetchStarted"),
      entry: (read, args) => root.cache.inspect(Loader.defOf(read), args) as any,
      head: root.head,
      frames
    }
  })

/**
 * A root mounted on the host crashed. `settle` fails with it.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class RootCrashed extends Data.TaggedError("RootCrashed")<{
  readonly path: string
  readonly cause: Cause.Cause<unknown>
}> {
  override get message(): string {
    return `The root ${this.path} crashed:\n${Cause.pretty(this.cause)}`
  }
}

/**
 * `settle` ran out of budget: something keeps scheduling work.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class SettleError extends Data.TaggedError("SettleError")<{
  readonly message: string
  readonly pending: ReadonlyArray<Pending>
  readonly log: ReadonlyArray<MessageLog.Entry>
}> {}

const nextMacrotask = Effect.callback<void>((resume) => {
  const handle = setTimeout(() => resume(Effect.void), 0)
  return Effect.sync(() => clearTimeout(handle))
})

/**
 * Runs everything the test scheduler holds, and what that schedules, until
 * nothing is left.
 *
 * **Details**
 *
 * A fiber blocked on a Queue or on `TestClock` counts as idle, so a
 * Subscription waiting for its next value, or a Command or fetch sleeping on
 * the clock, doesn't keep `settle` from returning; adjust `TestClock`, which
 * runs what it wakes. Work that resolves a Promise gets a few macrotasks to
 * come back. A run or fetch that never returns is left in `pending()`.
 *
 * **Gotchas**
 *
 * When the budget runs out, `settle` fails with a `SettleError` holding the
 * log's tail and what is pending. A crashed root fails it with `RootCrashed`,
 * and a problem nothing took with `expectProblem` with a `ProblemsError`.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.5
 */
export const settle: Effect.Effect<void, SettleError | RootCrashed | TestLoader.ProblemsError, TestHost> = Effect
  .gen(function*() {
    const testHost = yield* TestHost
    yield* drainAll(testHost)
    for (const tree of testHost.trees()) {
      const cause = tree.crashed()
      if (cause !== undefined) return yield* new RootCrashed({ path: tree.path, cause })
    }
    const problems = testHost.problems()
    if (problems.length > 0) return yield* new TestLoader.ProblemsError({ problems })
  })

const drainAll = Effect.fnUntraced(function*(testHost: TestHost) {
  let budget = testHost.budget
  let quiet = 0
  while (quiet < 3) {
    if (testHost.busy()) {
      quiet = 0
      const before = budget
      if (!testHost.drain(budget)) {
        const log = testHost.log.entries().slice(-20)
        const pending = testHost.pending()
        return yield* new SettleError({
          message: [
            `TestHost.settle ran ${testHost.budget} tasks and work is still being scheduled.`,
            "Last log entries:",
            formatLog(log),
            "Pending:",
            pending.length === 0 ? "  (none)" : pending.map(describePending).join("\n")
          ].join("\n"),
          pending,
          log
        })
      }
      budget = Math.max(0, before - 1)
      continue
    }
    // A run or fetch sleeping on the clock looks the same as one waiting on a Promise, so anything
    // in flight gets the grace.
    if (testHost.pending().length === 0) return
    // Something may come back from outside the scheduler, such as a resolved Promise.
    quiet++
    yield* nextMacrotask
  }
})

const describePending = (pending: Pending): string =>
  pending._tag === "Command"
    ? `  ${pending.path} ${pending.name} (${pending.status}${pending.detached ? ", detached" : ""})`
    : `  ${pending.path} fetch ${pending.read} ${pending.logKey} (${pending.status}, ${pending.trigger})`

/**
 * Sets the host's `Loader.Visibility`, which every mount on it reads. It
 * starts true. Going from false to true, while online, refetches every
 * watched entry that is stale or whose interval elapsed.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.5
 */
export const setVisible = (visible: boolean): Effect.Effect<void, never, TestHost> =>
  TestHost.useSync((testHost) => testHost.visibility.set(visible))

/**
 * Sets the host's `Loader.Connectivity`, which every mount on it reads. It
 * starts true. Going from false to true, while visible, refetches every
 * watched entry that is stale or whose interval elapsed.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.5
 */
export const setOnline = (online: boolean): Effect.Effect<void, never, TestHost> =>
  TestHost.useSync((testHost) => testHost.connectivity.set(online))

/**
 * Returns the problems reported on this host that no `expectProblem` took.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.5
 */
export const problems: Effect.Effect<ReadonlyArray<Loader.Problem.Any>, never, TestHost> = TestHost.useSync(
  (testHost) => testHost.problems()
)

/**
 * Takes every reported problem with the given tag, so it no longer fails
 * `settle` or the test, and returns them.
 *
 * **Gotchas**
 *
 * Dies when no problem with that tag was reported.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.5
 */
export const expectProblem = <Tag extends string>(tag: Tag): Effect.Effect<
  ReadonlyArray<
    [Extract<Loader.Problem | DrainExhausted, { readonly _tag: Tag }>] extends [never] ? Loader.Problem.Any
      : Extract<Loader.Problem | DrainExhausted, { readonly _tag: Tag }>
  >,
  never,
  TestHost
> => TestHost.useSync((testHost) => testHost.expectProblem(tag) as any)

const summary = (value: unknown): string => {
  if (typeof value === "object" && value !== null && "_tag" in value) return String((value as any)._tag)
  try {
    const json = JSON.stringify(MessageLog.structural(value))
    return json.length > 60 ? json.slice(0, 57) + "..." : json
  } catch {
    return String(value)
  }
}

/**
 * Formats log entries one per line, for test failures.
 *
 * @stability experimental
 * @category formatting
 * @since 4.1.5
 */
export const formatLog = (entries: ReadonlyArray<MessageLog.Entry>): string =>
  entries.map((entry) => {
    const head = `  #${entry.seq} ${entry.path} ${entry._tag}`
    switch (entry._tag) {
      case "Update": {
        const source = entry.source
        const from = source._tag === "DomEvent"
          ? `dom ${source.name}`
          : source._tag === "Command"
          ? `command ${source.name}`
          : source._tag === "Subscription"
          ? `subscription ${source.key}`
          : source._tag === "Emit"
          ? `emit from ${source.path}`
          : source._tag === "Send"
          ? `send from ${source.path}`
          : source._tag === "Mount"
          ? `mount ${source.name}`
          : "dispatch"
        const commands = entry.commands.length === 0 ? "" : ` -> ${entry.commands.map((c) => c.name).join(", ")}`
        const events = entry.events.length === 0 ? "" : ` events ${entry.events.map(summary).join(", ")}`
        const sends = entry.sends === undefined || entry.sends.length === 0
          ? ""
          : ` sends ${entry.sends.map((send) => `${send.ref.key} ${summary(send.message)}`).join(", ")}`
        return `${head} ${summary(entry.message)} (${from})${commands}${events}${sends}`
      }
      case "Mounted":
        return `${head}${entry.commands.length === 0 ? "" : ` -> ${entry.commands.map((c) => c.name).join(", ")}`}`
      case "Failed":
      case "Crashed":
        return `${head} in ${entry.source}${entry.name === undefined ? "" : ` (${entry.name})`}: ${
          entry.cause.toString().split("\n")[0]
        }`
      case "SubscriptionStarted":
      case "SubscriptionStopped":
        return `${head} ${entry.key}`
      case "CommandEnded":
      case "CommandInterrupted":
        return `${head} ${entry.name}${entry.waitEnded === undefined ? "" : ` (wait ${entry.waitEnded})`}`
      case "CommandAwaiting":
        return `${head} ${entry.name} on ${
          entry.entries.map((awaited) => `${awaited.read} ${awaited.logKey}`).join(", ")
        }`
      case "CommandDropped":
        return `${head} ${entry.name} (${entry.reason})`
      case "SendDropped":
        return `${head} ${entry.ref} (${entry.reason})`
      case "FetchStarted":
        return `${head} ${entry.read} ${entry.logKey} (${entry.trigger}${entry.restart ? ", restart" : ""})`
      default:
        return head
    }
  }).join("\n")

/**
 * A stand-in for a feature, from `stub`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Stub<Self, Props, Events, Receives = never> {
  /** Provides the stub as the feature's implementation. */
  readonly layer: Layer.Layer<Self>
  /** The props the stub rendered with, in order, without repeats. */
  readonly props: () => ReadonlyArray<Props>
  /** The messages parents sent the stubs with `$.send`, in order. */
  readonly received: () => ReadonlyArray<Receives>
  /** Makes every mounted stub emit, as the real feature would. Settle first, so it's listening. */
  readonly emit: (events: Events) => void
}

/**
 * Stands in for a feature in a runtime test: it renders a `<stub>` element
 * with a `data-stub` attribute naming the feature, records the props it gets
 * and the messages a parent sends it, and emits what the test sends.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const stub = <Self, Props, Events, Receives = never>(
  feature: Feature.Service<Self, Props, Events, Receives>
): Stub<Self, Props, Events, Receives> => {
  const name: string = feature[Feature.TypeId].name
  const seen: Array<Props> = []
  const received: Array<Receives> = []
  const listeners = new Set<(events: Events) => void>()
  // What the test emits, tagged so it can't be mistaken for a message a parent sent.
  const Emit = Schema.TaggedStruct("~effect/ui/TestHost/Emit", { events: feature.events })
  const isEmit = Schema.is(Emit)
  const Message = Schema.Union([Emit, feature.receives])
  const component = Component.define({
    name,
    props: feature.props,
    model: Schema.Number,
    message: Message,
    events: feature.events
  }).make({
    init: () => 0,
    update: (count, message, $) => {
      if (isEmit(message)) return $.set(count + 1).emit(message.events)
      received.push(message as Receives)
      return count
    },
    view: (_, h) => {
      if (seen.length === 0 || seen[seen.length - 1] !== h.props) seen.push(h.props)
      return h.el("stub").attr("data-stub", name)
    },
    subscriptions: () => [
      Subscription.make(
        "stub",
        Stream.callback<typeof Emit.Type>((queue) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              const listener = (events: Events) => {
                Queue.offerUnsafe(queue, Emit.make({ events }))
              }
              listeners.add(listener)
              return listener
            }),
            (listener) => Effect.sync(() => listeners.delete(listener))
          )
        )
      )
    ]
  })
  return {
    layer: feature.toLayer(component as any),
    props: () => seen,
    received: () => received,
    emit: (events) => {
      for (const listener of listeners) listener(events)
    }
  }
}

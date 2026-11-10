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
 * const Counter = Component.make({
 *   name: "Counter",
 *   model: Schema.Number,
 *   message: Msg,
 *   init: () => 0,
 *   update: (count) => count + 1,
 *   view: (count, h) => h.el("button", String(count)).on("click", Msg.make({ _tag: "Increment" }))
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
 * @since 4.1.3
 */
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Queue from "../../Queue.ts"
import type * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
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
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface TestElement extends Query.Firable {
  readonly _tag: "Element"
  readonly tag: string
  readonly attrs: Record<string, string>
  readonly props: Record<string, unknown>
  readonly children: Array<TestNode>
  parent: TestElement | undefined
  handlers: Renderer.Handlers
  dispatch: Renderer.Dispatch | undefined
}

/**
 * A text node on the test host.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
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
 * @since 4.1.3
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
 * @since 4.1.3
 */
export const makeHost = (): Renderer.Host<TestNode> & {
  readonly operations: () => ReadonlyArray<string>
  readonly clearOperations: () => void
  readonly commits: () => number
} => {
  let operations: Array<string> = []
  let commits = 0
  return {
    operations: () => operations,
    clearOperations: () => {
      operations = []
    },
    commits: () => commits,
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
    setEvents(node, handlers, dispatch) {
      const element = node as TestElement
      element.handlers = handlers
      element.dispatch = dispatch
    },
    elements: "any",
    controlled: new Set(["value", "checked", "selected", "open"]),
    runsMounts: false,
    commit: () => {
      commits++
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
 * @since 4.1.3
 */
export interface TestHost {
  readonly host: ReturnType<typeof makeHost>
  readonly log: MessageLog.Memory
  /** Drains the test scheduler once. Returns whether it ran out of budget. */
  readonly drain: (budget: number) => boolean
  /** Whether the test scheduler has work queued. */
  readonly busy: () => boolean
  /** The Commands still running or queued in every tree mounted on this host. */
  readonly pending: () => ReadonlyArray<Pending>
  readonly budget: number
  /** Adds a mounted tree to `pending`, until the returned function is called. */
  readonly register: (tree: { readonly pending: () => ReadonlyArray<Pending> }) => () => void
}

/**
 * A Command run still in flight: the instance that issued it, its name, and
 * whether it's `running` or `queued`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Pending {
  readonly path: string
  readonly name: string
  readonly status: string
  /** A detached run: owned by its Layer build, it may outlive its instance. */
  readonly detached: boolean
}

/**
 * The `TestHost` service.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export const TestHost: Context.Service<TestHost, TestHost> = Context.Service<TestHost>("effect/ui/testing/TestHost")

/**
 * Provides `TestHost`, the `Renderer` for it, the test scheduler and a
 * `MessageLog.memory` log.
 *
 * **Details**
 *
 * `budget` is how many scheduler tasks `settle` runs before it gives up
 * (100,000 by default), and `logSize` the size of the log's ring buffer.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options?: {
  readonly budget?: number | undefined
  readonly logSize?: number | undefined
}): Layer.Layer<TestHost | Renderer.Renderer> =>
  Layer.effectContext(Effect.sync(() => {
    const host = makeHost()
    const executor = new Executor.TestExecutor()
    const log = MessageLog.makeMemory({ size: options?.logSize })
    const trees = new Set<{ readonly pending: () => ReadonlyArray<Pending> }>()
    const service: TestHost = {
      host,
      log,
      drain: (budget) => executor.drain(budget),
      busy: () => executor.size > 0,
      pending: () => [...trees].flatMap((tree) => tree.pending()),
      budget: options?.budget ?? 100_000,
      register: (tree) => {
        trees.add(tree)
        return () => {
          trees.delete(tree)
        }
      }
    }
    return Context.make(TestHost, service).pipe(
      Context.add(Renderer.Renderer, { host }),
      Context.add(Executor.CurrentExecutor, executor),
      Context.add(MessageLog.MessageLog, log)
    ) as Context.Context<TestHost | Renderer.Renderer>
  }))

/**
 * A tree mounted on `TestHost`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface TestRoot<out Model, in Msg, out Events> {
  /** The root instance's path, `/<name>`. */
  readonly path: string
  readonly session: string
  /** The element the tree is mounted in. */
  readonly container: TestElement
  /** The root's current Model, or `undefined` after it crashed. */
  readonly model: () => Model | undefined
  /** Sends a message to the root. The log shows it as a `Dispatch`. */
  readonly send: (message: Msg) => void
  /** What the root emitted, in order. */
  readonly emitted: ReadonlyArray<Events>
  /** This mount's log entries, oldest first. */
  readonly log: () => ReadonlyArray<MessageLog.Entry>
  /** The Commands still running or queued in this tree. */
  readonly pending: () => ReadonlyArray<Pending>
  /** The tree's merged document head, as last given to the host. */
  readonly head: () => Head.Head
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
 * The first render happens at once. Commands, Subscriptions and Layer builds
 * wait for `settle`. The test host shows every vocabulary, so any root
 * mounts.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const mount = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements, RF = never>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options?: {
    readonly fallback?:
      | ((
        failure: AsyncResult.Failure<never, unknown>,
        h: View.Helper<never, {}> & View.Tags<V, never>
      ) => View.Node<never, RF>)
      | undefined
    readonly loader?: Renderer.LoaderOptions | undefined
  }
): Effect.Effect<TestRoot<Model, Msg, Events>, never, R | RF | TestHost | Scope.Scope> =>
  Effect.gen(function*() {
    const testHost = yield* TestHost
    const container = makeElement("#root")
    const root = yield* runtime.mount(component, props, container, options as any)
    const unregister = testHost.register(root)
    yield* Effect.addFinalizer(() => Effect.sync(unregister))
    const testRoot: TestRoot<Model, Msg, Events> = {
      path: root.path,
      session: root.session,
      container,
      model: root.model as () => Model | undefined,
      send: root.send,
      emitted: root.emitted as ReadonlyArray<Events>,
      log: () => testHost.log.entries().filter((entry) => entry.session === root.session),
      pending: root.pending,
      head: root.head,
      text: () => Query.textOf(container),
      all: (locator) => Query.all(container as TestNode, locator),
      query: (locator) => Query.query(container as TestNode, locator),
      get: (locator) => Query.get(container as TestNode, locator)
    }
    return testRoot
  }) as any

/**
 * `settle` ran out of budget: something keeps scheduling work.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.3
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
 * Subscription waiting for its next value, or a Command sleeping on the clock,
 * doesn't keep `settle` from returning; adjust `TestClock` and settle again.
 * Work that resolves a Promise gets a few macrotasks to come back. When the
 * budget runs out, `settle` fails with the log's tail and the Commands still
 * pending.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.3
 */
export const settle: Effect.Effect<void, SettleError, TestHost> = Effect.gen(function*() {
  const testHost = yield* TestHost
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
            "Pending Commands:",
            pending.length === 0
              ? "  (none)"
              : pending.map((p) => `  ${p.path} ${p.name} (${p.status}${p.detached ? ", detached" : ""})`).join("\n")
          ].join("\n"),
          pending,
          log
        })
      }
      budget = Math.max(0, before - 1)
      continue
    }
    if (testHost.pending().length === 0) return
    // Something may come back from outside the scheduler, such as a resolved Promise.
    quiet++
    yield* nextMacrotask
  }
})

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
 * @since 4.1.3
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
          : source._tag === "Mount"
          ? `mount ${source.name}`
          : "dispatch"
        const commands = entry.commands.length === 0 ? "" : ` -> ${entry.commands.map((c) => c.name).join(", ")}`
        const events = entry.events.length === 0 ? "" : ` events ${entry.events.map(summary).join(", ")}`
        return `${head} ${summary(entry.message)} (${from})${commands}${events}`
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
        return `${head} ${entry.name}`
      case "CommandDropped":
        return `${head} ${entry.name} (${entry.reason})`
      default:
        return head
    }
  }).join("\n")

/**
 * A stand-in for a feature, from `stub`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Stub<Self, Props, Events> {
  /** Provides the stub as the feature's implementation. */
  readonly layer: Layer.Layer<Self>
  /** The props the stub rendered with, in order, without repeats. */
  readonly props: () => ReadonlyArray<Props>
  /** Makes every mounted stub emit, as the real feature would. Settle first, so it's listening. */
  readonly emit: (events: Events) => void
}

/**
 * Stands in for a feature in a runtime test: it renders a `<stub>` element
 * with a `data-stub` attribute naming the feature, records the props it gets,
 * and emits what the test sends.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const stub = <Self, Props, Events>(feature: Feature.Service<Self, Props, Events>): Stub<Self, Props, Events> => {
  const name: string = feature[Feature.TypeId].name
  const seen: Array<Props> = []
  const listeners = new Set<(events: Events) => void>()
  const Message = Schema.Struct({ events: feature.events })
  const component = Component.make({
    name,
    props: feature.props,
    model: Schema.Number,
    message: Message,
    events: feature.events,
    init: () => 0,
    update: (count, message, $) => $.set(count + 1).emit(message.events),
    view: (_, h) => {
      if (seen.length === 0 || seen[seen.length - 1] !== h.props) seen.push(h.props)
      return h.el("stub").attr("data-stub", name)
    },
    subscriptions: () => [
      Subscription.make(
        "stub",
        Stream.callback<{ readonly events: Events }>((queue) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              const listener = (events: Events) => {
                Queue.offerUnsafe(queue, { events })
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
    layer: feature.layer(component as any),
    props: () => seen,
    emit: (events) => {
      for (const listener of listeners) listener(events)
    }
  }
}

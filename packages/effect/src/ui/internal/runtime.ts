/**
 * The runtime: instances, their Scopes, Commands, Subscriptions and provided
 * Layers, and the component-bounded virtual DOM that keeps a host in step.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Context from "../../Context.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Exit from "../../Exit.ts"
import type * as Fiber from "../../Fiber.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Scheduler from "../../Scheduler.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import type * as Command from "../Command.ts"
import type * as Component from "../Component.ts"
import * as Feature from "../Feature.ts"
import * as Head from "../Head.ts"
import * as MessageLog from "../MessageLog.ts"
import type * as Renderer from "../Renderer.ts"
import type * as Subscription from "../Subscription.ts"
import * as View from "../View.ts"
import * as Executor from "./executor.ts"
import * as schedule from "./schedule.ts"
import * as serverHost from "./serverHost.ts"
import * as services from "./services.ts"

// ---------------------------------------------------------------------------
// Envs: the Context an instance resolves its services from
// ---------------------------------------------------------------------------

/**
 * The Context instances resolve from. A provided Layer gives its instance (or,
 * when shared, every instance resolving from the same parent Env) a new Env
 * that settles when the Layer is built.
 */
interface Env {
  ctx: Context.Context<any> | undefined
  failure: Cause.Cause<unknown> | undefined
  readonly parent: Env | undefined
  /** On the server: a Layer that is never built there, or one below it. It never settles. */
  readonly never: boolean
  readonly waiters: Array<{
    readonly ready: (ctx: Context.Context<any>) => void
    readonly failed: ((cause: Cause.Cause<unknown>) => void) | undefined
  }>
}

const readyEnv = (ctx: Context.Context<any>, parent?: Env): Env => ({
  ctx,
  failure: undefined,
  parent,
  waiters: [],
  never: false
})
const buildingEnv = (parent: Env, never = parent.never): Env => ({
  ctx: undefined,
  failure: undefined,
  parent,
  waiters: [],
  never
})
/** The nearest Env with services: what a fallback, or work after a handled Layer failure, runs against. */
const settled = (env: Env): Env => env.ctx !== undefined ? env : settled(env.parent!)
const whenReady = (
  env: Env,
  ready: (ctx: Context.Context<any>) => void,
  failed?: (cause: Cause.Cause<unknown>) => void
) => {
  if (env.ctx !== undefined) ready(env.ctx)
  else if (env.failure !== undefined) failed?.(env.failure)
  else env.waiters.push({ ready, failed })
}
const resolveEnv = (env: Env, ctx: Context.Context<any>) => {
  env.ctx = ctx
  for (const waiter of env.waiters.splice(0)) waiter.ready(ctx)
}
const failEnv = (env: Env, cause: Cause.Cause<unknown>) => {
  env.failure = cause
  for (const waiter of env.waiters.splice(0)) waiter.failed?.(cause)
}
const unavailable = (env: Env): View.Child.Fallback =>
  env.failure !== undefined ? AsyncResult.failure(env.failure) : AsyncResult.initial(true)

// ---------------------------------------------------------------------------
// Rendered tree
// ---------------------------------------------------------------------------

type Rendered = RElement | RText | RChild | RSlot

interface RElement {
  readonly _tag: "Element"
  readonly v: View.Element<any, any>
  readonly node: unknown
  readonly children: Array<Rendered>
  readonly mountScope: Scope.Closeable | undefined
}

interface RText {
  readonly _tag: "Text"
  readonly v: View.Text
  readonly node: unknown
}

interface RChild {
  readonly _tag: "Child"
  readonly v: View.Child<any, any>
  readonly inst: Instance
}

/** A slot showing its `fallback`: its feature service is building or failed, or its child failed. */
interface RSlot {
  readonly _tag: "Slot"
  readonly v: View.Child<any, any>
  readonly inner: Rendered
  readonly failure: Cause.Cause<unknown> | undefined
}

// ---------------------------------------------------------------------------
// Instances
// ---------------------------------------------------------------------------

interface Run {
  readonly command: Command.Effectful<any, any, never> | Command.Streaming<any, any, never>
  readonly issued: MessageLog.Issued
  /** On the server: the run's position among `init`'s Commands. */
  readonly initIndex: number | undefined
  status: "running" | "queued"
  fiber: Fiber.Fiber<unknown, unknown> | undefined
  done: boolean
}

interface SubscriptionRun {
  readonly scope: Scope.Closeable
  fiber: Fiber.Fiber<unknown, unknown> | undefined
}

/** @internal */
export interface Instance {
  readonly path: string
  readonly depth: number
  readonly component: Component.Any
  readonly parent: Instance | undefined
  readonly scope: Scope.Closeable
  env: Env
  readonly children: Map<string, Instance>
  props: unknown
  model: unknown
  /** The entries from the component's `head`, as of the last render. */
  head: ReadonlyArray<Head.Entry>
  onEmit: (events: unknown) => unknown
  onFailure: ((failure: AsyncResult.Failure<never, unknown>) => unknown) | undefined
  failure: Cause.Cause<unknown> | undefined
  rendered: Array<Rendered>
  closed: boolean
  /** Hydration: the provided Layer is still building, so the server's nodes wait, inert. */
  waiting: boolean
  /** Hydration: whether this instance's children may adopt the server's Models. */
  adoptsChildren: boolean
  /** Hydration: the head entries the instance contributed when it mounted, before any later update. */
  adoptionHead: ReadonlyArray<Head.Entry> | undefined
  /** On the server: the client builds this instance fresh, because its Layer wasn't built. */
  deferred: boolean
  /** On the server: positions of `init`'s server Commands that haven't completed. */
  readonly serverPending: Set<number>
  readonly runs: Array<Run>
  readonly subscriptions: Map<string, SubscriptionRun>
  readonly dispatch: (message: unknown, source: MessageLog.Source) => void
  readonly fire: Renderer.Dispatch
}

/** @internal */
export interface Root {
  readonly path: string
  readonly session: string
  readonly instance: Instance
  readonly emitted: ReadonlyArray<unknown>
  readonly find: (path: string) => Instance | undefined
  readonly model: () => unknown
  readonly send: (message: unknown) => void
  /** The Commands still running or queued anywhere in the tree. */
  readonly pending: () => ReadonlyArray<{ readonly path: string; readonly name: string; readonly status: string }>
  /** The current flush: 0 for the first render, then one more per flush. */
  readonly flush: () => number
  /**
   * How many provided Layer builds that began in `flush` or later are still
   * pending, tree-wide. A failed build counts as settled. The router's settle
   * condition reads this.
   */
  readonly buildsPendingSince: (flush: number) => number
  /** The merged head, as last given to the host. */
  readonly head: () => Head.Head
  /** Completes once no slot is waiting to adopt the server's nodes. */
  readonly adopted: Effect.Effect<void>
  /** On the server: calls `f` once nothing is in flight. */
  readonly whenIdle: (f: () => void) => void
  /** On the server: settles what's left synchronously, stops the tree and serialises it once. */
  readonly finish: () => {
    readonly nodes: ReadonlyArray<Renderer.ServerNode>
    readonly state: Renderer.State
  }
}

/** The options `start` takes. */
interface Options {
  readonly fallback?:
    | ((failure: AsyncResult.Failure<never, unknown>, h: any) => View.Node<never, any>)
    | undefined
  /** Hydration: the server's state. The container holds the server's nodes. */
  readonly state?: Renderer.State | undefined
  /** Server rendering. `start` is false once server Commands may no longer start. */
  readonly server?: { readonly start: boolean; readonly host: Renderer.Host<any> } | undefined
}

/** A component's Model as JSON, for history restore. */
const jsonCodecs = new WeakMap<object, {
  readonly encode: (model: unknown) => Option.Option<unknown>
  readonly decode: (encoded: unknown) => Option.Option<unknown>
}>()
const jsonCodecOf = (schema: Schema.Codec<any, any>) => {
  let found = jsonCodecs.get(schema)
  if (found === undefined) {
    const codec = Schema.toCodecJson(schema as Schema.Codec<unknown, unknown>)
    found = { encode: Schema.encodeUnknownOption(codec), decode: Schema.decodeUnknownOption(codec) }
    jsonCodecs.set(schema, found)
  }
  return found
}

/** Whether replaying `init` for an adopted Model skips a Command: only server Commands are skipped. */
const isReplayDropped = (command: Command.Command<any, any>): boolean => command._tag !== "Interrupt" && command.server

const childName = (component: Component.Any | Feature.Any): string =>
  Feature.isService(component) ? component[Feature.TypeId].name : component.name

/** Shallow per key, with `Equal.equals` only for values that differ by reference. */
const propsEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return Equal.equals(a, b)
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  for (const key of keys) {
    const x = (a as any)[key]
    const y = (b as any)[key]
    if (x !== y && !Equal.equals(x, y)) return false
  }
  return true
}

const emptyText: View.Text = { _tag: "Text", text: "" }

type Draft = MessageLog.Entry extends infer E ? E extends MessageLog.Entry ? Omit<E, "seq" | "at" | "session"> : never
  : never

let sessions = 0

/** Components and Commands already warned about being dropped on the server, so each warns once. */
const warnedDrops = new Set<string>()

/** The server's nodes for one instance: between its two markers. */
interface Range {
  readonly open: unknown
  readonly close: unknown
  readonly nodes: ReadonlyArray<unknown>
  /** Whether the instance took these nodes, so whoever created the slot leaves them in place. */
  claimed: boolean
}

/** How a view matches the server's nodes. */
type Plan =
  | {
    readonly _tag: "Element"
    readonly node: unknown
    /** `undefined` when the element's server content is text only: its children are built fresh. */
    readonly children: ReadonlyArray<Plan> | undefined
  }
  | { readonly _tag: "Text"; readonly node: unknown }
  | { readonly _tag: "Child"; readonly range: Range }

// ---------------------------------------------------------------------------
// mount
// ---------------------------------------------------------------------------

/** @internal */
export const mount = (
  component: Component.Any,
  rootProps: unknown,
  container: unknown,
  options?: Options
): Effect.Effect<Root & Renderer.Root<any, any>, never, Scope.Scope | Renderer.Renderer> =>
  Effect.contextWith((ctx: Context.Context<Scope.Scope | Renderer.Renderer>) =>
    Effect.sync(() => start(component, rootProps, container, ctx, { ...options, server: undefined }))
  )

/**
 * Renders a tree on the server: on a host that only keeps the node tree,
 * waiting for provided Layers and `init`'s server Commands until nothing is
 * in flight or the budget runs out, then serialising it once.
 *
 * @internal
 */
export const prerender = (
  component: Component.Any,
  rootProps: unknown,
  options: { readonly budget: Duration.Input; readonly elements: ReadonlyArray<string> | "any" }
): Effect.Effect<Renderer.Prerendered<any>> =>
  // The render's own Scope closes however it ends, interrupted included: its work runs in fibers of its own.
  Effect.acquireUseRelease(
    Scope.make("sequential"),
    Effect.fnUntraced(function*(scope) {
      const budget = Duration.fromInputUnsafe(options.budget)
      const started = !Duration.isZero(budget)
      const host = serverHost.make(options.elements)
      const ctx = Context.add(yield* Effect.context<never>(), Scope.Scope, scope)
      const root = start(component, rootProps, host.createElement("#root"), ctx, {
        server: { start: started, host }
      })
      if (started) {
        yield* Effect.raceFirst(
          Effect.callback<void>((resume) => {
            root.whenIdle(() => resume(Effect.void))
          }),
          Effect.sleep(budget)
        )
      }
      const out = root.finish()
      return { nodes: out.nodes, state: out.state, model: root.model(), head: root.head() }
    }),
    (scope, exit) => Scope.close(scope, exit)
  )

const start = (
  component: Component.Any,
  rootProps: unknown,
  container: unknown,
  ctx: Context.Context<any>,
  options: Options | undefined
): Root & Renderer.Root<any, any> => {
  const server = options?.server
  const host: Renderer.Host<any> = server !== undefined ? server.host : Context.get(ctx, services.Renderer).host
  const log = Context.get(ctx, MessageLog.MessageLog)
  const executor = Context.get(ctx, Executor.CurrentExecutor)
  const clock = Context.get(ctx, Clock.Clock)
  const rootScope = Context.get(ctx, Scope.Scope)
  const session = `${clock.currentTimeMillisUnsafe().toString(36)}-${(sessions++).toString(36)}`
  const controlled = host.controlled
  const rootEmitted: Array<unknown> = []
  const sharedBuilds = new WeakMap<Env, Map<Layer.Layer<any, any, any>, SharedBuild>>()
  const hooks = Option.getOrUndefined(Context.getOption(ctx, services.RootHooks))

  // -- server ---------------------------------------------------------------
  // Whether `init`'s server Commands may still start: false with no budget, or once it's spent.
  let serverStarts = server?.start ?? false
  // Set by `finish`: the tree is serialised, and nothing it does from now on counts.
  let frozen = false
  // Server Command runs not yet ended.
  let active = 0
  const idleWaiters: Array<() => void> = []

  // -- hydration ------------------------------------------------------------
  const hydration = host.hydration
  // The server's state, until every slot has adopted.
  let hydrating: {
    readonly state: Renderer.State
    readonly deferred: ReadonlySet<string>
    readonly pending: Readonly<Record<string, ReadonlyArray<number>>>
  } | undefined = options?.state === undefined || server !== undefined ? undefined : {
    state: options.state,
    deferred: new Set(options.state["~deferred"] ?? []),
    pending: options.state["~pending"] ?? {}
  }
  // Slots still waiting for their Layer before they adopt, and whether the first render is done.
  let waiting = 0
  let started = false
  let adoptedDone = hydrating === undefined
  const adoptedWaiters: Array<() => void> = []
  const settleWaiting = () => {
    waiting--
    if (waiting === 0 && started) finishAdoption()
  }
  const finishAdoption = () => {
    if (adoptedDone) return
    adoptedDone = true
    hydrating = undefined
    reportAdoption()
    for (const f of adoptedWaiters.splice(0)) f()
    // Head sync starts with the flush after adoption.
    headDirty = true
    wake()
  }

  // -- log ------------------------------------------------------------------
  let seq = 0
  const record = (draft: Draft): number => {
    if (!log.enabled) return -1
    const entry = { ...draft, seq: ++seq, at: clock.currentTimeMillisUnsafe(), session } as MessageLog.Entry
    log.record(entry)
    return entry.seq
  }

  // -- fibers ---------------------------------------------------------------
  const withScheduler = (context: Context.Context<any>): Context.Context<any> =>
    executor.scheduler === undefined ? context : Context.add(context, Scheduler.Scheduler, executor.scheduler)
  /** Starts at once, so a Layer that builds synchronously is ready for the first frame. */
  const forkNow = <A, E>(context: Context.Context<any>, effect: Effect.Effect<A, E, any>): Fiber.Fiber<A, E> =>
    Effect.runForkWith(withScheduler(context))(effect)
  /** Starts on the scheduler, never inside the `update` that issued it. */
  const forkLater = <A, E>(context: Context.Context<any>, effect: Effect.Effect<A, E, any>): Fiber.Fiber<A, E> =>
    forkNow(context, Effect.andThen(Effect.yieldNow, effect))
  const closeScope = (scope: Scope.Closeable) => {
    forkNow(ctx, Scope.close(scope, Exit.void))
  }

  // -- flush ----------------------------------------------------------------
  const dirty = new Set<Instance>()
  const deferred: Array<() => void> = []
  let committed: Array<() => void> = []
  let scheduled = false
  // Each provided Layer build still pending, stamped with the flush it began in.
  let flushes = 0
  const building = new Set<{ readonly flush: number }>()
  // True while the first render or a flush is building nodes the host hasn't committed yet.
  let rendering = true
  const wake = () => {
    if (!scheduled) {
      scheduled = true
      executor.schedule(flush)
    }
  }
  const markDirty = (inst: Instance) => {
    dirty.add(inst)
    wake()
  }
  const defer = (f: () => void) => {
    deferred.push(f)
    wake()
  }
  /** Runs `f` once the current render is committed. */
  const afterCommit = (f: () => void) => {
    if (rendering || scheduled || dirty.size > 0) committed.push(f)
    else f()
  }
  function flush() {
    scheduled = false
    rendering = true
    flushes++
    do {
      while (dirty.size > 0 || deferred.length > 0) {
        if (deferred.length > 0) {
          deferred.shift()!()
          continue
        }
        let next: Instance | undefined
        for (const inst of dirty) {
          if (next === undefined || inst.depth < next.depth) next = inst
        }
        dirty.delete(next!)
        if (!next!.closed) render(next!)
      }
      // A title template that throws fails its instance, so the fallback renders and the head is merged again.
      mergeHead()
    } while (dirty.size > 0 || deferred.length > 0)
    host.commit?.()
    afterCommitHooks()
    rendering = false
    runCommitted()
    checkIdle()
  }
  /**
   * Decides whether the server is idle once the current callback has finished:
   * a Layer that settled or a Command that ended may still be about to wake a
   * slot, fail an instance or start work.
   */
  let idleCheck = false
  const checkIdle = () => {
    if (idleWaiters.length === 0 || idleCheck) return
    idleCheck = true
    executor.schedule(() => {
      idleCheck = false
      if (scheduled || dirty.size > 0 || deferred.length > 0 || active > 0 || building.size > 0) return
      for (const f of idleWaiters.splice(0)) f()
    })
  }
  const runCommitted = () => {
    const done = committed
    committed = []
    for (const f of done) f()
  }

  // -- head and the router's hook --------------------------------------------
  // Set when an instance with `head` rendered, or the tree lost an instance.
  let headDirty = false
  let merged: Head.Head = Head.empty
  // Set when `merged` holds a head the host hasn't been given.
  let headChanged = false
  let rootInstance: Instance | undefined
  let handle: services.RootHandle | undefined

  const updateHead = (inst: Instance) => {
    const head = inst.component.head
    if (head === undefined) return
    const entries = guard(inst, "head", () => head(inst.model))
    if (entries === undefined) return
    inst.head = entries
    headDirty = true
  }

  /** The head entries in document order. A slot's fallback contributes none. */
  const headTree = (inst: Instance): Head.Tree => ({
    entries: inst.closed || inst.failure !== undefined ? [] : inst.head,
    children: inst.closed || inst.failure !== undefined ? [] : inst.rendered.flatMap(headChildren),
    // A throwing title template fails the instance that declared it.
    onError: (error) => failInstance(inst, Cause.die(error), "head")
  })
  const headChildren = (rendered: Rendered): Array<Head.Tree> =>
    rendered._tag === "Child"
      ? [headTree(rendered.inst)]
      : rendered._tag === "Element"
      ? rendered.children.flatMap(headChildren)
      : []

  /**
   * The head the tree had at adoption: the live tree's structure, with each
   * instance's entries as evaluated when it mounted. Updates since, such as
   * one an `onMount` sent while another slot waited, don't count. A template
   * that throws is skipped here; the live merge fails its instance.
   */
  const adoptionTree = (inst: Instance): Head.Tree => ({
    entries: inst.closed || inst.failure !== undefined ? [] : inst.adoptionHead ?? inst.head,
    children: inst.closed || inst.failure !== undefined ? [] : inst.rendered.flatMap(adoptionChildren),
    onError: () => {}
  })
  const adoptionChildren = (rendered: Rendered): Array<Head.Tree> =>
    rendered._tag === "Child"
      ? [adoptionTree(rendered.inst)]
      : rendered._tag === "Element"
      ? rendered.children.flatMap(adoptionChildren)
      : []
  const reportAdoption = () => {
    if (hydration?.adopted !== undefined && rootInstance !== undefined) {
      hydration.adopted(Head.merge(adoptionTree(rootInstance)))
    }
  }

  const buildsPendingSince = (flush: number) => {
    let count = 0
    for (const stamp of building) if (stamp.flush >= flush) count++
    return count
  }

  /**
   * Merges the live tree's head once nothing is left to render. A title template
   * that throws fails its instance, which sets `headDirty` again: that merge saw
   * the removed subtree, so it's discarded. With the root failed nothing is left
   * to render and the next merge is final; otherwise the flush renders the
   * fallback first.
   */
  const mergeHead = () => {
    const root = rootInstance
    if (root === undefined) return
    while (headDirty && dirty.size === 0 && deferred.length === 0) {
      headDirty = false
      const next = Head.merge(headTree(root))
      if (!headDirty) {
        merged = next
        headChanged = true
      }
    }
  }

  /** After the nodes commit: head sync, then the router's hook. Both wait until every slot has adopted. */
  const afterCommitHooks = () => {
    if (!adoptedDone) return
    if (headChanged) {
      headChanged = false
      host.head?.(merged)
    }
    // A head still to merge belongs to the flush already scheduled, which calls the hook.
    if (hooks !== undefined && handle !== undefined && !headDirty) {
      hooks.afterFlush(handle, { flush: flushes, head: merged, buildsPendingSince })
    }
  }

  // -- failure --------------------------------------------------------------
  const guard = <A>(
    inst: Instance,
    source: MessageLog.FailureSource,
    f: () => A,
    name?: string
  ): A | undefined => {
    try {
      return f()
    } catch (error) {
      failInstance(inst, Cause.die(error), source, name)
      return undefined
    }
  }

  /** Swaps the instance's nodes for an empty text node, then closes its Scope and removes them, once. */
  const close = (inst: Instance) => {
    const nodes = inst.rendered.flatMap(nodesOf)
    const placeholder = host.createText("")
    const at = nodes[0]
    const parentNode = at === undefined ? undefined : host.parentOf(at)
    if (parentNode !== undefined) host.insertBefore(parentNode, placeholder, at)
    else if (inst.parent === undefined) host.insertBefore(container, placeholder, undefined)
    closeScope(inst.scope)
    for (const node of nodes) host.remove(node)
    inst.rendered = [{ _tag: "Text", v: emptyText, node: placeholder }]
    inst.parent?.children.delete(inst.path)
  }

  const failInstance = (
    inst: Instance,
    cause: Cause.Cause<unknown>,
    source: MessageLog.FailureSource,
    name?: string
  ) => {
    if (inst.closed) return
    const failedSeq = record({ _tag: "Failed", path: inst.path, source, name, cause })
    forkNow(
      ctx,
      Effect.logError(`${inst.path} failed in ${source}${name === undefined ? "" : ` (${name})`}`, cause)
    )
    inst.failure = cause
    headDirty = true
    close(inst)
    const parent = inst.parent
    if (parent === undefined) {
      record({ _tag: "Crashed", path: inst.path, source, name, cause })
      showRootFallback(inst, cause)
      return
    }
    const onFailure = inst.onFailure
    if (onFailure !== undefined) {
      // The parent's code, so a defect in it is the parent's, and it runs between renders.
      defer(() => {
        const message = guard(parent, "onFailure", () => onFailure(AsyncResult.failure(cause)))
        if (message !== undefined) parent.dispatch(message, { _tag: "Emit", path: inst.path, seq: failedSeq })
      })
    }
    markDirty(parent)
  }

  let rootFallbackNodes: Array<unknown> = []
  const showRootFallback = (root: Instance, cause: Cause.Cause<unknown>) => {
    const fallback = options?.fallback
    if (fallback === undefined) return
    try {
      const view = fallback(AsyncResult.failure(cause), View.makeHelper({}, root.component.elements()))
      const node = buildStatic(view)
      const placeholder = nodesOf(root.rendered[0]!)[0]
      host.insertBefore(
        container,
        node,
        placeholder !== undefined && host.parentOf(placeholder) === container ? placeholder : undefined
      )
      rootFallbackNodes.push(node)
    } catch (error) {
      record({ _tag: "Crashed", path: root.path, source: "fallback", name: undefined, cause: Cause.die(error) })
    }
  }
  /** The root fallback runs with no instance: plain nodes, no handlers, no children. */
  const buildStatic = (view: View.Node<any, any>): unknown => {
    if (view._tag === "Text") return host.createText(view.text)
    if (view._tag === "Child") return host.createText("")
    const node = host.createElement(view.tag)
    for (const name in view.attrs) host.setAttr(node, name, view.attrs[name])
    for (const child of view.children) host.insertBefore(node, buildStatic(child), undefined)
    for (const name in view.props) host.setProp(node, name, view.props[name])
    return node
  }

  // -- shared Layers --------------------------------------------------------
  interface SharedBuild {
    readonly env: Env
    readonly scope: Scope.Closeable
    refs: number
  }

  const buildLayer = (
    layer: Layer.Layer<any, any, any>,
    context: Context.Context<any>,
    scope: Scope.Scope,
    onExit: (exit: Exit.Exit<Context.Context<any>, unknown>) => void
  ): Fiber.Fiber<Context.Context<any>, unknown> | undefined => {
    const fiber = forkNow(context, Layer.buildWithScope(layer, scope))
    const exit = fiber.pollUnsafe()
    if (exit !== undefined) {
      onExit(exit)
      return undefined
    }
    fiber.addObserver(onExit)
    return fiber
  }

  /** A Layer value is built once per (parent Env, Layer), and the last instance to let go closes it. */
  const acquireShared = (parentEnv: Env, layer: Layer.Layer<any, any, any>): SharedBuild => {
    let byLayer = sharedBuilds.get(parentEnv)
    if (byLayer === undefined) sharedBuilds.set(parentEnv, byLayer = new Map())
    const found = byLayer.get(layer)
    if (found !== undefined) {
      found.refs++
      return found
    }
    // Not owned by the first user's Scope: every user releases it, and the last one closes it.
    const entry: SharedBuild = { env: buildingEnv(parentEnv), scope: Scope.makeUnsafe("sequential"), refs: 1 }
    byLayer.set(layer, entry)
    whenReady(parentEnv, (parentCtx) => {
      const fiber = buildLayer(layer, parentCtx, entry.scope, (exit) => {
        if (Exit.isFailure(exit)) {
          // A failed build is evicted, so the next user builds again.
          if (byLayer!.get(layer) === entry) byLayer!.delete(layer)
          failEnv(entry.env, exit.cause)
        } else {
          resolveEnv(entry.env, Context.merge(parentCtx, exit.value))
        }
      })
      if (fiber !== undefined) {
        Effect.runSync(Scope.addFinalizer(entry.scope, Effect.sync(() => fiber.interruptUnsafe())))
      }
    }, (cause) => failEnv(entry.env, cause))
    return entry
  }

  const releaseShared = (parentEnv: Env, layer: Layer.Layer<any, any, any>, entry: SharedBuild) => {
    if (--entry.refs > 0) return
    const byLayer = sharedBuilds.get(parentEnv)
    if (byLayer?.get(layer) === entry) byLayer.delete(layer)
    closeScope(entry.scope)
  }

  // -- instances ------------------------------------------------------------
  const makeInstance = (
    component: Component.Any,
    props: unknown,
    path: string,
    parent: Instance | undefined,
    parentEnv: Env,
    onEmit: (events: unknown) => unknown,
    onFailure: ((failure: AsyncResult.Failure<never, unknown>) => unknown) | undefined,
    range: Range | undefined
  ): Instance => {
    const scope = Scope.forkUnsafe(parent?.scope ?? rootScope, "sequential")
    const inst: Instance = {
      path,
      depth: parent === undefined ? 0 : parent.depth + 1,
      component,
      parent,
      scope,
      env: parentEnv,
      children: new Map(),
      props,
      model: undefined,
      head: [],
      onEmit,
      onFailure,
      failure: undefined,
      rendered: [],
      closed: false,
      waiting: false,
      adoptsChildren: false,
      adoptionHead: undefined,
      deferred: false,
      serverPending: new Set(),
      runs: [],
      subscriptions: new Map(),
      dispatch(message, source) {
        if (inst.closed || inst.waiting || frozen) return
        const next = guard(inst, "update", () => component.update(inst.model, message as never, inst.props))
        if (next === undefined) return
        const entrySeq = record({
          _tag: "Update",
          path,
          component,
          source,
          message,
          props: inst.props,
          model: next.model,
          commands: next.commands,
          events: next.events
        })
        apply(inst, next, entrySeq, false)
      },
      fire(event, handler, payload) {
        if (inst.closed || inst.waiting) return
        const message = typeof handler === "function"
          ? guard(inst, "domEvent", () => (handler as (payload: unknown) => unknown)(payload), event)
          : handler
        if (message !== undefined) inst.dispatch(message, { _tag: "DomEvent", name: event })
      }
    }

    // Finalizers run in reverse: Commands stop first, then `Unmounted` is logged.
    // Descendants, Subscriptions and mounts use child Scopes forked later, so they close before both.
    Effect.runSync(Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        inst.closed = true
        dirty.delete(inst)
        record({ _tag: "Unmounted", path })
        // A slot that closes while it waits no longer holds up adoption.
        if (inst.waiting) {
          inst.waiting = false
          settleWaiting()
        }
      })
    ))
    Effect.runSync(Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        inst.closed = true
        for (const run of inst.runs.slice()) stopRun(inst, run)
      })
    ))

    // Entries about the Layer wait until `Mounted` is logged.
    let buffering = true
    const early: Array<() => void> = []
    const lifecycle = (draft: Draft) => {
      if (buffering) early.push(() => record(draft))
      else record(draft)
    }
    const logEarly = () => {
      buffering = false
      for (const f of early.splice(0)) f()
    }
    let constructing = true
    let failedEarly: Cause.Cause<unknown> | undefined
    let pending = false

    // A provided Layer builds in the background. The instance renders at once; its Commands,
    // Subscriptions and mounts, and its descendants', wait for it.
    if (component.layer !== undefined) {
      if (server !== undefined && (!component.layerOnServer || parentEnv.never)) {
        // Kept off the server: never built, and the budget doesn't wait for it. The client builds it fresh.
        inst.env = buildingEnv(parentEnv, true)
        inst.deferred = true
      } else {
        const sharedLayer = component.sharedLayer
        const shared = sharedLayer !== undefined ? acquireShared(parentEnv, sharedLayer) : undefined
        const own = shared !== undefined ? shared.env : buildingEnv(parentEnv)
        inst.env = own
        if (shared !== undefined) {
          Effect.runSync(Scope.addFinalizer(scope, Effect.sync(() => releaseShared(parentEnv, sharedLayer!, shared))))
        }
        let settleBuild: (() => void) | undefined
        const fail = (cause: Cause.Cause<unknown>) => {
          settleBuild?.()
          if (inst.closed) return
          lifecycle({ _tag: "LayerFailed", path, cause })
          const handle = component.layerFailure
          if (handle === undefined) {
            if (constructing) failedEarly = cause
            else {
              defer(() => {
                logEarly()
                failInstance(inst, cause, "layer")
              })
            }
            return
          }
          // Handled: the component stays mounted and hears about it once. Feature slots below show
          // `fallback`, and Commands waiting for the Layer are interrupted. The server leaves it to the client.
          inst.deferred = true
          failEnv(own, cause)
          defer(() => {
            const message = guard(inst, "onFailure", () => handle(AsyncResult.failure(cause)))
            if (message !== undefined) inst.dispatch(message, { _tag: "Dispatch" })
          })
        }
        const ready = () => {
          if (!inst.closed && pending) lifecycle({ _tag: "LayerReady", path })
        }
        if (shared !== undefined) {
          whenReady(own, ready, fail)
        } else {
          whenReady(parentEnv, (parentCtx) => {
            if (inst.closed) return
            // A factory that throws is this instance's Layer failing, not its parent's view.
            let layer: Layer.Layer<any, any, any>
            try {
              layer = component.layer!(props)
            } catch (defect) {
              return fail(Cause.die(defect))
            }
            const fiber = buildLayer(layer, parentCtx, scope, (exit) => {
              if (inst.closed) return
              if (Exit.isFailure(exit)) return fail(exit.cause)
              ready()
              resolveEnv(own, Context.merge(parentCtx, exit.value))
            })
            // A build still running ends with its instance.
            if (fiber !== undefined) {
              Effect.runSync(Scope.addFinalizer(scope, Effect.sync(() => fiber.interruptUnsafe())))
            }
          }, fail)
        }
        if (own.ctx === undefined && own.failure === undefined && failedEarly === undefined) {
          pending = true
          lifecycle({ _tag: "LayerPending", path })
          const stamp = { flush: flushes }
          building.add(stamp)
          settleBuild = () => {
            if (!building.delete(stamp)) return
            // The router's settle condition is checked after a flush, so a settled build wakes one.
            if (hooks !== undefined) wake()
            checkIdle()
          }
          whenReady(own, settleBuild, settleBuild)
          Effect.runSync(Scope.addFinalizer(scope, Effect.sync(settleBuild)))
        }
      }
    }

    // Hydration: the Model the server rendered this path with, unless it deferred the path.
    const fromServer: Option.Option<unknown> = hydrating !== undefined &&
        (parent === undefined || parent.adoptsChildren) &&
        !hydrating.deferred.has(path) &&
        Object.hasOwn(hydrating.state, path)
      ? jsonCodecOf(component.model).decode(hydrating.state[path])
      : Option.none()
    const pendingPositions = Option.isSome(fromServer) ? hydrating!.pending[path] ?? [] : []

    /**
     * Runs `init` and renders. An instance adopting a Model (from the server, or from
     * history restore) replays `init` only for its Commands: the adopted Model wins, events
     * are dropped, and server Commands are skipped unless the server lists them as pending.
     * Given the server's nodes, it adopts them when its view matches, and otherwise builds fresh.
     */
    const begin = (range: Range | undefined, serverModel: Option.Option<unknown>) => {
      const first = guard(inst, "init", () => {
        const elements = component.elements()
        if (elements !== undefined && host.elements !== "any" && !host.elements.includes(elements.name)) {
          throw new Error(
            `${component.name} renders ${elements.name} elements, and this host shows ${host.elements.join(", ")}`
          )
        }
        return component.init(inst.props)
      })
      let adopted = serverModel
      if (first !== undefined && Option.isNone(adopted) && hooks !== undefined) {
        const restored = hooks.restore(path)
        if (restored !== undefined) adopted = jsonCodecOf(component.model).decode(restored)
      }
      const pendingSet = new Set(Option.isSome(serverModel) ? pendingPositions : [])
      const skipped = (command: Command.Command<any, any>, index: number) =>
        Option.isSome(adopted) && isReplayDropped(command) && !pendingSet.has(index)
      let mountedSeq = -1
      if (first !== undefined) {
        inst.model = Option.isSome(adopted) ? adopted.value : first.model
        inst.adoptsChildren = Option.isSome(serverModel)
        mountedSeq = record({
          _tag: "Mounted",
          path,
          component,
          props: inst.props,
          model: inst.model,
          commands: first.commands,
          events: first.events,
          adopted: Option.isSome(adopted)
        })
        first.commands.forEach((command, index) => {
          if (!skipped(command, index)) return
          record({
            _tag: "CommandDropped",
            path,
            name: command.name,
            issued: { seq: mountedSeq, index },
            reason: "adopted"
          })
        })
        for (const position of pendingSet) {
          if (position >= first.commands.length) {
            forkNow(
              ctx,
              Effect.logWarning(
                `${path}: the server lists init's Command ${position} as pending, and init issued ${first.commands.length}. init isn't deterministic.`
              )
            )
          }
        }
      }
      logEarly()
      if (first === undefined) return
      const tree = guard(inst, "view", () => component.view(inst.model, inst.props))
      if (tree === undefined) return
      const plan = range !== undefined && Option.isSome(serverModel) ? matchList(inst, [tree], range.nodes) : undefined
      const rendered = guard(
        inst,
        "view",
        () => plan !== undefined ? adoptNode(inst, tree, plan[0]!, inst.env) : create(inst, tree, inst.env)
      )
      if (rendered === undefined) return
      if (plan !== undefined) {
        // Adopted: the markers go, and the server's nodes are the instance's.
        range!.claimed = true
        host.remove(range!.open)
        host.remove(range!.close)
      }
      inst.rendered = [rendered]
      updateHead(inst)
      if (hydrating !== undefined) inst.adoptionHead = inst.head
      if (inst.failure !== undefined) return
      if (Option.isSome(adopted)) {
        apply(inst, { model: inst.model, commands: [], events: [] }, mountedSeq, true)
        first.commands.forEach((command, index) => {
          if (!skipped(command, index)) issue(inst, command, { seq: mountedSeq, index }, index)
        })
      } else apply(inst, first, mountedSeq, true)
    }

    if (failedEarly !== undefined) {
      constructing = false
      logEarly()
      failInstance(inst, failedEarly, "layer")
      return inst
    }

    // Hydration: an instance whose provided Layer is still building keeps the server's nodes, inert,
    // and adopts them once the Layer is ready. If the Layer fails and the component handles it,
    // the instance is built fresh and gets its failure message.
    if (
      range !== undefined && Option.isSome(fromServer) && component.layer !== undefined &&
      inst.env.ctx === undefined && inst.env.failure === undefined
    ) {
      const raw: Rendered = { _tag: "Text", v: emptyText, node: undefined }
      inst.waiting = true
      waiting++
      range.claimed = true
      inst.rendered = [range.open, ...range.nodes, range.close].map((node) => ({ ...raw, node }))
      const resume = (adopt: boolean) => {
        if (inst.closed || !inst.waiting) return
        inst.waiting = false
        const nodes = inst.rendered.flatMap(nodesOf)
        inst.rendered = []
        range.claimed = false
        begin(range, adopt ? fromServer : Option.none())
        if (!range.claimed) {
          // Rebuilt: the new nodes take the server's place.
          const parentNode = host.parentOf(range.open)
          if (inst.failure === undefined && parentNode !== undefined) {
            for (const node of inst.rendered.flatMap(nodesOf)) host.insertBefore(parentNode, node, range.open)
          }
          for (const node of nodes) host.remove(node)
        }
        headDirty = true
        settleWaiting()
      }
      whenReady(inst.env, () => defer(() => resume(true)), () => {
        if (component.layerFailure !== undefined) defer(() => resume(false))
      })
      constructing = false
      return inst
    }

    begin(range, fromServer)
    constructing = false
    return inst
  }

  const apply = (inst: Instance, next: Component.Next<any, any, any, any>, entrySeq: number, initial: boolean) => {
    inst.model = next.model
    next.commands.forEach((command, index) =>
      issue(inst, command, { seq: entrySeq, index }, initial ? index : undefined)
    )
    if (!initial) markDirty(inst)
    syncSubscriptions(inst)
    if (next.events.length === 0) return
    const parent = inst.parent
    const deliver = () => {
      for (const emitted of next.events) {
        if (inst.closed) return
        if (parent === undefined) {
          rootEmitted.push(emitted)
          continue
        }
        const message = guard(parent, "onEmit", () => inst.onEmit(emitted))
        if (message !== undefined) parent.dispatch(message, { _tag: "Emit", path: inst.path, seq: entrySeq })
      }
    }
    // An emit from `init` waits until the parent, which is still being built, has its first Model.
    if (initial) defer(deliver)
    else deliver()
  }

  // -- Commands -------------------------------------------------------------
  const entriesOf = (inst: Instance): Array<schedule.Entry<Run>> => inst.runs.map(entryOf)
  const entryOf = (run: Run): schedule.Entry<Run> => ({
    name: run.command.name,
    key: run.command.key,
    mode: run.command.mode,
    status: run.status,
    value: run
  })

  /** `initIndex` is the Command's position among those `init` returned, or `undefined` for `update`'s. */
  const issue = (
    inst: Instance,
    command: Command.Command<any, any>,
    issued: MessageLog.Issued,
    initIndex: number | undefined
  ) => {
    if (server !== undefined) {
      // On the server only `init`'s server Commands run. The rest run on the client.
      if (command._tag === "Interrupt") {
        if (initIndex === undefined) return
      } else if (initIndex === undefined || !command.server || inst.env.never) {
        record({ _tag: "CommandDropped", path: inst.path, name: command.name, issued, reason: "server" })
        if (initIndex === undefined) warnDropped(inst, command.name)
        return
      } else {
        inst.serverPending.add(initIndex)
        // With the budget spent, or none, it stays pending for the client.
        if (!serverStarts) return
      }
    }
    const decision = schedule.schedule(entriesOf(inst), command)
    for (const entry of decision.interrupt) stopRun(inst, entry.value)
    if (command._tag === "Interrupt") return
    switch (decision.action) {
      case "start":
      case "queue": {
        const run: Run = {
          command,
          issued,
          initIndex,
          status: decision.action === "start" ? "running" : "queued",
          fiber: undefined,
          done: false
        }
        inst.runs.push(run)
        if (server !== undefined) active++
        if (run.status === "running") startRun(inst, run)
        return
      }
      case "drop": {
        if (initIndex !== undefined) inst.serverPending.delete(initIndex)
        record({ _tag: "CommandDropped", path: inst.path, name: command.name, issued, reason: "mode" })
        return
      }
    }
  }

  const removeRun = (inst: Instance, run: Run) => {
    run.done = true
    const index = inst.runs.indexOf(run)
    if (index >= 0) inst.runs.splice(index, 1)
    if (server !== undefined) {
      active--
      checkIdle()
    }
  }

  const warnDropped = (inst: Instance, name: string) => {
    const key = `${inst.component.name}\u0000${name}`
    if (warnedDrops.has(key)) return
    warnedDrops.add(key)
    forkNow(
      ctx,
      Effect.logWarning(
        `${inst.component.name}'s update issued ${name} during server rendering, and it was dropped. Only init's server Commands run on the server.`
      )
    )
  }

  /** Starts the next queued run of the same group, if nothing in it is running any more. */
  const promote = (inst: Instance, ended: Run) => {
    if (inst.closed || ended.status !== "running") return
    const next = schedule.next(entriesOf(inst), entryOf(ended))
    if (next === undefined) return
    next.value.status = "running"
    startRun(inst, next.value)
  }

  const stopRun = (inst: Instance, run: Run) => {
    if (run.done) return
    if (run.initIndex !== undefined && !frozen) inst.serverPending.delete(run.initIndex)
    removeRun(inst, run)
    run.fiber?.interruptUnsafe()
    record({ _tag: "CommandInterrupted", path: inst.path, name: run.command.name, issued: run.issued })
    promote(inst, run)
  }

  const startRun = (inst: Instance, run: Run) => {
    const go = (envCtx: Context.Context<any>) => {
      if (run.done || inst.closed || frozen) return
      const command = run.command
      const context = Context.add(Context.add(envCtx, Scope.Scope, inst.scope), services.Refs, refsOf(inst))
      const program = Effect.useSpan(
        command.name,
        { attributes: { path: inst.path, mode: command.mode } },
        (span) => {
          const source: MessageLog.Source = {
            _tag: "Command",
            name: command.name,
            issued: run.issued,
            spanId: span.spanId,
            traceId: span.traceId
          }
          const send = (message: unknown) =>
            Effect.sync(() => {
              if (!run.done) inst.dispatch(message, source)
            })
          return command._tag === "Effect"
            ? Effect.flatMap(command.effect, send)
            : Stream.runForEach(command.stream, send)
        }
      )
      const fiber = forkLater(context, program)
      run.fiber = fiber
      fiber.addObserver((exit) => {
        if (run.done) return
        removeRun(inst, run)
        if (Exit.isSuccess(exit)) {
          if (run.initIndex !== undefined) inst.serverPending.delete(run.initIndex)
          record({ _tag: "CommandEnded", path: inst.path, name: command.name, issued: run.issued })
        } else if (Cause.hasInterruptsOnly(exit.cause)) {
          record({ _tag: "CommandInterrupted", path: inst.path, name: command.name, issued: run.issued })
        } else {
          failInstance(inst, exit.cause, "command", command.name)
          return
        }
        promote(inst, run)
      })
    }
    // After a handled Layer failure, work runs against the parent's services.
    if (inst.env.failure !== undefined) go(settled(inst.env).ctx!)
    else whenReady(inst.env, go, () => stopRun(inst, run))
  }

  // -- Subscriptions --------------------------------------------------------
  const syncSubscriptions = (inst: Instance) => {
    const subscriptions = inst.component.subscriptions
    // Subscriptions never run on the server, and a waiting slot has no Model yet.
    if (inst.closed || inst.waiting || server !== undefined || subscriptions === undefined) return
    const wanted = guard(inst, "subscription", () => subscriptions(inst.model, inst.props))
    if (wanted === undefined) return
    const byKey = new Map<string, Subscription.Subscription<any, any>>()
    for (const subscription of wanted) {
      if (!byKey.has(subscription.key)) byKey.set(subscription.key, subscription)
    }
    // Close first, so `room:1` and `room:2` are never both connected.
    for (const [key, running] of inst.subscriptions) {
      if (byKey.has(key)) continue
      inst.subscriptions.delete(key)
      record({ _tag: "SubscriptionStopped", path: inst.path, key })
      closeScope(running.scope)
    }
    for (const [key, subscription] of byKey) {
      if (inst.subscriptions.has(key)) continue
      const running: SubscriptionRun = { scope: Scope.forkUnsafe(inst.scope, "sequential"), fiber: undefined }
      inst.subscriptions.set(key, running)
      record({ _tag: "SubscriptionStarted", path: inst.path, key })
      const go = (envCtx: Context.Context<any>) => {
        if (inst.closed || inst.subscriptions.get(key) !== running) return
        const source: MessageLog.Source = { _tag: "Subscription", key }
        const fiber = forkLater(
          Context.add(envCtx, Scope.Scope, running.scope),
          Stream.runForEach(subscription.stream, (message) =>
            Effect.sync(() => {
              ;(subscription as { readonly [services.onDeliver]?: (message: unknown) => void })[services.onDeliver]?.(
                message
              )
              inst.dispatch(message, source)
            }))
        )
        running.fiber = fiber
        Effect.runSync(Scope.addFinalizer(running.scope, Effect.sync(() => fiber.interruptUnsafe())))
        // A Stream that ends stays stopped until its key leaves and comes back.
        fiber.addObserver((exit) => {
          if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
            failInstance(inst, exit.cause, "subscription", key)
          }
        })
      }
      if (inst.env.failure !== undefined) go(settled(inst.env).ctx!)
      else whenReady(inst.env, go)
    }
  }

  // -- refs and mounts ------------------------------------------------------
  const findRef = (rendered: Rendered, key: string): unknown =>
    rendered._tag === "Element"
      ? rendered.v.refKey === key
        ? rendered.node
        : firstDefined(rendered.children, (child) => findRef(child, key))
      : rendered._tag === "Slot"
      ? findRef(rendered.inner, key)
      : undefined
  const firstDefined = <A>(items: ReadonlyArray<A>, f: (item: A) => unknown): unknown => {
    for (const item of items) {
      const found = f(item)
      if (found !== undefined) return found
    }
    return undefined
  }

  const refsOf = (inst: Instance): Renderer.Refs => ({
    lookup: <Node>(ref: Renderer.Ref<Node>) =>
      Effect.callback<Option.Option<Node>>((resume) => {
        afterCommit(() => {
          const node = inst.closed ? undefined : firstDefined(inst.rendered, (rendered) => findRef(rendered, ref.key))
          resume(Effect.succeed(Option.fromUndefinedOr(node as Node | undefined)))
        })
      })
  })

  // Mount Scopes of removed elements. Closing a Scope is asynchronous, so a mount that was waiting
  // for its commit or its Layer checks this before it starts.
  const removedMounts = new WeakSet<Scope.Closeable>()

  const startMount = (inst: Instance, mount: View.Mount<any>, node: unknown, env: Env) => {
    if (!host.runsMounts) return undefined
    const mountScope = Scope.forkUnsafe(inst.scope, "sequential")
    afterCommit(() =>
      whenReady(env, (envCtx) => {
        if (inst.closed || removedMounts.has(mountScope)) return
        const source: MessageLog.Source = { _tag: "Mount", name: mount.name }
        const fiber = forkNow(
          Context.add(Context.add(envCtx, Scope.Scope, mountScope), services.Refs, refsOf(inst)),
          Effect.flatMap(Effect.suspend(() => mount.run(node)), (message) =>
            Effect.sync(() => inst.dispatch(message, source)))
        )
        Effect.runSync(Scope.addFinalizer(
          mountScope,
          Effect.sync(() =>
            fiber.interruptUnsafe()
          )
        ))
        fiber.addObserver((exit) => {
          if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
            failInstance(inst, exit.cause, "mount", mount.name)
          }
        })
      })
    )
    return mountScope
  }

  // -- create ---------------------------------------------------------------
  const render = (inst: Instance) => {
    if (inst.waiting) return
    guard(inst, "view", () => {
      const tree = inst.component.view(inst.model, inst.props)
      const old = inst.rendered.flatMap(nodesOf)
      const parentNode = host.parentOf(old[0])!
      const ref = host.nextOf(old[old.length - 1])
      inst.rendered = patchList(inst, parentNode, inst.rendered, [tree], ref, inst.env)
    })
    if (!inst.closed) updateHead(inst)
  }

  const create = (inst: Instance, view: View.Node<any, any>, env: Env): Rendered => {
    switch (view._tag) {
      case "Text":
        return { _tag: "Text", v: view, node: host.createText(view.text) }
      case "Element": {
        const node = host.createElement(view.tag)
        for (const name in view.attrs) host.setAttr(node, name, view.attrs[name])
        host.setEvents(node, view.handlers, inst.fire)
        const children = view.children.map((child) => create(inst, child, env))
        place(node, children, undefined)
        // Properties go after the children, so a `select`'s `value` has its options to match.
        for (const name in view.props) host.setProp(node, name, view.props[name])
        return {
          _tag: "Element",
          v: view,
          node,
          children,
          mountScope: view.mount !== undefined ? startMount(inst, view.mount, node, env) : undefined
        }
      }
      case "Child":
        return createChild(inst, view, env)
    }
  }

  const createChild = (inst: Instance, view: View.Child<any, any>, env: Env, range?: Range): Rendered => {
    const target = view.component
    if (Feature.isService(target) && env.ctx === undefined) {
      // The feature's service comes from a Layer that is still building, or failed. The slot shows
      // `fallback`, rendered against the nearest settled Env, and re-renders when the Layer settles.
      if (view.fallback === undefined) {
        throw new Error(
          `${inst.path}: ${target.key} isn't available, because a Layer above it is still building or failed. Pass \`fallback\` to \`h.child\`.`
        )
      }
      if (env.failure === undefined) {
        const rerender = () => {
          if (!inst.closed) markDirty(inst)
        }
        whenReady(env, rerender, rerender)
      }
      if (range !== undefined) removeRange(range)
      return {
        _tag: "Slot",
        v: view,
        inner: create(inst, view.fallback(unavailable(env)), settled(env)),
        failure: undefined
      }
    }
    let component: Component.Any
    let childEnv = env
    if (Feature.isService(target)) {
      const found = Context.getOption(env.ctx!, target)
      if (Option.isNone(found)) throw new Error(`${inst.path}: nothing provides ${target.key}`)
      component = found.value.component
      // The Context that closed the implementation's requirements wins over the mount position's.
      childEnv = readyEnv(Context.merge(env.ctx!, found.value.context), env)
    } else {
      component = target
    }
    const path = `${inst.path}/${childName(target)}[${view.key}]`
    const child = makeInstance(component, view.props, path, inst, childEnv, view.onEmit, view.onFailure, range)
    // Built fresh: the server's nodes go, and the parent places the new ones.
    if (range !== undefined && !range.claimed) removeRange(range)
    if (child.failure !== undefined) {
      // Failed while mounting: the slot shows its fallback in the placeholder's place.
      const nodes = child.rendered.flatMap(nodesOf)
      for (const node of nodes) host.remove(node)
      return failedSlot(inst, view, child.failure, env)
    }
    inst.children.set(path, child)
    return { _tag: "Child", v: view, inst: child }
  }

  const fallbackFor = (view: View.Child<any, any>, failure: Cause.Cause<unknown>): View.Node<any, any> =>
    view.fallback !== undefined ? view.fallback(AsyncResult.failure(failure)) : emptyText

  const failedSlot = (
    inst: Instance,
    view: View.Child<any, any>,
    failure: Cause.Cause<unknown>,
    env: Env
  ): Rendered => {
    const shown = guard(inst, "fallback", () => fallbackFor(view, failure)) ?? emptyText
    return { _tag: "Slot", v: view, inner: create(inst, shown, settled(env)), failure }
  }

  // -- hydration ------------------------------------------------------------
  /** The range that starts at `open`, the marker for `path`, up to its closing marker. */
  const rangeFrom = (open: unknown, path: string): Range | undefined => {
    const nodes: Array<unknown> = []
    for (let node = host.nextOf(open); node !== undefined; node = host.nextOf(node)) {
      const kind = hydration!.inspect(node)
      if (kind._tag === "Close" && kind.path === path) return { open, close: node, nodes, claimed: false }
      nodes.push(node)
    }
    return undefined
  }

  const removeRange = (range: Range) => {
    host.remove(range.open)
    for (const node of range.nodes) host.remove(node)
    host.remove(range.close)
  }

  const childNodes = (node: unknown): Array<unknown> => {
    const out: Array<unknown> = []
    for (let child = hydration!.firstChild(node); child !== undefined; child = host.nextOf(child)) out.push(child)
    return out
  }

  /**
   * Matches a view against the server's nodes: the instance's own nodes one by
   * one, and each child slot by its marker range, which the child matches
   * itself. A server never writes an empty text node, so an empty text matches
   * nothing and is created.
   */
  const matchList = (
    inst: Instance,
    views: ReadonlyArray<View.Node<any, any>>,
    nodes: ReadonlyArray<unknown>
  ): Array<Plan> | undefined => {
    const out: Array<Plan> = []
    let index = 0
    for (const view of views) {
      const node = nodes[index]
      const kind = node === undefined ? undefined : hydration!.inspect(node)
      switch (view._tag) {
        case "Text": {
          if (kind?._tag === "Text") {
            if (kind.text !== view.text) return undefined
            out.push({ _tag: "Text", node })
            index++
          } else if (view.text === "") {
            out.push({ _tag: "Text", node: undefined })
          } else {
            return undefined
          }
          break
        }
        case "Element": {
          if (kind?._tag !== "Element" || kind.tag !== view.tag) return undefined
          // Content the host parses as text has no nodes or markers to adopt, so its children are built fresh.
          const children = kind.textOnly === true ? undefined : matchList(inst, view.children, childNodes(node))
          if (children === undefined && kind.textOnly !== true) return undefined
          out.push({ _tag: "Element", node, children })
          index++
          break
        }
        case "Child": {
          const path = `${inst.path}/${childName(view.component)}[${view.key}]`
          if (kind?._tag !== "Open" || kind.path !== path) return undefined
          const range = rangeFrom(node, path)
          if (range === undefined) return undefined
          out.push({ _tag: "Child", range })
          index += range.nodes.length + 2
          break
        }
      }
    }
    return index === nodes.length ? out : undefined
  }

  /** Like `create`, but takes the server's nodes a matched view points at. */
  const adoptNode = (inst: Instance, view: View.Node<any, any>, plan: Plan, env: Env): Rendered => {
    switch (view._tag) {
      case "Text": {
        const node = (plan as Extract<Plan, { _tag: "Text" }>).node
        return { _tag: "Text", v: view, node: node ?? host.createText(view.text) }
      }
      case "Element": {
        const { children: plans, node } = plan as Extract<Plan, { _tag: "Element" }>
        for (const name in view.attrs) {
          if (hydration!.getAttr(node, name) !== view.attrs[name]) host.setAttr(node, name, view.attrs[name])
        }
        host.setEvents(node, view.handlers, inst.fire)
        if (plans === undefined) { for (const child of childNodes(node)) host.remove(child) }
        const children = plans === undefined
          ? view.children.map((child) => create(inst, child, env))
          : view.children.map((child, index) => adoptNode(inst, child, plans[index]!, env))
        place(node, children, undefined)
        for (const name in view.props) host.setProp(node, name, view.props[name])
        return {
          _tag: "Element",
          v: view,
          node,
          children,
          mountScope: view.mount !== undefined ? startMount(inst, view.mount, node, env) : undefined
        }
      }
      case "Child":
        return createChild(inst, view, env, (plan as Extract<Plan, { _tag: "Child" }>).range)
    }
  }

  // -- diff -----------------------------------------------------------------
  const keyOf = (view: View.Node<any, any>, index: number): string =>
    view._tag === "Child"
      ? `c:${childName(view.component)}[${view.key}]`
      : view._tag === "Element" && view.elementKey !== undefined
      ? `e:${view.tag}[${view.elementKey}]`
      : `p:${index}`

  const same = (rendered: Rendered, view: View.Node<any, any>): boolean => {
    switch (rendered._tag) {
      case "Slot":
      case "Child":
        return view._tag === "Child" && rendered.v.component === view.component
      case "Element":
        return view._tag === "Element" && rendered.v.tag === view.tag
      case "Text":
        return view._tag === "Text"
    }
  }

  const patchList = (
    inst: Instance,
    parentNode: unknown,
    olds: Array<Rendered>,
    news: ReadonlyArray<View.Node<any, any>>,
    ref: unknown,
    env: Env
  ): Array<Rendered> => {
    const byKey = new Map<string, Rendered>()
    olds.forEach((rendered, index) => byKey.set(keyOf(rendered.v, index), rendered))
    const seen = new Set<string>()
    const result = news.map((view, index) => {
      const key = keyOf(view, index)
      if (seen.has(key)) throw new Error(`${inst.path}: two siblings share the key ${key.slice(2)}`)
      seen.add(key)
      const old = byKey.get(key)
      if (old !== undefined && same(old, view)) {
        byKey.delete(key)
        return patch(inst, old, view, env)
      }
      return create(inst, view, env)
    })
    for (const gone of byKey.values()) destroy(inst, gone)
    place(parentNode, result, ref)
    return result
  }

  const patchProps = (
    node: unknown,
    prev: Readonly<Record<string, unknown>>,
    next: Readonly<Record<string, unknown>>
  ) => {
    for (const name in prev) {
      if (!(name in next)) host.setProp(node, name, undefined)
    }
    for (const name in next) {
      // A controlled property is re-applied: the user may have changed the live value since.
      if (prev[name] !== next[name] || controlled.has(name)) host.setProp(node, name, next[name])
    }
  }

  const patch = (inst: Instance, rendered: Rendered, view: View.Node<any, any>, env: Env): Rendered => {
    switch (rendered._tag) {
      case "Text": {
        const text = view as View.Text
        if (text.text !== rendered.v.text) host.setText(rendered.node, text.text)
        return { _tag: "Text", v: text, node: rendered.node }
      }
      case "Element": {
        const element = view as View.Element<any, any>
        const prev = rendered.v
        for (const name in prev.attrs) {
          if (!(name in element.attrs)) host.setAttr(rendered.node, name, undefined)
        }
        for (const name in element.attrs) {
          if (prev.attrs[name] !== element.attrs[name]) host.setAttr(rendered.node, name, element.attrs[name])
        }
        if (element.handlers !== prev.handlers) host.setEvents(rendered.node, element.handlers, inst.fire)
        const children = patchList(inst, rendered.node, rendered.children, element.children, undefined, env)
        patchProps(rendered.node, prev.props, element.props)
        // A mount belongs to the element, not to one view run: it keeps running across patches.
        return { _tag: "Element", v: element, node: rendered.node, children, mountScope: rendered.mountScope }
      }
      case "Slot": {
        const child = view as View.Child<any, any>
        if (rendered.failure !== undefined) {
          const shown = guard(inst, "fallback", () => fallbackFor(child, rendered.failure!)) ?? emptyText
          return {
            _tag: "Slot",
            v: child,
            inner: patchOrReplace(inst, rendered.inner, shown, settled(env)),
            failure: rendered.failure
          }
        }
        if (env.ctx !== undefined) {
          // Ready now: the fallback goes, and the feature mounts in its place.
          destroy(inst, rendered.inner)
          return createChild(inst, child, env)
        }
        const shown = child.fallback!(unavailable(env))
        return {
          _tag: "Slot",
          v: child,
          inner: patchOrReplace(inst, rendered.inner, shown, settled(env)),
          failure: undefined
        }
      }
      case "Child": {
        const child = view as View.Child<any, any>
        const instance = rendered.inst
        if (instance.closed) {
          for (const node of nodesOf(rendered)) host.remove(node)
          // Failed: the slot shows its fallback until the key changes.
          if (instance.failure !== undefined) return failedSlot(inst, child, instance.failure, env)
          return createChild(inst, child, env)
        }
        instance.onEmit = child.onEmit
        instance.onFailure = child.onFailure
        if (!propsEqual(child.props, instance.props)) {
          instance.props = child.props
          dirty.delete(instance)
          render(instance)
          syncSubscriptions(instance)
        }
        return { _tag: "Child", v: child, inst: instance }
      }
    }
  }

  /** Patches a single root (a view's or a fallback's), which is kept only if its key matches too. */
  const patchOrReplace = (inst: Instance, rendered: Rendered, view: View.Node<any, any>, env: Env): Rendered => {
    if (same(rendered, view) && keyOf(rendered.v, 0) === keyOf(view, 0)) return patch(inst, rendered, view, env)
    const next = create(inst, view, env)
    const nodes = nodesOf(rendered)
    const parentNode = nodes.length > 0 ? host.parentOf(nodes[0]) : undefined
    if (parentNode !== undefined) place(parentNode, [next], nodes[0])
    destroy(inst, rendered)
    return next
  }

  const nodesOf = (rendered: Rendered): Array<unknown> =>
    rendered._tag === "Child"
      ? rendered.inst.rendered.flatMap(nodesOf)
      : rendered._tag === "Slot"
      ? nodesOf(rendered.inner)
      : [rendered.node]

  /** Puts each item's nodes before `ref`, last first, moving only what's out of place. */
  const place = (parentNode: unknown, items: ReadonlyArray<Rendered>, ref: unknown) => {
    let next = ref
    for (let index = items.length - 1; index >= 0; index--) {
      const nodes = nodesOf(items[index]!)
      if (nodes.length === 0) continue
      const last = nodes[nodes.length - 1]
      if (host.parentOf(last) !== parentNode || host.nextOf(last) !== next) {
        for (const node of nodes) host.insertBefore(parentNode, node, next)
      }
      next = nodes[0]
    }
  }

  const closeAll = (inst: Instance, rendered: Rendered): void => {
    switch (rendered._tag) {
      case "Child": {
        inst.children.delete(rendered.inst.path)
        headDirty = true
        closeScope(rendered.inst.scope)
        return
      }
      case "Slot":
        return closeAll(inst, rendered.inner)
      case "Element": {
        // The element's `onMount` work ends with it.
        if (rendered.mountScope !== undefined) {
          removedMounts.add(rendered.mountScope)
          closeScope(rendered.mountScope)
        }
        for (const child of rendered.children) closeAll(inst, child)
        return
      }
      case "Text":
        return
    }
  }

  /** Scope first: it interrupts in-flight work and unmounts descendants. Then the nodes go, once. */
  const destroy = (inst: Instance, rendered: Rendered) => {
    const nodes = nodesOf(rendered)
    closeAll(inst, rendered)
    for (const node of nodes) host.remove(node)
  }

  // -- root -----------------------------------------------------------------
  record({ _tag: "SessionStarted", path: `/${component.name}`, app: component.name })
  // Registered before the root instance forks its Scope from `rootScope`: finalizers run in
  // reverse, so every instance Scope (and its Layers' finalizers) closes before the nodes go.
  let rootRendered: () => ReadonlyArray<Rendered> = () => []
  Effect.runSync(Scope.addFinalizer(
    rootScope,
    Effect.sync(() => {
      for (const node of rootRendered().flatMap(nodesOf)) host.remove(node)
      for (const node of rootFallbackNodes) host.remove(node)
      rootFallbackNodes = []
      host.commit?.()
      // The tree's entries go with it, so the host puts the shell's values back.
      if (merged !== Head.empty) {
        merged = Head.empty
        host.head?.(merged)
      }
    })
  ))
  // Hydration: the root's range among the container's nodes, which may hold more than the app.
  const rootPath = `/${component.name}`
  let rootRange: Range | undefined
  let rootRef: unknown = undefined
  if (hydrating !== undefined && hydration !== undefined) {
    for (let node = hydration.firstChild(container); node !== undefined; node = host.nextOf(node)) {
      const kind = hydration.inspect(node)
      if (kind._tag === "Open" && kind.path === rootPath) {
        rootRange = rangeFrom(node, rootPath)
        break
      }
    }
    if (rootRange !== undefined) rootRef = host.nextOf(rootRange.close)
  }
  const root = makeInstance(
    component,
    rootProps,
    rootPath,
    undefined,
    readyEnv(ctx),
    () => undefined,
    undefined,
    rootRange
  )
  if (rootRange !== undefined && !rootRange.claimed) removeRange(rootRange)
  rootRendered = () => root.rendered
  rootInstance = root
  if (root.failure === undefined) place(container, root.rendered, rootRef)
  started = true
  if (waiting === 0 && !adoptedDone) {
    adoptedDone = true
    hydrating = undefined
    reportAdoption()
  }
  mergeHead()
  host.commit?.()

  const snapshot = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    const visit = (inst: Instance) => {
      if (inst.closed || inst.failure !== undefined || inst.waiting) return
      const encoded = jsonCodecOf(inst.component.model).encode(inst.model)
      if (Option.isSome(encoded)) out[inst.path] = encoded.value
      for (const child of inst.children.values()) visit(child)
    }
    visit(root)
    return out
  }
  if (hooks !== undefined) {
    handle = { container, flush: () => flushes, snapshot }
    const detach = hooks.attach(handle)
    Effect.runSync(Scope.addFinalizer(rootScope, Effect.sync(detach)))
  }
  afterCommitHooks()
  rendering = false
  runCommitted()

  const find = (path: string, from: Instance = root): Instance | undefined => {
    if (from.path === path) return from
    for (const child of from.children.values()) {
      const hit = find(path, child)
      if (hit !== undefined) return hit
    }
    return undefined
  }

  /** Serialises the tree once, in document order, with the state the client adopts. */
  const finish = () => {
    serverStarts = false
    if (scheduled || dirty.size > 0 || deferred.length > 0) flush()
    frozen = true
    const state: Record<string, unknown> = {}
    const deferredPaths: Array<string> = []
    const pendingPaths: Record<string, ReadonlyArray<number>> = {}
    // `under`: inside a deferred instance, whose subtree the client builds fresh.
    const instance = (inst: Instance, under: boolean): Renderer.ServerNode => {
      let inner = under
      if (!under) {
        const encoded = inst.failure !== undefined ||
            inst.deferred ||
            (inst.component.layer !== undefined && inst.env.ctx === undefined)
          ? Option.none()
          : jsonCodecOf(inst.component.model).encode(inst.model)
        if (Option.isNone(encoded)) {
          deferredPaths.push(inst.path)
          inner = true
        } else {
          state[inst.path] = encoded.value
          if (inst.serverPending.size > 0) pendingPaths[inst.path] = [...inst.serverPending].sort((a, b) => a - b)
        }
      }
      return {
        _tag: "Range",
        path: inst.path,
        children: inst.failure !== undefined ? [] : inst.rendered.map((rendered) => serialize(inst, rendered, inner))
      }
    }
    const serialize = (inst: Instance, rendered: Rendered, under: boolean): Renderer.ServerNode => {
      switch (rendered._tag) {
        case "Text":
          return { _tag: "Text", text: rendered.v.text }
        case "Element":
          return {
            _tag: "Element",
            tag: rendered.v.tag,
            attrs: rendered.v.attrs,
            props: rendered.v.props,
            children: rendered.children.map((child) => serialize(inst, child, under))
          }
        case "Child":
          return instance(rendered.inst, under)
        case "Slot": {
          // A failed child, or a feature whose Layer isn't ready: the client builds it fresh.
          const path = `${inst.path}/${childName(rendered.v.component)}[${rendered.v.key}]`
          if (!under) deferredPaths.push(path)
          return { _tag: "Range", path, children: [serialize(inst, rendered.inner, true)] }
        }
      }
    }
    const nodes = [instance(root, false)]
    return { nodes, state: { ...state, "~deferred": deferredPaths, "~pending": pendingPaths } }
  }

  const pendingOf = (
    inst: Instance
  ): Array<{ readonly path: string; readonly name: string; readonly status: string }> => [
    ...inst.runs.map((run) => ({ path: inst.path, name: run.command.name, status: run.status })),
    ...[...inst.children.values()].flatMap(pendingOf)
  ]

  return {
    path: root.path,
    session,
    instance: root,
    emitted: rootEmitted,
    find,
    model: () => root.failure === undefined ? root.model : undefined,
    send: (message) => root.dispatch(message, { _tag: "Dispatch" }),
    pending: () => pendingOf(root),
    flush: () => flushes,
    buildsPendingSince,
    head: () => merged,
    adopted: Effect.callback<void>((resume) => {
      if (adoptedDone) resume(Effect.void)
      else adoptedWaiters.push(() => resume(Effect.void))
    }),
    whenIdle: (f) => {
      idleWaiters.push(f)
      checkIdle()
    },
    finish
  }
}

/**
 * The runtime: instances, their Scopes, Commands, Subscriptions and provided
 * Layers, and the component-bounded virtual DOM that keeps a host in step.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Exit from "../../Exit.ts"
import type * as Fiber from "../../Fiber.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Scheduler from "../../Scheduler.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import type * as Command from "../Command.ts"
import type * as Component from "../Component.ts"
import * as Feature from "../Feature.ts"
import * as MessageLog from "../MessageLog.ts"
import type * as Renderer from "../Renderer.ts"
import type * as Subscription from "../Subscription.ts"
import * as View from "../View.ts"
import * as Executor from "./executor.ts"
import * as schedule from "./schedule.ts"
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
  readonly waiters: Array<{
    readonly ready: (ctx: Context.Context<any>) => void
    readonly failed: ((cause: Cause.Cause<unknown>) => void) | undefined
  }>
}

const readyEnv = (ctx: Context.Context<any>, parent?: Env): Env => ({ ctx, failure: undefined, parent, waiters: [] })
const buildingEnv = (parent: Env): Env => ({ ctx: undefined, failure: undefined, parent, waiters: [] })
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
  readonly command: Command.Effectful<any, any, any> | Command.Streaming<any, any, any>
  readonly issued: MessageLog.Issued
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
  onEmit: (emits: unknown) => unknown
  onFailure: ((failure: AsyncResult.Failure<never, unknown>) => unknown) | undefined
  failure: Cause.Cause<unknown> | undefined
  rendered: Array<Rendered>
  closed: boolean
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
  /** The text of the root's rendered nodes, for diagnostics. */
  readonly pending: () => ReadonlyArray<{ readonly path: string; readonly name: string; readonly status: string }>
}

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

// ---------------------------------------------------------------------------
// mount
// ---------------------------------------------------------------------------

/** @internal */
export const mount = (
  component: Component.Any,
  rootProps: unknown,
  container: unknown,
  options?: {
    readonly fallback?:
      | ((failure: AsyncResult.Failure<never, unknown>, h: any) => View.Node<never, any>)
      | undefined
  }
): Effect.Effect<Root & Renderer.Root<any, any>, never, Scope.Scope | Renderer.Renderer> =>
  Effect.contextWith((ctx: Context.Context<Scope.Scope | Renderer.Renderer>) =>
    Effect.sync(() => start(component, rootProps, container, ctx, options))
  )

const start = (
  component: Component.Any,
  rootProps: unknown,
  container: unknown,
  ctx: Context.Context<any>,
  options:
    | {
      readonly fallback?:
        | ((failure: AsyncResult.Failure<never, unknown>, h: any) => View.Node<never, any>)
        | undefined
    }
    | undefined
): Root & Renderer.Root<any, any> => {
  const host = Context.get(ctx, services.Renderer).host
  const log = Context.get(ctx, MessageLog.MessageLog)
  const executor = Context.get(ctx, Executor.CurrentExecutor)
  const clock = Context.get(ctx, Clock.Clock)
  const rootScope = Context.get(ctx, Scope.Scope)
  const session = `${clock.currentTimeMillisUnsafe().toString(36)}-${(sessions++).toString(36)}`
  const controlled = host.controlled
  const rootEmitted: Array<unknown> = []
  const sharedBuilds = new WeakMap<Env, Map<Layer.Layer<any, any, any>, SharedBuild>>()

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
    host.commit?.()
    rendering = false
    runCommitted()
  }
  const runCommitted = () => {
    const done = committed
    committed = []
    for (const f of done) f()
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
    onEmit: (emits: unknown) => unknown,
    onFailure: ((failure: AsyncResult.Failure<never, unknown>) => unknown) | undefined
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
      onEmit,
      onFailure,
      failure: undefined,
      rendered: [],
      closed: false,
      runs: [],
      subscriptions: new Map(),
      dispatch(message, source) {
        if (inst.closed) return
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
          emits: next.emits
        })
        apply(inst, next, entrySeq, false)
      },
      fire(event, handler, payload) {
        if (inst.closed) return
        const message = typeof handler === "function"
          ? guard(inst, "event", () => (handler as (payload: unknown) => unknown)(payload), event)
          : handler
        if (message !== undefined) inst.dispatch(message, { _tag: "Event", name: event })
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
    let constructing = true
    const early: Array<() => void> = []
    const lifecycle = (draft: Draft) => {
      if (constructing) early.push(() => record(draft))
      else record(draft)
    }
    let failedEarly: Cause.Cause<unknown> | undefined
    let pending = false

    // A provided Layer builds in the background. The instance renders at once; its Commands,
    // Subscriptions and mounts, and its descendants', wait for it.
    if (component.layer !== undefined) {
      const sharedLayer = component.sharedLayer
      const shared = sharedLayer !== undefined ? acquireShared(parentEnv, sharedLayer) : undefined
      const own = shared !== undefined ? shared.env : buildingEnv(parentEnv)
      inst.env = own
      if (shared !== undefined) {
        Effect.runSync(Scope.addFinalizer(scope, Effect.sync(() => releaseShared(parentEnv, sharedLayer!, shared))))
      }
      const fail = (cause: Cause.Cause<unknown>) => {
        if (inst.closed) return
        lifecycle({ _tag: "LayerFailed", path, cause })
        const handle = component.layerFailure
        if (handle === undefined) {
          if (constructing) failedEarly = cause
          else defer(() => failInstance(inst, cause, "layer"))
          return
        }
        // Handled: the component stays mounted and hears about it once. Feature slots below show
        // `fallback`, and Commands waiting for the Layer are interrupted.
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
          const fiber = buildLayer(component.layer!(props), parentCtx, scope, (exit) => {
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
      if (own.ctx === undefined && own.failure === undefined) {
        pending = true
        lifecycle({ _tag: "LayerPending", path })
      }
    }

    const first = failedEarly !== undefined ? undefined : guard(inst, "init", () => {
      const elements = component.elements()
      if (elements !== undefined && host.elements !== "any" && !host.elements.includes(elements.name)) {
        throw new Error(
          `${component.name} renders ${elements.name} elements, and this host shows ${host.elements.join(", ")}`
        )
      }
      return component.init(props)
    })
    let mountedSeq = -1
    if (first !== undefined) {
      inst.model = first.model
      mountedSeq = record({
        _tag: "Mounted",
        path,
        component,
        props,
        model: first.model,
        commands: first.commands,
        emits: first.emits,
        adopted: false
      })
    }
    constructing = false
    for (const f of early) f()
    if (failedEarly !== undefined) {
      failInstance(inst, failedEarly, "layer")
      return inst
    }
    if (first === undefined) return inst
    const tree = guard(inst, "view", () => component.view(inst.model, props))
    if (tree === undefined) return inst
    const rendered = guard(inst, "view", () => create(inst, tree, inst.env))
    if (rendered === undefined) return inst
    inst.rendered = [rendered]
    apply(inst, first, mountedSeq, true)
    return inst
  }

  const apply = (inst: Instance, next: Component.Next<any, any, any, any>, entrySeq: number, initial: boolean) => {
    inst.model = next.model
    next.commands.forEach((command, index) => issue(inst, command, { seq: entrySeq, index }))
    if (!initial) markDirty(inst)
    syncSubscriptions(inst)
    const parent = inst.parent
    for (const emitted of next.emits) {
      if (inst.closed) return
      if (parent === undefined) {
        rootEmitted.push(emitted)
        continue
      }
      const message = guard(parent, "onEmit", () => inst.onEmit(emitted))
      if (message !== undefined) parent.dispatch(message, { _tag: "Emit", path: inst.path, seq: entrySeq })
    }
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

  const issue = (inst: Instance, command: Command.Command<any, any>, issued: MessageLog.Issued) => {
    const decision = schedule.schedule(entriesOf(inst), command)
    for (const entry of decision.interrupt) stopRun(inst, entry.value)
    if (command._tag === "Interrupt") return
    switch (decision.action) {
      case "start":
      case "queue": {
        const run: Run = {
          command,
          issued,
          status: decision.action === "start" ? "running" : "queued",
          fiber: undefined,
          done: false
        }
        inst.runs.push(run)
        if (run.status === "running") startRun(inst, run)
        return
      }
      case "drop": {
        record({ _tag: "CommandDropped", path: inst.path, name: command.name, issued, reason: "mode" })
        return
      }
    }
  }

  const removeRun = (inst: Instance, run: Run) => {
    run.done = true
    const index = inst.runs.indexOf(run)
    if (index >= 0) inst.runs.splice(index, 1)
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
    removeRun(inst, run)
    run.fiber?.interruptUnsafe()
    record({ _tag: "CommandInterrupted", path: inst.path, name: run.command.name, issued: run.issued })
    promote(inst, run)
  }

  const startRun = (inst: Instance, run: Run) => {
    const go = (envCtx: Context.Context<any>) => {
      if (run.done || inst.closed) return
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
    if (inst.closed || subscriptions === undefined) return
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
          Stream.runForEach(subscription.stream, (message) => Effect.sync(() => inst.dispatch(message, source)))
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

  const startMount = (inst: Instance, mount: View.Mount<any>, node: unknown, env: Env) => {
    if (!host.runsMounts) return undefined
    const mountScope = Scope.forkUnsafe(inst.scope, "sequential")
    afterCommit(() =>
      whenReady(env, (envCtx) => {
        if (inst.closed) return
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
    guard(inst, "view", () => {
      const tree = inst.component.view(inst.model, inst.props)
      const old = inst.rendered.flatMap(nodesOf)
      const parentNode = host.parentOf(old[0])!
      const ref = host.nextOf(old[old.length - 1])
      inst.rendered = patchList(inst, parentNode, inst.rendered, [tree], ref, inst.env)
    })
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

  const createChild = (inst: Instance, view: View.Child<any, any>, env: Env): Rendered => {
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
    const child = makeInstance(component, view.props, path, inst, childEnv, view.onEmit, view.onFailure)
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

  const patchOrReplace = (inst: Instance, rendered: Rendered, view: View.Node<any, any>, env: Env): Rendered => {
    if (same(rendered, view)) return patch(inst, rendered, view, env)
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
        closeScope(rendered.inst.scope)
        return
      }
      case "Slot":
        return closeAll(inst, rendered.inner)
      case "Element": {
        // The element's `onMount` work ends with it.
        if (rendered.mountScope !== undefined) closeScope(rendered.mountScope)
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
  const root = makeInstance(
    component,
    rootProps,
    `/${component.name}`,
    undefined,
    readyEnv(ctx),
    () => undefined,
    undefined
  )
  if (root.failure === undefined) place(container, root.rendered, undefined)
  host.commit?.()
  rendering = false
  runCommitted()
  Effect.runSync(Scope.addFinalizer(
    rootScope,
    Effect.sync(() => {
      for (const node of root.rendered.flatMap(nodesOf)) host.remove(node)
      for (const node of rootFallbackNodes) host.remove(node)
      rootFallbackNodes = []
      host.commit?.()
    })
  ))

  const find = (path: string, from: Instance = root): Instance | undefined => {
    if (from.path === path) return from
    for (const child of from.children.values()) {
      const hit = find(path, child)
      if (hit !== undefined) return hit
    }
    return undefined
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
    pending: () => pendingOf(root)
  }
}

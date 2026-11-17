import * as BytePath from "../../BytePath.ts"
import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Predicate from "../../Predicate.ts"
import * as Queue from "../../Queue.ts"
import * as Result from "../../Result.ts"
import * as Scheduler from "../../Scheduler.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as P from "./preparation.ts"
import * as CallerWatch from "./watchSelection.ts"
import type { CallerWatchSelection, Event, Link } from "./watchSelection.ts"

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, index) => byte === b[index])
const Paths = {
  ownedPath: (bytes: Uint8Array) => Result.getOrThrow(BytePath.fromBytes(bytes)),
  ROOT_PATH: new Uint8Array([47])
}
// Consumer continuations must not run inside the synchronous commit listener.
const wakeScheduler = new Scheduler.MixedScheduler("sync")

interface CallerSubscription {
  readonly queue: Queue.Queue<M.Change, M.ReadError | Cause.Done>
  readonly options: CallerWatchSelection
  overflowed: boolean
  selected: Link | undefined
  view: CallerWatch.View
}

const managers = new WeakMap<E.Engine, ReturnType<typeof make>>()

const make = (engine: E.Engine) => {
  const root = engine.root
  const capacity = engine.runtime.limits.watchEvents
  const names = new Map<bigint, Array<Link>>()
  const callers = new Set<CallerSubscription>()
  const add = (object: bigint, link: Link) => {
    const links = names.get(object)
    if (links === undefined) names.set(object, [link])
    else links.push(link)
  }
  const remove = (object: bigint, link: Link) => {
    const links = names.get(object)

    if (links === undefined) return
    const index = links.findIndex((old) => old.parent === link.parent && sameBytes(old.name, link.name))

    if (index >= 0) links.splice(index, 1)

    if (links.length === 0) names.delete(object)
  }

  const path = (link: Link, relativeRoot = root) => {
    const components = [link.name]
    let parent = link.parent

    while (parent !== relativeRoot) {
      const ancestor = names.get(parent)?.[0]

      if (ancestor === undefined) return undefined
      components.push(ancestor.name)
      parent = ancestor.parent
    }

    const length = components.reduce((total, name) => total + name.length + 1, 0)
    const bytes = new Uint8Array(length)
    let offset = 0

    for (const component of components.reverse()) {
      bytes[offset++] = 47
      bytes.set(component, offset)
      offset += component.length
    }

    return bytes
  }

  const rootPath = Paths.ownedPath(Paths.ROOT_PATH)

  const aliases = (id: bigint) =>
    id === root ? [Paths.ROOT_PATH] : (names.get(id) ?? []).flatMap((link) => {
      const value = path(link)

      return value === undefined ? [] : [value]
    })

  const offer = (subscriber: CallerSubscription, change: M.Change, rescan: () => BytePath.BytePath) => {
    const size = Queue.sizeUnsafe(subscriber.queue)

    if (subscriber.overflowed && size > 0) return
    subscriber.overflowed = size >= capacity - 1
    Queue.offerUnsafe(subscriber.queue, subscriber.overflowed ? { _tag: "Rescan", path: rescan() } : change)
  }

  const publish = (batch: ReadonlyArray<M.CommittedMutation>) => {
    const events: Array<Event> = []
    let lastRemoval: { object: bigint; link: Link } | undefined

    for (const action of batch) {
      if (Predicate.isTagged(action, "Update")) {
        lastRemoval = undefined

        if (action.object === root) {
          events.push({
            object: root,
            parent: root,
            path: Paths.ROOT_PATH,
            change: { _tag: "Update", path: rootPath }
          })
        }

        for (const link of names.get(action.object) ?? []) {
          const current = path(link)

          if (current !== undefined) {
            events.push({
              object: action.object,
              parent: link.parent,
              path: current,
              change: { _tag: "Update", path: Paths.ownedPath(current) }
            })
          }
        }

        continue
      }

      const link = { parent: action.parent, name: BytePath.toBytes(action.name) }
      const current = path(link)

      if (Predicate.isTagged(action, "Remove")) {
        lastRemoval = { object: action.object, link }
        remove(action.object, link)
      } else {
        if (action.previous !== undefined) {
          remove(action.previous, link)
        }

        // The feed publishes one rename as adjacent Remove/Create facts for the same object.
        if (lastRemoval?.object === action.object && Predicate.isTagged(action, "Create")) {
          for (const subscriber of callers) {
            if (
              subscriber.options.target === action.object && subscriber.selected?.parent === lastRemoval.link.parent &&
              sameBytes(subscriber.selected.name, lastRemoval.link.name)
            ) subscriber.selected = link
          }
        }

        lastRemoval = undefined
        add(action.object, link)
      }

      if (current !== undefined) {
        const tag = Predicate.isTagged(action, "Replace") ? "Update" : action._tag
        const change: M.Change = { _tag: tag, path: Paths.ownedPath(current) }

        events.push({
          object: action.object,
          parent: link.parent,
          path: current,
          change,
          previous: Predicate.isTagged(action, "Remove") ? undefined : action.previous
        })
      }
    }

    for (const subscriber of callers) {
      const after = CallerWatch.observe(subscriber.options, subscriber.selected, aliases, path)

      if (!("aliases" in after)) {
        callers.delete(subscriber)
        Queue.failCauseUnsafe(subscriber.queue, Cause.fail(after))
        continue
      }

      CallerWatch.deliver(
        subscriber.options,
        subscriber.view,
        after,
        events,
        (change, rescan) => offer(subscriber, change, () => rescan),
        (last, rescan) => {
          for (const change of last) offer(subscriber, change, () => rescan)

          if (subscriber.overflowed) {
            while (Queue.takeUnsafe(subscriber.queue) !== undefined) {
              /* Replace any undelivered prefix with one marker. */
            }

            Queue.offerUnsafe(subscriber.queue, { _tag: "Rescan", path: rescan })
          }

          callers.delete(subscriber)
          Queue.endUnsafe(subscriber.queue)
        }
      )
      subscriber.view = after
    }
    if (callers.size === 0) {
      engine.listeners.delete(publish)
      managers.delete(engine)
    }
  }

  const register = (options: CallerWatchSelection, queue: CallerSubscription["queue"]) => {
    const view = CallerWatch.observe(options, options.selected, aliases, path)
    if (!("aliases" in view)) return Result.fail(view)
    if (view.aliases.length === 0) return Result.fail(new M.AccessDenied({ operation: "watch", reason: "confinement" }))
    const subscriber: CallerSubscription = { options, queue, selected: options.selected, view, overflowed: false }
    callers.add(subscriber)
    engine.listeners.add(publish)
    return Result.succeed(() => {
      callers.delete(subscriber)
      Queue.shutdownUnsafe(queue)
      if (callers.size === 0) {
        engine.listeners.delete(publish)
        if (managers.get(engine) === manager) managers.delete(engine)
      }
    })
  }

  const initialize = (tx: E.Transaction) =>
    Result.gen(function*() {
      for (const node of engine.nodes.values()) {
        yield* tx.visitResult()
        if (node.kind !== "directory") continue
        for (const binding of node.entries.values()) {
          yield* tx.visitResult()
          add(binding.object, { parent: node.id, name: BytePath.toBytes(binding.name) })
        }
      }
    })
  const manager = { register, initialize }
  return manager
}

/** Acquires a watch independently of its creator's lifetime, like a file handle. */
export const watch = Effect.fnUntraced(function*(caller: E.Caller, target: M.Target, options?: M.WatchOptions) {
  const scope = yield* Scope.Scope
  const queue = yield* Queue.bounded<M.Change, M.ReadError | Cause.Done>(caller.runtime.limits.watchEvents + 1).pipe(
    Effect.provideService(Scheduler.Scheduler, wakeScheduler)
  )
  return yield* caller.runtime.runResult(caller.resource, "watch", () =>
    Result.gen(function*() {
      const { recursive, alias } = yield* P.snapshotWatchOptions(options)
      const bytes = yield* E.addressBytesResult(target, "watch", caller.runtime.limits)
      return {
        bytes,
        snapshot: (work) =>
          Result.gen(function*() {
            const fixed = yield* E.snapshotTargetResult(target)
            const resource = yield* work.acquireResourceResult("watch")
            return {
              enroll: resource.enroll(
                scope,
                "watch",
                Effect.andThen(Effect.sync(() => caller.runtime.cancel(work)), resource.close)
              ),
              execute: () =>
                Result.gen(function*() {
                  yield* resource.checkOpenResult("watch")
                  const tx = new E.Transaction(caller, work)
                  const route = yield* tx.targetResult(fixed)
                  yield* tx.requireResult(route.object, E.READ_PERMISSION)
                  if (route.object.nlink === BigInt(0)) {
                    return yield* Result.fail(new M.NotFound({ operation: "watch", reason: "missingRoute" }))
                  }
                  if (alias === "resolved" && route.object.kind !== "directory" && M.isToken(fixed)) {
                    return yield* Result.fail(
                      new M.InvalidInput({ operation: "watch", field: "target", reason: "malformed" })
                    )
                  }
                  const selected =
                    alias === "resolved" && route.object.kind !== "directory" && route.parent && route.binding
                      ? { parent: route.parent.id, name: BytePath.toBytes(route.binding.name) }
                      : undefined
                  const engine = tx.engine
                  let manager = managers.get(engine)
                  if (manager === undefined) {
                    manager = make(engine)
                    yield* manager.initialize(tx)
                  }
                  const cleanup = yield* manager.register({
                    rootChain: [...caller.policy.boundaries, caller.policy.root],
                    target: route.object.id,
                    recursive,
                    selected
                  }, queue)
                  managers.set(engine, manager)
                  yield* resource.releaseWithResult(cleanup)
                  return yield* tx.transitionResult(Stream.fromEffectRepeat(Queue.take(queue)))
                })
            }
          })
      }
    })).pipe(Effect.onError(() => Effect.sync(() => Queue.shutdownUnsafe(queue))))
})

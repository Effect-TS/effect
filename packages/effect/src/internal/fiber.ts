import type * as Cause from "../Cause.js"
import * as Clock from "../Clock.js"
import type * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Exit from "../Exit.js"
import type * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import * as FiberStatus from "../FiberStatus.js"
import { dual, pipe } from "../Function.js"
import * as Graph from "../Graph.js"
import * as HashSet from "../HashSet.js"
import * as number from "../Number.js"
import * as Option from "../Option.js"
import * as order from "../Order.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import * as core from "./core.js"
import * as effectable from "./effectable.js"
import * as fiberScope from "./fiberScope.js"
import * as runtimeFlags from "./runtimeFlags.js"

/** @internal */
const FiberSymbolKey = "effect/Fiber"

/** @internal */
export const FiberTypeId: Fiber.FiberTypeId = Symbol.for(
  FiberSymbolKey
) as Fiber.FiberTypeId

/** @internal */
export const fiberVariance = {
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: never) => _
}

/** @internal */
const fiberProto = {
  [FiberTypeId]: fiberVariance,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
const RuntimeFiberSymbolKey = "effect/Fiber"

/** @internal */
export const RuntimeFiberTypeId: Fiber.RuntimeFiberTypeId = Symbol.for(
  RuntimeFiberSymbolKey
) as Fiber.RuntimeFiberTypeId

/** @internal */
export const Order: order.Order<Fiber.RuntimeFiber<unknown, unknown>> = pipe(
  order.tuple(number.Order, number.Order),
  order.mapInput((fiber: Fiber.RuntimeFiber<unknown, unknown>) =>
    [
      (fiber.id() as FiberId.Runtime).startTimeMillis,
      (fiber.id() as FiberId.Runtime).id
    ] as const
  )
)

/** @internal */
export const isFiber = (u: unknown): u is Fiber.Fiber<unknown, unknown> => hasProperty(u, FiberTypeId)

/** @internal */
export const isRuntimeFiber = <A, E>(self: Fiber.Fiber<A, E>): self is Fiber.RuntimeFiber<A, E> =>
  RuntimeFiberTypeId in self

/** @internal */
export const _await = <A, E>(self: Fiber.Fiber<A, E>): Effect.Effect<Exit.Exit<A, E>> => self.await

/** @internal */
export const children = <A, E>(
  self: Fiber.Fiber<A, E>
): Effect.Effect<Array<Fiber.RuntimeFiber<any, any>>> => self.children

/** @internal */
export const done = <A, E>(exit: Exit.Exit<A, E>): Fiber.Fiber<A, E> => {
  const _fiber = {
    ...effectable.CommitPrototype,
    commit() {
      return join(this)
    },
    ...fiberProto,
    id: () => FiberId.none,
    await: core.succeed(exit),
    children: core.succeed([]),
    inheritAll: core.void,
    poll: core.succeed(Option.some(exit)),
    interruptAsFork: () => core.void
  }

  return _fiber
}

/** @internal */
export const dump = <A, E>(self: Fiber.RuntimeFiber<A, E>): Effect.Effect<Fiber.Fiber.Dump> =>
  core.map(self.status, (status) => ({ id: self.id(), status }))

/** @internal */
export const dumpAll = (
  fibers: Iterable<Fiber.RuntimeFiber<unknown, unknown>>
): Effect.Effect<Array<Fiber.Fiber.Dump>> => core.forEachSequential(fibers, dump)

type DumpGraphInclude = {
  readonly children?: boolean
  readonly blockingOn?: boolean
  readonly roots?: boolean
  readonly threadName?: boolean
}

type DumpGraphSettle = {
  readonly iterations?: number
}

type DumpGraphOptions = {
  readonly output?: "nodes" | "graph" | "dot"
  readonly include?: DumpGraphInclude
  readonly maxDepth?: number
  readonly settle?: DumpGraphSettle
}

type DumpGraphNodeBase = {
  readonly id: number
}

const fiberIdNumber = (fiberId: FiberId.FiberId): number => {
  const ids = Array.from(FiberId.ids(fiberId))
  return ids.length === 0 ? -1 : Math.min(...ids)
}

const settleStatus = <A, E>(
  fiber: Fiber.RuntimeFiber<A, E>,
  iterations: number
): Effect.Effect<FiberStatus.FiberStatus> => {
  if (iterations <= 0) {
    return fiber.status
  }
  return core.gen(function*() {
    let i = 0
    while (true) {
      const status = yield* fiber.status
      if (FiberStatus.isSuspended(status) || FiberStatus.isDone(status)) {
        return status
      }
      if (i >= iterations) {
        return status
      }
      i++
      yield* core.yieldNow()
    }
  })
}

const settleBlockingOnIds = <A, E>(
  fiber: Fiber.RuntimeFiber<A, E>,
  iterations: number
): Effect.Effect<Array<number>> => {
  if (iterations <= 0) {
    return core.gen(function*() {
      const status = yield* fiber.status
      return FiberStatus.isSuspended(status) ? sortUniqueNumbers(FiberId.ids(status.blockingOn)) : []
    })
  }
  return core.gen(function*() {
    let i = 0
    const acc = new Set<number>()
    while (true) {
      const status = yield* fiber.status
      if (FiberStatus.isSuspended(status)) {
        for (const id of FiberId.ids(status.blockingOn)) {
          acc.add(id)
        }
      }
      if (FiberStatus.isDone(status) || i >= iterations) {
        return Array.from(acc).sort((a, b) => a - b)
      }
      i++
      yield* core.yieldNow()
    }
  })
}

const sortUniqueNumbers = (values: Iterable<number>): Array<number> => {
  const set = new Set<number>()
  for (const v of values) {
    set.add(v)
  }
  return Array.from(set).sort((a, b) => a - b)
}

const lookupFiberByNumericId = core.fnUntraced(function*(
  numericId: number,
  known: Map<number, Fiber.RuntimeFiber<any, any>>
) {
  const existing = known.get(numericId)
  if (existing !== undefined) {
    return existing
  }

  const roots = Array.from(fiberScope.globalScope.roots)
  const visited = new Set<number>()
  const stack: Array<Fiber.RuntimeFiber<any, any>> = [...roots]
  while (stack.length > 0) {
    const current = stack.pop()!
    const idNum = fiberIdNumber(current.id())
    if (visited.has(idNum)) {
      continue
    }
    visited.add(idNum)
    known.set(idNum, current)
    if (idNum === numericId) {
      return current
    }
    const children = yield* current.children
    for (const child of children) {
      stack.push(child)
    }
  }

  return undefined
})

const makeDot = (
  nodes: ReadonlyArray<{ readonly id: number }>,
  edges: ReadonlyArray<readonly [number, number, string]>
): string => {
  const lines: Array<string> = []
  lines.push("digraph {")

  for (const node of nodes) {
    const id = String(node.id)
    lines.push(`  \"${id}\" [label=\"${id}\"];`)
  }

  const orderedEdges = [...edges].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0))
  for (const [from, to, kind] of orderedEdges) {
    lines.push(`  \"${from}\" -> \"${to}\" [type=\"${kind}\"];`)
  }

  lines.push("}")
  return lines.join("\n")
}

/** @internal */
export const dumpGraph = (
  roots: Iterable<Fiber.RuntimeFiber<unknown, unknown>>,
  options: DumpGraphOptions = {}
): Effect.Effect<unknown> => {
  const output = options.output ?? "nodes"
  const include: DumpGraphInclude = options.include ?? {}
  const maxDepth = options.maxDepth ?? Infinity
  const settleIterations = options.settle?.iterations ?? 0

  const rootArray = Array.from(roots)
  const rootIds = new Set<number>(rootArray.map((f) => fiberIdNumber(f.id())))

  return core.gen(function*() {
    const knownById = new Map<number, Fiber.RuntimeFiber<any, any>>()
    const discovered = new Map<number, { fiber: Fiber.RuntimeFiber<any, any> | undefined; depth: number }>()
    const queue: Array<{ fiber: Fiber.RuntimeFiber<any, any>; depth: number }> = []

    for (const fiber of rootArray) {
      const idNum = fiberIdNumber(fiber.id())
      knownById.set(idNum, fiber)
      const existing = discovered.get(idNum)
      if (existing === undefined) {
        discovered.set(idNum, { fiber, depth: 0 })
        queue.push({ fiber, depth: 0 })
        continue
      }

      const previousDepth = existing.depth
      const previousFiber = existing.fiber
      if (previousFiber === undefined || previousDepth > 0) {
        existing.fiber = fiber
        existing.depth = 0
        queue.push({ fiber, depth: 0 })
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentDepth = current.depth
      const currentId = fiberIdNumber(current.fiber.id())
      const currentState = discovered.get(currentId)
      if (currentState === undefined || currentState.depth !== currentDepth) {
        continue
      }
      if (currentDepth >= maxDepth) {
        continue
      }

      if (include.children === true) {
        const children = yield* current.fiber.children
        for (const child of children) {
          const childId = fiberIdNumber(child.id())
          knownById.set(childId, child)
          const nextDepth = currentDepth + 1
          const existing = discovered.get(childId)
          if (existing === undefined) {
            discovered.set(childId, { fiber: child, depth: nextDepth })
            queue.push({ fiber: child, depth: nextDepth })
            continue
          }

          const previousDepth = existing.depth
          const previousFiber = existing.fiber
          let changed = false

          if (previousFiber === undefined) {
            existing.fiber = child
            changed = true
          }
          if (previousDepth > nextDepth) {
            existing.depth = nextDepth
            changed = true
          }

          if (changed) {
            queue.push({ fiber: child, depth: existing.depth })
          }
        }
      }

      if (include.blockingOn === true) {
        const ids = yield* settleBlockingOnIds(current.fiber, settleIterations)
        if (ids.length > 0) {
          for (const targetId of ids) {
            const targetFiber = yield* lookupFiberByNumericId(targetId, knownById)
            const nextDepth = currentDepth + 1
            const existing = discovered.get(targetId)
            if (existing === undefined) {
              discovered.set(targetId, { fiber: targetFiber, depth: nextDepth })
              if (targetFiber !== undefined) {
                queue.push({ fiber: targetFiber, depth: nextDepth })
              }
              continue
            }

            const previousDepth = existing.depth
            const previousFiber = existing.fiber
            let changed = false

            if (previousFiber === undefined && targetFiber !== undefined) {
              existing.fiber = targetFiber
              changed = true
            }
            if (previousDepth > nextDepth) {
              existing.depth = nextDepth
              changed = true
            }

            if (changed && targetFiber !== undefined) {
              queue.push({ fiber: targetFiber, depth: existing.depth })
            }
          }
        }
      }
    }

    const ordered = Array.from(discovered.entries())
      .map(([id, { fiber, depth }]) => ({ id, fiber, depth }))
      .sort((a, b) => a.id - b.id)

    const nodeById = new Map<number, any>()
    for (const item of ordered) {
      const fiber = item.fiber
      const idNum = item.id
      const base: any = { id: idNum }
      if (include.roots === true) {
        base.isRoot = rootIds.has(idNum)
      }
      if (include.threadName === true) {
        base.threadName = FiberId.threadName(fiber !== undefined ? fiber.id() : FiberId.runtime(idNum, -1))
      }

      if (include.children === true) {
        if (item.depth >= maxDepth) {
          base.children = []
        } else if (fiber === undefined) {
          base.children = []
        } else {
          const children = yield* fiber.children
          const childIds = children.map((c) => fiberIdNumber(c.id()))
          const filtered = childIds.filter((cid) => discovered.has(cid) && (discovered.get(cid)!.depth <= maxDepth))
          base.children = sortUniqueNumbers(filtered)
        }
      }

      if (include.blockingOn === true) {
        if (item.depth >= maxDepth) {
          base.blockingOn = []
        } else if (fiber === undefined) {
          base.blockingOn = []
        } else {
          const blockers = yield* settleBlockingOnIds(fiber, settleIterations)
          const filtered = blockers.filter((bid) => discovered.has(bid) && (discovered.get(bid)!.depth <= maxDepth))
          base.blockingOn = sortUniqueNumbers(filtered)
        }
      }

      nodeById.set(idNum, base)
    }

    if (output === "nodes") {
      return { nodes: Array.from(nodeById.values()) as Array<DumpGraphNodeBase> }
    }

    if (output === "dot") {
      const nodes = Array.from(nodeById.values()) as ReadonlyArray<{ readonly id: number }>
      const edges: Array<readonly [number, number, string]> = []

      if (include.children === true) {
        for (const node of nodes as any) {
          const children = (node as any).children as ReadonlyArray<number>
          if (Array.isArray(children)) {
            for (const childId of children) {
              edges.push([node.id, childId, "children"] as const)
            }
          }
        }
      }

      if (include.blockingOn === true) {
        for (const node of nodes as any) {
          const blockingOn = (node as any).blockingOn as ReadonlyArray<number>
          if (Array.isArray(blockingOn)) {
            for (const blockerId of blockingOn) {
              edges.push([node.id, blockerId, "blockingOn"] as const)
            }
          }
        }
      }

      return makeDot(nodes, edges)
    }

    const graph = Graph.mutate(Graph.directed<any, string>(), (mutable) => {
      const indexById = new Map<number, Graph.NodeIndex>()
      for (const item of ordered) {
        const idNum = item.id
        const fiber = item.fiber
        const node = nodeById.get(idNum)
        const value: any = { ...node, id: fiber !== undefined ? fiber.id() : FiberId.runtime(idNum, -1) }
        const index = Graph.addNode(mutable, value)
        indexById.set(idNum, index)
      }

      const addEdges = (pairs: Array<readonly [number, number]>, kind: string) => {
        const sorted = pairs.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
        for (const [fromId, toId] of sorted) {
          const fromIndex = indexById.get(fromId)
          const toIndex = indexById.get(toId)
          if (fromIndex !== undefined && toIndex !== undefined) {
            Graph.addEdge(mutable, fromIndex, toIndex, kind)
          }
        }
      }

      if (include.children === true) {
        const pairs: Array<readonly [number, number]> = []
        for (const n of nodeById.values() as any) {
          const fromId = (n as any).id
          const children = (n as any).children
          if (Array.isArray(children)) {
            for (const toId of children) {
              pairs.push([fromId, toId] as const)
            }
          }
        }
        addEdges(pairs, "children")
      }

      if (include.blockingOn === true) {
        const pairs: Array<readonly [number, number]> = []
        for (const n of nodeById.values() as any) {
          const fromId = (n as any).id
          const blockers = (n as any).blockingOn
          if (Array.isArray(blockers)) {
            for (const toId of blockers) {
              pairs.push([fromId, toId] as const)
            }
          }
        }
        addEdges(pairs, "blockingOn")
      }
    })

    return graph
  })
}

/** @internal */
export const fail = <E>(error: E): Fiber.Fiber<never, E> => done(Exit.fail(error))

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Fiber.Fiber<never, E> => done(Exit.failCause(cause))

/** @internal */
export const fromEffect = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<Fiber.Fiber<A, E>> =>
  core.map(core.exit(effect), done)

/** @internal */
export const id = <A, E>(self: Fiber.Fiber<A, E>): FiberId.FiberId => self.id()

/** @internal */
export const inheritAll = <A, E>(self: Fiber.Fiber<A, E>): Effect.Effect<void> => self.inheritAll

/** @internal */
export const interrupted = (fiberId: FiberId.FiberId): Fiber.Fiber<never> => done(Exit.interrupt(fiberId))

/** @internal */
export const interruptAll = (fibers: Iterable<Fiber.Fiber<any, any>>): Effect.Effect<void> =>
  core.flatMap(core.fiberId, (fiberId) => pipe(fibers, interruptAllAs(fiberId)))

/** @internal */
export const interruptAllAs = dual<
  (fiberId: FiberId.FiberId) => (fibers: Iterable<Fiber.Fiber<any, any>>) => Effect.Effect<void>,
  (fibers: Iterable<Fiber.Fiber<any, any>>, fiberId: FiberId.FiberId) => Effect.Effect<void>
>(
  2,
  core.fnUntraced(function*(fibers, fiberId) {
    for (const fiber of fibers) {
      if (isRuntimeFiber(fiber)) {
        fiber.unsafeInterruptAsFork(fiberId)
        continue
      }
      yield* fiber.interruptAsFork(fiberId)
    }
    for (const fiber of fibers) {
      if (isRuntimeFiber(fiber) && fiber.unsafePoll()) {
        continue
      }
      yield* fiber.await
    }
  })
)

/** @internal */
export const interruptAsFork = dual<
  (fiberId: FiberId.FiberId) => <A, E>(self: Fiber.Fiber<A, E>) => Effect.Effect<void>,
  <A, E>(self: Fiber.Fiber<A, E>, fiberId: FiberId.FiberId) => Effect.Effect<void>
>(2, (self, fiberId) => self.interruptAsFork(fiberId))

/** @internal */
export const join = <A, E>(self: Fiber.Fiber<A, E>): Effect.Effect<A, E> =>
  core.zipLeft(core.flatten(self.await), self.inheritAll)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <E>(self: Fiber.Fiber<A, E>) => Fiber.Fiber<B, E>,
  <A, E, B>(self: Fiber.Fiber<A, E>, f: (a: A) => B) => Fiber.Fiber<B, E>
>(2, (self, f) => mapEffect(self, (a) => core.sync(() => f(a))))

/** @internal */
export const mapEffect = dual<
  <A, A2, E2>(f: (a: A) => Effect.Effect<A2, E2>) => <E>(self: Fiber.Fiber<A, E>) => Fiber.Fiber<A2, E | E2>,
  <A, E, A2, E2>(self: Fiber.Fiber<A, E>, f: (a: A) => Effect.Effect<A2, E2>) => Fiber.Fiber<A2, E | E2>
>(2, (self, f) => {
  const _fiber = {
    ...effectable.CommitPrototype,
    commit() {
      return join(this)
    },
    ...fiberProto,
    id: () => self.id(),
    await: core.flatMap(self.await, Exit.forEachEffect(f)),
    children: self.children,
    inheritAll: self.inheritAll,
    poll: core.flatMap(self.poll, (result) => {
      switch (result._tag) {
        case "None":
          return core.succeed(Option.none())
        case "Some":
          return pipe(
            Exit.forEachEffect(result.value, f),
            core.map(Option.some)
          )
      }
    }),
    interruptAsFork: (id: FiberId.FiberId) => self.interruptAsFork(id)
  }
  return _fiber
})

/** @internal */
export const mapFiber = dual<
  <E, E2, A, B>(
    f: (a: A) => Fiber.Fiber<B, E2>
  ) => (self: Fiber.Fiber<A, E>) => Effect.Effect<Fiber.Fiber<B, E | E2>>,
  <A, E, E2, B>(
    self: Fiber.Fiber<A, E>,
    f: (a: A) => Fiber.Fiber<B, E2>
  ) => Effect.Effect<Fiber.Fiber<B, E | E2>>
>(2, <A, E, E2, B>(
  self: Fiber.Fiber<A, E>,
  f: (a: A) => Fiber.Fiber<B, E2>
) =>
  core.map(
    self.await,
    Exit.match({
      onFailure: (cause): Fiber.Fiber<B, E | E2> => failCause(cause),
      onSuccess: (a) => f(a)
    })
  ))

/** @internal */
export const match = dual<
  <A, E, Z>(
    options: {
      readonly onFiber: (fiber: Fiber.Fiber<A, E>) => Z
      readonly onRuntimeFiber: (fiber: Fiber.RuntimeFiber<A, E>) => Z
    }
  ) => (self: Fiber.Fiber<A, E>) => Z,
  <A, E, Z>(
    self: Fiber.Fiber<A, E>,
    options: {
      readonly onFiber: (fiber: Fiber.Fiber<A, E>) => Z
      readonly onRuntimeFiber: (fiber: Fiber.RuntimeFiber<A, E>) => Z
    }
  ) => Z
>(2, (self, { onFiber, onRuntimeFiber }) => {
  if (isRuntimeFiber(self)) {
    return onRuntimeFiber(self)
  }
  return onFiber(self)
})

/** @internal */
const _never = {
  ...effectable.CommitPrototype,
  commit() {
    return join(this)
  },
  ...fiberProto,
  id: () => FiberId.none,
  await: core.never,
  children: core.succeed([]),
  inheritAll: core.never,
  poll: core.succeed(Option.none()),
  interruptAsFork: () => core.never
}

/** @internal */
export const never: Fiber.Fiber<never> = _never

/** @internal */
export const orElse = dual<
  <A2, E2>(that: Fiber.Fiber<A2, E2>) => <A, E>(self: Fiber.Fiber<A, E>) => Fiber.Fiber<A | A2, E | E2>,
  <A, E, A2, E2>(self: Fiber.Fiber<A, E>, that: Fiber.Fiber<A2, E2>) => Fiber.Fiber<A | A2, E | E2>
>(2, (self, that) => ({
  ...effectable.CommitPrototype,
  commit() {
    return join(this)
  },
  ...fiberProto,
  id: () => FiberId.getOrElse(self.id(), that.id()),
  await: core.zipWith(
    self.await,
    that.await,
    (exit1, exit2) => (Exit.isSuccess(exit1) ? exit1 : exit2)
  ),
  children: self.children,
  inheritAll: core.zipRight(that.inheritAll, self.inheritAll),
  poll: core.zipWith(
    self.poll,
    that.poll,
    (option1, option2) => {
      switch (option1._tag) {
        case "None": {
          return Option.none()
        }
        case "Some": {
          return Exit.isSuccess(option1.value) ? option1 : option2
        }
      }
    }
  ),
  interruptAsFork: (id) =>
    pipe(
      core.interruptAsFiber(self, id),
      core.zipRight(pipe(that, core.interruptAsFiber(id))),
      core.asVoid
    )
}))

/** @internal */
export const orElseEither = dual<
  <A2, E2>(that: Fiber.Fiber<A2, E2>) => <A, E>(self: Fiber.Fiber<A, E>) => Fiber.Fiber<Either.Either<A2, A>, E | E2>,
  <A, E, A2, E2>(self: Fiber.Fiber<A, E>, that: Fiber.Fiber<A2, E2>) => Fiber.Fiber<Either.Either<A2, A>, E | E2>
>(2, (self, that) => orElse(map(self, Either.left), map(that, Either.right)))

/** @internal */
export const poll = <A, E>(self: Fiber.Fiber<A, E>): Effect.Effect<Option.Option<Exit.Exit<A, E>>> => self.poll

// forked from https://github.com/sindresorhus/parse-ms/blob/4da2ffbdba02c6e288c08236695bdece0adca173/index.js
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
/** @internal */
const parseMs = (milliseconds: number) => {
  const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil
  return {
    days: roundTowardsZero(milliseconds / 86400000),
    hours: roundTowardsZero(milliseconds / 3600000) % 24,
    minutes: roundTowardsZero(milliseconds / 60000) % 60,
    seconds: roundTowardsZero(milliseconds / 1000) % 60,
    milliseconds: roundTowardsZero(milliseconds) % 1000,
    microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
    nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
  }
}

/** @internal */
const renderStatus = (status: FiberStatus.FiberStatus): string => {
  if (FiberStatus.isDone(status)) {
    return "Done"
  }
  if (FiberStatus.isRunning(status)) {
    return "Running"
  }

  const isInterruptible = runtimeFlags.interruptible(status.runtimeFlags) ?
    "interruptible" :
    "uninterruptible"
  return `Suspended(${isInterruptible})`
}

/** @internal */
export const pretty = <A, E>(self: Fiber.RuntimeFiber<A, E>): Effect.Effect<string> =>
  core.flatMap(Clock.currentTimeMillis, (now) =>
    core.map(dump(self), (dump) => {
      const time = now - dump.id.startTimeMillis
      const { days, hours, milliseconds, minutes, seconds } = parseMs(time)
      const lifeMsg = (days === 0 ? "" : `${days}d`) +
        (days === 0 && hours === 0 ? "" : `${hours}h`) +
        (days === 0 && hours === 0 && minutes === 0 ? "" : `${minutes}m`) +
        (days === 0 && hours === 0 && minutes === 0 && seconds === 0 ? "" : `${seconds}s`) +
        `${milliseconds}ms`
      const waitMsg = FiberStatus.isSuspended(dump.status) ?
        (() => {
          const ids = FiberId.ids(dump.status.blockingOn)
          return HashSet.size(ids) > 0
            ? `waiting on ` + Array.from(ids).map((id) => `${id}`).join(", ")
            : ""
        })() :
        ""
      const statusMsg = renderStatus(dump.status)
      return `[Fiber](#${dump.id.id}) (${lifeMsg}) ${waitMsg}\n   Status: ${statusMsg}`
    }))

/** @internal */
export const unsafeRoots = (): Array<Fiber.RuntimeFiber<any, any>> => Array.from(fiberScope.globalScope.roots)

/** @internal */
export const roots: Effect.Effect<Array<Fiber.RuntimeFiber<any, any>>> = core.sync(unsafeRoots)

/** @internal */
export const status = <A, E>(self: Fiber.RuntimeFiber<A, E>): Effect.Effect<FiberStatus.FiberStatus> => self.status

/** @internal */
export const succeed = <A>(value: A): Fiber.Fiber<A> => done(Exit.succeed(value))

const void_: Fiber.Fiber<void> = succeed(void 0)
export {
  /** @internal */
  void_ as void
}

/** @internal */
export const currentFiberURI = "effect/FiberCurrent"

/** @internal */
export const getCurrentFiber = (): Option.Option<Fiber.RuntimeFiber<any, any>> =>
  Option.fromNullable((globalThis as any)[currentFiberURI])

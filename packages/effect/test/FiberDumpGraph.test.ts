import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as Graph from "effect/Graph"
import { pipe } from "effect/Function"

const fiberIdNumber = (fiberId: FiberId.FiberId): number => {
  const ids = Array.from(FiberId.ids(fiberId))
  return ids.length === 0 ? -1 : Math.min(...ids)
}

const extractNodes = (graph: any) => {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  return nodes.map((n: any) => {
    const id = n.id
    const idNum = typeof id === "number" ? id : -1
    const children = Array.isArray(n.children) ? n.children : []
    const childIds = children.map((c: any) => typeof c === "number" ? c : -1)
    const blockingOn = Array.isArray(n.blockingOn) ? n.blockingOn : []
    const blockingIds = blockingOn.map((b: any) => typeof b === "number" ? b : -1)
    const threadName = typeof n.threadName === "string" ? n.threadName : ""
    const roots = typeof n.isRoot === "boolean" ? n.isRoot : false
    return {
      id: idNum,
      children: childIds,
      blockingOn: blockingIds,
      threadName,
      isRoot: roots
    }
  })
}

const assertSortedAscending = (values: ReadonlyArray<number>) => {
  for (let i = 1; i < values.length; i++) {
    assertTrue(values[i - 1] <= values[i])
  }
}

const assertSnapshotSorted = (nodes: ReadonlyArray<{ id: number; children: Array<number>; blockingOn: Array<number> }>) => {
  assertSortedAscending(nodes.map((n: { id: number }) => n.id))
  for (const node of nodes) {
    assertSortedAscending(node.children)
    assertSortedAscending(node.blockingOn)
  }
}

const getNode = (nodes: ReadonlyArray<{ id: number; children: Array<number>; blockingOn: Array<number> }>, id: number) => {
  const node = nodes.find((n) => n.id === id)
  if (!node) {
    throw new Error("missing node")
  }
  return node
}

const edgePairsByNodeId = (graph: Graph.Graph<unknown, unknown>): Array<readonly [number, number]> => {
  const idByIndex = new Map<number, number>()
  for (const [index, node] of graph) {
    const id = fiberIdNumber((node as any).id as FiberId.FiberId)
    idByIndex.set(index, id)
  }
  return Array.from(Graph.values(Graph.edges(graph))).flatMap((edge) => {
    const source = idByIndex.get(edge.source)
    const target = idByIndex.get(edge.target)
    return source === undefined || target === undefined ? [] : [[source, target] as const]
  })
}

const extractGraphNodes = (graph: Graph.Graph<unknown, unknown>) => {
  const nodes: Array<any> = []
  for (const [, node] of graph) {
    nodes.push(node)
  }
  return nodes.map((n: any) => {
    const id = n.id
    const idNum = FiberId.isFiberId(id) ? fiberIdNumber(id) : typeof id === "number" ? id : -1
    const children = Array.isArray(n.children) ? n.children : []
    const childIds = children.map((c: any) => typeof c === "number" ? c : -1)
    const blockingOn = Array.isArray(n.blockingOn) ? n.blockingOn : []
    const blockingIds = blockingOn.map((b: any) => typeof b === "number" ? b : -1)
    const threadName = typeof n.threadName === "string" ? n.threadName : ""
    const roots = typeof n.isRoot === "boolean" ? n.isRoot : false
    return {
      id: idNum,
      children: childIds,
      blockingOn: blockingIds,
      threadName,
      isRoot: roots
    }
  })
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const dotHasEdge = (dot: string, from: number, to: number): boolean => {
  const escapedFrom = escapeRegExp(String(from))
  const escapedTo = escapeRegExp(String(to))
  return new RegExp(`(^|\\n)\\s*\"?${escapedFrom}\"?\\s*->\\s*\"?${escapedTo}\"?\\s*\\[[^\\]]+\\]`).test(dot)
}

const dotHasNodeId = (dot: string, id: number): boolean => {
  const escapedId = escapeRegExp(String(id))
  return new RegExp(`(^|\\n)\\s*\"?${escapedId}\"?\\s*\\[[^\\]]+\\]`).test(dot)
}

const dotHasNodeAttributes = (dot: string, id: number): boolean => {
  const escapedId = escapeRegExp(String(id))
  return new RegExp(`(^|\\n)\\s*\"?${escapedId}\"?\\s*\\[[^\\]]*=\\s*[^\\]]+\\]`).test(dot)
}

const dotHasEdgeAttributes = (dot: string, from: number, to: number): boolean => {
  const escapedFrom = escapeRegExp(String(from))
  const escapedTo = escapeRegExp(String(to))
  return new RegExp(
    `(^|\\n)\\s*\"?${escapedFrom}\"?\\s*->\\s*\"?${escapedTo}\"?\\s*\\[[^\\]]*=\\s*[^\\]]+\\]`
  ).test(dot)
}

const dotNodeLineIdsInOrder = (dot: string): Array<number> => {
  const matches = Array.from(dot.matchAll(/^\s*"?(\d+)"?\s*\[[^\]]+\]\s*;?\s*$/gm))
  return matches.map((m) => Number(m[1]))
}

const dotEdgePairsInOrder = (dot: string): Array<readonly [number, number]> => {
  const matches = Array.from(dot.matchAll(/^\s*"?(\d+)"?\s*->\s*"?(\d+)"?\s*\[[^\]]+\]\s*;?\s*$/gm))
  return matches.map((m) => [Number(m[1]), Number(m[2])] as const)
}

describe("Fiber", () => {
  it.effect("dumpGraph(nodes) returns deterministic nodes with roots and threadName", () =>
    Effect.gen(function*() {
      const a = yield* pipe(Effect.never, Effect.forkDaemon)
      const b = yield* pipe(Effect.never, Effect.forkDaemon)
      const graph = yield* Fiber.dumpGraph([a, b], { output: "nodes", include: { roots: true, threadName: true } })
      const rawNodes = Array.isArray((graph as any)?.nodes) ? (graph as any).nodes : []
      for (const node of rawNodes) {
        strictEqual(typeof (node as any).id, "number")
      }
      const snapshot = extractNodes(graph)
      assertSnapshotSorted(snapshot)
      strictEqual(snapshot.length, 2)
      const ids = snapshot.map((n: { id: number }) => n.id)
      deepStrictEqual(ids, [...ids].sort((x, y) => x - y))
      for (const node of snapshot) {
        assertTrue(typeof node.threadName === "string")
        strictEqual(node.isRoot, true)
      }
      yield* Fiber.interrupt(a)
      yield* Fiber.interrupt(b)
    }))

  it.effect("dumpGraph(dot) emits edge lines in ascending numeric id order", () =>
    Effect.gen(function*() {
      const t1 = yield* pipe(Effect.never, Effect.forkDaemon)
      const t2 = yield* pipe(Effect.never, Effect.forkDaemon)
      const waiter = yield* pipe(
        Effect.all([Fiber.await(t1), Fiber.await(t2)], { concurrency: "unbounded" }),
        Effect.forkDaemon
      )
      const dot = yield* Fiber.dumpGraph([waiter], { output: "dot", include: { blockingOn: true }, settle: { iterations: 50 } })
      if (typeof dot !== "string") {
        throw new Error("expected DOT output")
      }
      const edges = dotEdgePairsInOrder(dot)
      assertTrue(edges.length >= 2)
      const sorted = [...edges].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
      deepStrictEqual(edges, sorted)
      yield* Fiber.interrupt(t1)
      yield* Fiber.interrupt(t2)
      yield* Fiber.interrupt(waiter)
    }))

  it.effect("dumpGraph(dot) emits node lines in ascending numeric id order", () =>
    Effect.gen(function*() {
      const a = yield* pipe(Effect.never, Effect.forkDaemon)
      const b = yield* pipe(Effect.never, Effect.forkDaemon)
      const dot = yield* Fiber.dumpGraph([b, a], { output: "dot", include: { threadName: true }, settle: { iterations: 5 } })
      if (typeof dot !== "string") {
        throw new Error("expected DOT output")
      }
      const ids = dotNodeLineIdsInOrder(dot)
      assertTrue(ids.length >= 2)
      deepStrictEqual(ids, [...ids].sort((x, y) => x - y))
      yield* Fiber.interrupt(a)
      yield* Fiber.interrupt(b)
    }))

  it.effect("dumpGraph(nodes) discovers direct children and supports maxDepth", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)
      const full = extractNodes(yield* Fiber.dumpGraph([parent], { output: "nodes", include: { children: true } }))
      assertSnapshotSorted(full)
      strictEqual(full.length, 2)
      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))
      strictEqual(getNode(full, parentId).children[0], childId)

      const limited = extractNodes(yield* Fiber.dumpGraph([parent], { output: "nodes", include: { children: true }, maxDepth: 0 }))
      assertSnapshotSorted(limited)
      strictEqual(limited.length, 1)
      strictEqual(limited[0].id, parentId)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(nodes) uses -1 for FiberId.none numeric id", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.never, Effect.fork)
      const wrapped = new Proxy(fiber as any, {
        get(target, prop, receiver) {
          if (prop === "id") {
            return () => FiberId.none
          }
          return Reflect.get(target, prop, receiver)
        }
      })
      const out = yield* Fiber.dumpGraph([wrapped], { output: "nodes" })
      const rawNodes = Array.isArray((out as any)?.nodes) ? (out as any).nodes : []
      strictEqual(rawNodes.length, 1)
      strictEqual((rawNodes[0] as any).id, -1)

      yield* Fiber.interrupt(fiber)
    }))

  it.effect("dumpGraph(nodes) omits relationship fields when not included", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)

      const out = yield* Fiber.dumpGraph([parent], { output: "nodes" })
      const rawNodes = Array.isArray((out as any)?.nodes) ? (out as any).nodes : []
      strictEqual(rawNodes.length, 1)
      const node: any = rawNodes[0]
      assertTrue(!("children" in node))
      assertTrue(!("blockingOn" in node))

      assertTrue(!("isRoot" in node))
      assertTrue(!("threadName" in node))

      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(nodes) include.roots marks only provided roots", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)

      const snapshot = extractNodes(yield* Fiber.dumpGraph([parent], { output: "nodes", include: { children: true, roots: true } }))
      assertSnapshotSorted(snapshot)

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))

      const parentNode: any = snapshot.find((n: any) => n.id === parentId)
      const childNode: any = snapshot.find((n: any) => n.id === childId)
      if (!parentNode || !childNode) {
        throw new Error("missing node")
      }
      strictEqual(parentNode.isRoot, true)
      strictEqual(childNode.isRoot, false)

      for (const node of snapshot as any) {
        strictEqual(node.isRoot, node.id === parentId)
      }

      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(dot) includes attribute lists on node and edge lines", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const blocker = yield* pipe(Effect.never, Effect.forkDaemon)
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Fiber.await(blocker)
        }),
        Effect.forkDaemon
      )
      const child = yield* Deferred.await(childRef)

      const dot = yield* Fiber.dumpGraph([parent], {
        output: "dot",
        include: { children: true, blockingOn: true },
        settle: { iterations: 50 }
      })
      if (typeof dot !== "string") {
        throw new Error("expected DOT output")
      }

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))
      const blockerId = fiberIdNumber(Fiber.id(blocker))

      assertTrue(dotHasNodeAttributes(dot, parentId))
      assertTrue(dotHasNodeAttributes(dot, childId))
      assertTrue(dotHasNodeAttributes(dot, blockerId))
      assertTrue(dotHasEdgeAttributes(dot, parentId, childId))
      assertTrue(dotHasEdgeAttributes(dot, parentId, blockerId))

      yield* Fiber.interrupt(blocker)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(nodes) default maxDepth is unbounded", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const grandchildRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(
            Effect.gen(function*() {
              const grandchild = yield* pipe(Effect.never, Effect.fork)
              yield* Deferred.succeed(grandchildRef, grandchild)
              return yield* Effect.never
            }),
            Effect.fork
          )
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)
      const grandchild = yield* Deferred.await(grandchildRef)

      const snapshot = extractNodes(yield* Fiber.dumpGraph([parent], { output: "nodes", include: { children: true } }))
      assertSnapshotSorted(snapshot)
      strictEqual(snapshot.length, 3)

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))
      const grandchildId = fiberIdNumber(Fiber.id(grandchild))
      strictEqual(getNode(snapshot, parentId).children[0], childId)
      strictEqual(getNode(snapshot, childId).children[0], grandchildId)

      yield* Fiber.interrupt(grandchild)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(nodes) maxDepth partially expands children", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const grandchildRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(
            Effect.gen(function*() {
              const grandchild = yield* pipe(Effect.never, Effect.fork)
              yield* Deferred.succeed(grandchildRef, grandchild)
              return yield* Effect.never
            }),
            Effect.fork
          )
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)
      const grandchild = yield* Deferred.await(grandchildRef)

      const snapshot = extractNodes(yield* Fiber.dumpGraph([parent], { output: "nodes", include: { children: true }, maxDepth: 1 }))
      assertSnapshotSorted(snapshot)

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))
      const grandchildId = fiberIdNumber(Fiber.id(grandchild))

      strictEqual(snapshot.length, 2)
      strictEqual(getNode(snapshot, parentId).children[0], childId)
      strictEqual(getNode(snapshot, childId).children.length, 0)
      assertTrue(!snapshot.map((n: { id: number }) => n.id).includes(grandchildId))

      yield* Fiber.interrupt(grandchild)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(nodes) with settle captures multi-blocking deterministically", () =>
    Effect.gen(function*() {
      const t1 = yield* pipe(Effect.never, Effect.forkDaemon)
      const t2 = yield* pipe(Effect.never, Effect.forkDaemon)
      const waiter = yield* pipe(
        Effect.all([Fiber.await(t1), Fiber.await(t2)], { concurrency: "unbounded" }),
        Effect.forkDaemon
      )
      const graph = yield* Fiber.dumpGraph([waiter], {
        output: "nodes",
        include: { blockingOn: true },
        settle: { iterations: 50 }
      })
      const snapshot = extractNodes(graph)
      assertSnapshotSorted(snapshot)
      strictEqual(snapshot.length, 3)
      const waiterId = fiberIdNumber(Fiber.id(waiter))
      const t1Id = fiberIdNumber(Fiber.id(t1))
      const t2Id = fiberIdNumber(Fiber.id(t2))
      const waiterNode = getNode(snapshot, waiterId)
      strictEqual(waiterNode.blockingOn.length, 2)
      assertTrue(snapshot.map((n: { id: number }) => n.id).includes(t1Id))
      assertTrue(snapshot.map((n: { id: number }) => n.id).includes(t2Id))
      yield* Fiber.interrupt(t1)
      yield* Fiber.interrupt(t2)
      yield* Fiber.interrupt(waiter)
    }))

  it.effect("dumpGraph(nodes) maxDepth limits blocking discovery", () =>
    Effect.gen(function*() {
      const t = yield* pipe(Effect.never, Effect.forkDaemon)
      const waiter = yield* pipe(Fiber.await(t), Effect.forkDaemon)
      const g = yield* Fiber.dumpGraph([waiter], {
        output: "nodes",
        include: { blockingOn: true },
        settle: { iterations: 50 },
        maxDepth: 0
      })
      const snapshot = extractNodes(g)
      assertSnapshotSorted(snapshot)
      strictEqual(snapshot.length, 1)
      const tId = fiberIdNumber(Fiber.id(t))
      assertTrue(!snapshot.map((n: { id: number }) => n.id).includes(tId))
      yield* Fiber.interrupt(t)
      yield* Fiber.interrupt(waiter)
    }))

  it.effect("dumpGraph(dot) renders deterministic DOT output", () =>
    Effect.gen(function*() {
      const a = yield* pipe(Effect.never, Effect.forkDaemon)
      const b = yield* pipe(Effect.never, Effect.forkDaemon)
      const dot1 = yield* Fiber.dumpGraph([a, b], { output: "dot", include: { children: true, blockingOn: true }, settle: { iterations: 5 } })
      const dot2 = yield* Fiber.dumpGraph([b, a], { output: "dot", include: { children: true, blockingOn: true }, settle: { iterations: 5 } })
      if (typeof dot1 !== "string" || typeof dot2 !== "string") {
        throw new Error("expected DOT output")
      }
      assertTrue(dot1.length > 0)
      strictEqual(dot1, dot2)

      const nodeLineIds = dotNodeLineIdsInOrder(dot1)
      assertTrue(nodeLineIds.length >= 2)
      deepStrictEqual(nodeLineIds, [...nodeLineIds].sort((x, y) => x - y))

      const aId = fiberIdNumber(Fiber.id(a))
      const bId = fiberIdNumber(Fiber.id(b))
      assertTrue(dotHasNodeId(dot1, aId))
      assertTrue(dotHasNodeId(dot1, bId))
      yield* Fiber.interrupt(a)
      yield* Fiber.interrupt(b)
    }))

  it.effect("dumpGraph(dot) includes relationship edges only when requested", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const blocker = yield* pipe(Effect.never, Effect.forkDaemon)
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Fiber.await(blocker)
        }),
        Effect.forkDaemon
      )
      const child = yield* Deferred.await(childRef)

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))
      const blockerId = fiberIdNumber(Fiber.id(blocker))

      const childrenOnly = yield* Fiber.dumpGraph([parent], {
        output: "dot",
        include: { children: true },
        settle: { iterations: 50 }
      })
      if (typeof childrenOnly !== "string") {
        throw new Error("expected DOT output")
      }
      assertTrue(dotHasEdge(childrenOnly, parentId, childId))
      assertTrue(!dotHasEdge(childrenOnly, parentId, blockerId))

      const blockingOnly = yield* Fiber.dumpGraph([parent], {
        output: "dot",
        include: { blockingOn: true },
        settle: { iterations: 50 }
      })
      if (typeof blockingOnly !== "string") {
        throw new Error("expected DOT output")
      }
      assertTrue(dotHasEdge(blockingOnly, parentId, blockerId))
      assertTrue(!dotHasEdge(blockingOnly, parentId, childId))

      yield* Fiber.interrupt(blocker)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(graph) includes edges when relationship fields are included", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)
      const g = yield* Fiber.dumpGraph([parent], { output: "graph", include: { children: true } })
      if (!Graph.isGraph(g)) {
        throw new Error("expected Graph")
      }
      strictEqual(Graph.nodeCount(g), 2)
      assertTrue(Graph.edgeCount(g) > 0)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(graph) includes blocking edges when relationship fields are included", () =>
    Effect.gen(function*() {
      const t = yield* pipe(Effect.never, Effect.forkDaemon)
      const waiter = yield* pipe(Fiber.await(t), Effect.forkDaemon)
      const g = yield* Fiber.dumpGraph([waiter], {
        output: "graph",
        include: { blockingOn: true },
        settle: { iterations: 50 }
      })
      if (!Graph.isGraph(g)) {
        throw new Error("expected Graph")
      }
      assertTrue(Graph.nodeCount(g) >= 2)
      assertTrue(Graph.edgeCount(g) > 0)
      yield* Fiber.interrupt(t)
      yield* Fiber.interrupt(waiter)
    }))

  it.effect("dumpGraph(graph) node metadata mirrors nodes output for included relationship fields", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const blocker = yield* pipe(Effect.never, Effect.forkDaemon)
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Fiber.await(blocker)
        }),
        Effect.forkDaemon
      )
      const child = yield* Deferred.await(childRef)

      const nodesOut = yield* Fiber.dumpGraph([parent], {
        output: "nodes",
        include: { children: true, blockingOn: true },
        settle: { iterations: 50 }
      })
      const rawNodes = Array.isArray((nodesOut as any)?.nodes) ? (nodesOut as any).nodes : []
      for (const node of rawNodes) {
        strictEqual(typeof (node as any).id, "number")
        const children = Array.isArray((node as any).children) ? (node as any).children : []
        for (const child of children) {
          strictEqual(typeof child, "number")
        }
        const blockingOn = Array.isArray((node as any).blockingOn) ? (node as any).blockingOn : []
        for (const blocker of blockingOn) {
          strictEqual(typeof blocker, "number")
        }
      }
      const nodesSnapshot = extractNodes(nodesOut)
      assertSnapshotSorted(nodesSnapshot)

      const graphOut = yield* Fiber.dumpGraph([parent], {
        output: "graph",
        include: { children: true, blockingOn: true },
        settle: { iterations: 50 }
      })
      if (!Graph.isGraph(graphOut)) {
        throw new Error("expected Graph")
      }
      for (const [, node] of graphOut) {
        const n = node as any
        assertTrue(FiberId.isFiberId(n.id))
        assertTrue(typeof n.id !== "number")
        const children = Array.isArray(n.children) ? n.children : []
        for (const child of children) {
          strictEqual(typeof child, "number")
        }
        const blockingOn = Array.isArray(n.blockingOn) ? n.blockingOn : []
        for (const blocker of blockingOn) {
          strictEqual(typeof blocker, "number")
        }
      }
      const graphSnapshot = extractGraphNodes(graphOut)
      const graphSnapshotSorted = [...graphSnapshot].sort((a, b) => a.id - b.id)
      assertSnapshotSorted(graphSnapshotSorted)
      deepStrictEqual(graphSnapshotSorted, nodesSnapshot)

      yield* Fiber.interrupt(blocker)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(graph) excludes edges for relationships that are not requested", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const blocker = yield* pipe(Effect.never, Effect.forkDaemon)
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Fiber.await(blocker)
        }),
        Effect.forkDaemon
      )
      const child = yield* Deferred.await(childRef)

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))
      const blockerId = fiberIdNumber(Fiber.id(blocker))

      const childrenOnly = yield* Fiber.dumpGraph([parent], { output: "graph", include: { children: true }, settle: { iterations: 50 } })
      if (!Graph.isGraph(childrenOnly)) {
        throw new Error("expected Graph")
      }
      const childrenOnlyEdges = edgePairsByNodeId(childrenOnly)
      assertTrue(childrenOnlyEdges.some(([source, target]) => source === parentId && target === childId))
      assertTrue(!childrenOnlyEdges.some(([source, target]) => source === parentId && target === blockerId))

      const blockingOnly = yield* Fiber.dumpGraph([parent], { output: "graph", include: { blockingOn: true }, settle: { iterations: 50 } })
      if (!Graph.isGraph(blockingOnly)) {
        throw new Error("expected Graph")
      }
      const blockingOnlyEdges = edgePairsByNodeId(blockingOnly)
      assertTrue(blockingOnlyEdges.some(([source, target]) => source === parentId && target === blockerId))
      assertTrue(!blockingOnlyEdges.some(([source, target]) => source === parentId && target === childId))

      yield* Fiber.interrupt(blocker)
      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(graph) includes roots metadata when requested", () =>
    Effect.gen(function*() {
      const a = yield* pipe(Effect.never, Effect.forkDaemon)
      const b = yield* pipe(Effect.never, Effect.forkDaemon)
      const g = yield* Fiber.dumpGraph([a, b], { output: "graph", include: { roots: true } })
      if (!Graph.isGraph(g)) {
        throw new Error("expected Graph")
      }
      let roots = 0
      for (const [, node] of g) {
        const n = node as any
        if (n.isRoot === true) {
          roots++
        }
      }
      strictEqual(roots, 2)
      yield* Fiber.interrupt(a)
      yield* Fiber.interrupt(b)
    }))

  it.effect("dumpGraph(graph) include.roots marks only provided roots", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)

      const parentId = fiberIdNumber(Fiber.id(parent))
      const childId = fiberIdNumber(Fiber.id(child))

      const g = yield* Fiber.dumpGraph([parent], { output: "graph", include: { children: true, roots: true } })
      if (!Graph.isGraph(g)) {
        throw new Error("expected Graph")
      }

      let sawParent = false
      let sawChild = false
      for (const [, node] of g) {
        const n: any = node
        const idNum = fiberIdNumber(n.id as FiberId.FiberId)
        if (idNum === parentId) {
          sawParent = true
          strictEqual(n.isRoot, true)
        }
        if (idNum === childId) {
          sawChild = true
          strictEqual(n.isRoot, false)
        }
      }
      assertTrue(sawParent)
      assertTrue(sawChild)

      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(graph) omits relationship fields when not included", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Fiber.RuntimeFiber<unknown, unknown>>()
      const parent = yield* pipe(
        Effect.gen(function*() {
          const child = yield* pipe(Effect.never, Effect.fork)
          yield* Deferred.succeed(childRef, child)
          return yield* Effect.never
        }),
        Effect.fork
      )
      const child = yield* Deferred.await(childRef)

      const g = yield* Fiber.dumpGraph([parent], { output: "graph" })
      if (!Graph.isGraph(g)) {
        throw new Error("expected Graph")
      }
      strictEqual(Graph.nodeCount(g), 1)
      for (const [, node] of g) {
        const n: any = node
        assertTrue(!("children" in n))
        assertTrue(!("blockingOn" in n))
        assertTrue(!("isRoot" in n))
        assertTrue(!("threadName" in n))
      }

      yield* Fiber.interrupt(child)
      yield* Fiber.interrupt(parent)
    }))

  it.effect("dumpGraph(graph) returns a Graph with stable counts", () =>
    Effect.gen(function*() {
      const a = yield* pipe(Effect.never, Effect.forkDaemon)
      const b = yield* pipe(Effect.never, Effect.forkDaemon)
      const g = yield* Fiber.dumpGraph([a, b], { output: "graph", include: { threadName: true } })
      if (!Graph.isGraph(g)) {
        throw new Error("expected Graph")
      }
      strictEqual(Graph.nodeCount(g), 2)
      strictEqual(Graph.edgeCount(g), 0)
      for (const [, node] of g) {
        const n = node as any
        assertTrue(typeof n.threadName === "string")
      }
      yield* Fiber.interrupt(a)
      yield* Fiber.interrupt(b)
    })
  )
})

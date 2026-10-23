import * as BytePath from "../../BytePath.ts"
import * as Effect from "../../Effect.ts"
import * as Result from "../../Result.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as A from "./atomic.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as P from "./preparation.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Traversal state and acquisition
// -----------------------------------------------------------------------------

const CHAR_DOT = 46

const CHAR_FORWARD_SLASH = 47

interface Run<Target extends M.Target = M.Target> {
  readonly caller: E.Caller
  readonly receiver: R.Resource
  readonly anchor: R.Work
  readonly target: E.TargetSnapshot<Target>
}

const acquire = Effect.fnUntraced(
  function*<Target extends M.Target>(
    caller: E.Caller,
    target: Target,
    operation: string,
    maxVisits?: number
  ): Effect.fn.Return<Run<Target>, M.OperationError, Scope.Scope> {
    const scope = yield* Scope.Scope
    const runtime = caller.runtime
    const { anchor, bytes, engine } = yield* R.evaluate(() => {
      const bytes = E.addressBytes(target, operation, runtime.limits)
      if (maxVisits !== undefined) R.count(maxVisits, operation, "maxVisits")
      const anchor = runtime.persistent(caller.resource, operation, maxVisits === undefined ? undefined : { maxVisits })
      return { anchor, bytes, engine: E.resolveEngine(caller) }
    })
    const acquire = runtime.acquireScopedResource("lease", operation, scope, (receiver) => {
      receiver.releaseWith(() => runtime.finishPersistent(anchor))
      anchor.reserve(bytes)
      return {
        caller: E.createCaller(engine, caller.policy, receiver),
        receiver,
        anchor,
        target: E.snapshotTarget(target)
      }
    })
    return yield* Effect.onError(acquire, () => Effect.sync(() => runtime.finishPersistent(anchor)))
  },
  Effect.uninterruptible
)

const step = <A>(run: Run, operation: string, body: (tx: E.Transaction) => A): Effect.Effect<A, M.OperationError> =>
  E.runAtomic(run.caller, operation, [], () => {}, () => body, run.receiver, run.anchor.ticket)

const appendRoute = (route: E.SavedRoute, edge: E.RouteEdge): E.SavedRoute => ({
  id: edge.object,
  support: [...route.support, edge]
})

const appendPath = (base: BytePath.BytePath, name: BytePath.BytePath): BytePath.BytePath => {
  const a = BytePath.toBytes(base)
  const b = BytePath.toBytes(name)
  const bytes = new Uint8Array(a.length + 1 + b.length)
  bytes.set(a)
  bytes[a.length] = CHAR_FORWARD_SLASH
  bytes.set(b, a.length + 1)
  return Result.getOrThrow(BytePath.fromBytes(bytes))
}

interface Selected {
  readonly route: E.SavedRoute
  readonly relative: BytePath.BytePath
  readonly depth: number
}

interface Frame extends Selected {
  readonly resource: R.Resource
  children: ReadonlyArray<E.RouteEdge> | undefined
  index: number
}

const relative = (parent: BytePath.BytePath, name: BytePath.BytePath): BytePath.BytePath =>
  BytePath.byteLength(parent) === 1 && BytePath.toBytes(parent)[0] === CHAR_DOT ? name : appendPath(parent, name)

// -----------------------------------------------------------------------------
// Walking
// -----------------------------------------------------------------------------

export const walk = (
  caller: E.Caller,
  target: M.Target,
  options?: M.WalkOptions
): Stream.Stream<M.WalkRecord, M.VirtualFileSystemError> =>
  Stream.scoped(Stream.unwrap(Effect.gen(function*() {
    E.checkOptions(options, ["maxDepth", "maxVisits"], "walk")
    const maxDepth = options?.maxDepth === undefined
      ? Number.MAX_SAFE_INTEGER
      : R.count(options.maxDepth, "walk", "maxDepth")
    const run = yield* acquire(caller, target, "walk", options?.maxVisits)
    const frames: Array<Frame> = []
    let initialized = false
    const next: Effect.Effect<readonly [M.WalkRecord, undefined] | undefined, M.OperationError> = Effect.suspend<
      readonly [M.WalkRecord, undefined] | undefined,
      M.OperationError,
      never
    >(() => {
      if (!initialized) {
        return step(run, "walk", (tx) => {
          const route = tx.target(run.target, true)
          const path = E.asciiPath(".")
          tx.reserve(BigInt("1"))
          const record: M.WalkRecord = { root: true, path, object: tx.observation(route.object) }
          if (route.object.kind === "directory" && maxDepth > 0) {
            const retained = tx.retainRoute(run.receiver, { kind: "frame", route })
            frames.push({
              route: retained.route,
              relative: path,
              depth: 0,
              resource: retained.resource,
              children: undefined,
              index: 0
            })
          }
          initialized = true
          return [record, undefined] as const
        })
      }
      return Effect.gen(function*() {
        while (frames.length > 0) {
          const frame = frames[frames.length - 1]
          if (frame.children === undefined) {
            frame.children = yield* step(run, "walk", (tx) => {
              const route = tx.validateRoute(frame.route)
              if (route.object.kind !== "directory") return tx.wrongKind()
              tx.require(route.object, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
              const bindings = Array.from(route.object.entries.values()).sort((a, b) => BytePath.Order(a.name, b.name))
              let payload = BigInt("0")
              for (const binding of bindings) payload += BigInt(BytePath.byteLength(binding.name))
              tx.reserve(payload)
              tx.work.retain(payload, frame.resource)
              return bindings.map((binding) => {
                tx.visit()
                return E.routeEdge(route.object.id, binding)
              })
            })
          }
          if (frame.index >= frame.children.length) {
            frames.pop()
            yield* frame.resource.close
            continue
          }
          const child = frame.children[frame.index]
          return yield* step(run, "walk", (tx) => {
            const stable = appendRoute(frame.route, child)
            const route = tx.validateRoute(stable)
            const outputLength = BigInt(
              (BytePath.byteLength(frame.relative) === 1 && BytePath.toBytes(frame.relative)[0] === CHAR_DOT
                ? 0
                : BytePath.byteLength(frame.relative) + 1) + BytePath.byteLength(child.name)
            )
            tx.reserve(outputLength)
            const path = relative(frame.relative, child.name)
            // NOTE: Route validation already rejects lost bindings; missing entry context here is an internal defect.
            if (route.parent === undefined || route.binding === undefined) {
              throw new TypeError("Selected child has no binding")
            }
            const entry = tx.entry(route.parent, route.binding.name, route.binding)
            if (entry.state !== "present") throw new TypeError("Selected child is absent")
            const record: M.WalkRecord = { root: false, path, object: entry.object, entry }
            if (route.object.kind === "directory" && frame.depth + 1 < maxDepth) {
              const retained = tx.retainRoute(run.receiver, { kind: "frame", route: stable })
              frames.push({
                route: retained.route,
                relative: path,
                depth: frame.depth + 1,
                resource: retained.resource,
                children: undefined,
                index: 0
              })
            }
            frame.index++
            return [record, undefined] as const
          })
        }
        return undefined
      })
    })
    return Stream.unfold(undefined, () => next)
  })))

// -----------------------------------------------------------------------------
// Recursive removal
// -----------------------------------------------------------------------------

export const removeRecursive = Effect.fnUntraced(
  function*(
    caller: E.Caller,
    target: M.EntryTarget,
    options?: M.RemoveOptions
  ): Effect.fn.Return<void, M.OperationError, Scope.Scope> {
    const fixed = yield* R.evaluate(() => {
      E.checkOptions(options, ["entry", "parentNamespace", "maxVisits"], "removeRecursive")
      A.validate(
        "unlink",
        options === undefined ? undefined : { entry: options.entry, parentNamespace: options.parentNamespace }
      )
      return options === undefined ? undefined : {
        ...P.snapshotConditions(
          { entry: options.entry, parentNamespace: options.parentNamespace },
          "removeRecursive"
        ),
        maxVisits: options.maxVisits
      }
    })
    const run = yield* acquire(caller, target, "removeRecursive", fixed?.maxVisits)
    const initial = yield* step(run, "removeRecursive", (tx) => {
      const slot = tx.slot(run.target)
      tx.require(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
      tx.conditions(slot.parent, slot.binding, fixed)
      if (slot.binding === undefined) throw new M.NotFound({ operation: "removeRecursive", reason: "missingEntry" })
      const route = tx.target(run.target, false)
      const retained = tx.retainRoute(run.receiver, { kind: "frame", route })
      return { route: retained.route, parent: slot.parent.id, name: slot.name, resource: retained.resource }
    })
    const stack: Array<{ readonly route: E.SavedRoute; readonly resource: R.Resource }> = [{
      route: initial.route,
      resource: initial.resource
    }]
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const outcome = yield* step(run, "removeRecursive", (tx) => {
        const top = tx.validateRoute(initial.route)
        if (top.parent === undefined || top.binding === undefined) {
          throw new M.AccessDenied({ operation: "removeRecursive", reason: "confinement" })
        }
        tx.conditions(top.parent, top.binding, fixed)
        const route = tx.validateRoute(frame.route)
        if (route.parent === undefined || route.binding === undefined) {
          throw new M.AccessDenied({ operation: "removeRecursive", reason: "confinement" })
        }
        const node = route.object
        if (node.kind === "directory" && node.entries.size > 0) {
          tx.require(node, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
          const binding = Array.from(node.entries.values()).sort((a, b) => BytePath.Order(a.name, b.name))[0]
          tx.visit()
          const stable = appendRoute(frame.route, E.routeEdge(node.id, binding))
          const retained = tx.retainRoute(run.receiver, { kind: "frame", route: stable })
          return { kind: "descend" as const, route: retained.route, resource: retained.resource }
        }
        const address: M.EntryAddress = { directory: tx.engine.reference(route.parent.id), name: route.binding.name }
        const guard: M.EntryConditions = {
          entry: {
            expected: "binding",
            binding: M.issueToken("binding", tx.engine.runtime.instanceNumber, route.parent.id, route.binding.version)
          }
        }
        if (node.kind === "directory") A.removeDirectory(tx, address, guard)
        else A.unlink(tx, address, guard)
        return { kind: "removed" as const }
      })
      if (outcome.kind === "descend") stack.push({ route: outcome.route, resource: outcome.resource })
      else {
        stack.pop()
        yield* frame.resource.close
      }
      if (stack.length > 0) yield* Effect.yieldNow
    }
  },
  Effect.scoped
)

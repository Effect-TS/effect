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
  ) {
    const scope = yield* Scope.Scope
    const runtime = caller.runtime
    const { anchor, bytes, engine } = yield* Effect.suspend(() =>
      Result.match(
        Result.try(() =>
          Result.gen(function*() {
            const bytes = yield* E.addressBytesResult(target, operation, runtime.limits)
            if (maxVisits !== undefined) yield* R.countResult(maxVisits, operation, "maxVisits")
            const anchor = yield* runtime.persistentResult(
              caller.resource,
              operation,
              maxVisits === undefined ? undefined : { maxVisits }
            )
            return { anchor, bytes, engine: E.resolveEngine(caller) }
          })
        ),
        { onFailure: R.failure, onSuccess: Effect.fromResult }
      )
    )
    const acquire = runtime.acquireScopedResourceResult(
      "lease",
      operation,
      scope,
      (receiver) =>
        Result.gen(function*() {
          yield* receiver.releaseWithResult(() => runtime.finishPersistent(anchor))
          yield* anchor.reserveResult(bytes)
          const retained = yield* E.createCallerResult(engine, caller.policy, receiver)
          const selected = yield* E.snapshotTargetResult(target)
          return { caller: retained, receiver, anchor, target: selected }
        })
    )
    return yield* Effect.onError(acquire, () => Effect.sync(() => runtime.finishPersistent(anchor)))
  },
  Effect.uninterruptible
)

const step = <A>(
  run: Run,
  operation: string,
  body: (tx: E.Transaction) => Result.Result<A, M.OperationError>
) =>
  E.runAtomicResult(
    run.caller,
    operation,
    [],
    () => Result.succeed(undefined),
    () => Result.succeed(body),
    run.receiver,
    run.anchor.ticket
  )

const appendRoute = (route: E.SavedRoute, edge: E.RouteEdge) => ({
  id: edge.object,
  support: [...route.support, edge]
})

const appendPath = (base: BytePath.BytePath, name: BytePath.BytePath) => {
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

const relative = (parent: BytePath.BytePath, name: BytePath.BytePath) =>
  BytePath.byteLength(parent) === 1 && BytePath.toBytes(parent)[0] === CHAR_DOT ? name : appendPath(parent, name)

// -----------------------------------------------------------------------------
// Walking
// -----------------------------------------------------------------------------

/** @internal */
export const walk = (
  caller: E.Caller,
  target: M.Target,
  options?: M.WalkOptions
) =>
  Stream.scoped(Stream.unwrap(Effect.gen(function*() {
    // Walk reports option-shape and maxDepth errors as defects before acquiring traversal work.
    const settings = yield* Effect.suspend(() =>
      Effect.orDie(Effect.fromResult(Result.gen(function*() {
        yield* E.checkOptionsResult(options, ["maxDepth", "maxVisits"], "walk")
        const maxDepth = options?.maxDepth === undefined
          ? Number.MAX_SAFE_INTEGER
          : yield* R.countResult(options.maxDepth, "walk", "maxDepth")
        return { maxDepth, maxVisits: options?.maxVisits }
      })))
    )
    const { maxDepth } = settings
    const run = yield* acquire(caller, target, "walk", settings.maxVisits)
    const frames: Array<Frame> = []
    let initialized = false
    const next: Effect.Effect<readonly [M.WalkRecord, undefined] | undefined, M.OperationError> = Effect.suspend<
      readonly [M.WalkRecord, undefined] | undefined,
      M.OperationError,
      never
    >(() => {
      if (!initialized) {
        return step(run, "walk", (tx) =>
          Result.gen(function*() {
            const route = yield* tx.targetResult(run.target, true)
            const path = Result.getOrThrow(BytePath.fromString("."))
            yield* tx.reserveResult(BigInt("1"))
            const record: M.WalkRecord = { root: true, path, object: tx.observation(route.object) }
            if (route.object.kind === "directory" && maxDepth > 0) {
              const retained = yield* tx.retainRouteResult(run.receiver, { kind: "frame", route })
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
          }))
      }
      return Effect.gen(function*() {
        while (frames.length > 0) {
          const frame = frames[frames.length - 1]
          if (frame.children === undefined) {
            frame.children = yield* step(run, "walk", (tx) =>
              Result.gen(function*() {
                const route = yield* tx.validateRouteResult(frame.route)
                if (route.object.kind !== "directory") {
                  return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
                }
                yield* tx.requireResult(route.object, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
                const bindings = Array.from(route.object.entries.values()).sort((a, b) =>
                  BytePath.Order(a.name, b.name)
                )
                let payload = BigInt("0")
                for (const binding of bindings) payload += BigInt(BytePath.byteLength(binding.name))
                yield* tx.reserveResult(payload)
                yield* tx.work.retainResult(payload, frame.resource)
                const children: Array<E.RouteEdge> = []
                for (const binding of bindings) {
                  yield* tx.visitResult()
                  children.push(E.routeEdge(route.object.id, binding))
                }
                return children
              }))
          }
          if (frame.index >= frame.children.length) {
            frames.pop()
            yield* frame.resource.close
            continue
          }
          const child = frame.children[frame.index]
          return yield* step(run, "walk", (tx) =>
            Result.gen(function*() {
              const stable = appendRoute(frame.route, child)
              const route = yield* tx.validateRouteResult(stable)
              const outputLength = BigInt(
                (BytePath.byteLength(frame.relative) === 1 && BytePath.toBytes(frame.relative)[0] === CHAR_DOT
                  ? 0
                  : BytePath.byteLength(frame.relative) + 1) + BytePath.byteLength(child.name)
              )
              yield* tx.reserveResult(outputLength)
              const path = relative(frame.relative, child.name)
              // NOTE: Route validation already rejects lost bindings; missing entry context here is an internal defect.
              if (route.parent === undefined || route.binding === undefined) {
                throw new TypeError("Selected child has no binding")
              }
              const entry = yield* tx.entryResult(route.parent, route.binding.name, route.binding)
              if (entry.state !== "present") throw new TypeError("Selected child is absent")
              const record: M.WalkRecord = { root: false, path, object: entry.object, entry }
              if (route.object.kind === "directory" && frame.depth + 1 < maxDepth) {
                const retained = yield* tx.retainRouteResult(run.receiver, { kind: "frame", route: stable })
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
            }))
        }
        return undefined
      })
    })
    return Stream.unfold(undefined, () => next)
  })))

// -----------------------------------------------------------------------------
// Recursive removal
// -----------------------------------------------------------------------------

/** @internal */
export const removeRecursive = Effect.fnUntraced(
  function*(
    caller: E.Caller,
    target: M.EntryTarget,
    options?: M.RemoveOptions
  ) {
    const fixed = yield* Effect.suspend(() =>
      Result.match(
        Result.try(() =>
          Result.gen(function*() {
            yield* E.checkOptionsResult(options, ["entry", "parentNamespace", "maxVisits"], "removeRecursive")
            yield* A.validate(
              "unlink",
              options === undefined ? undefined : { entry: options.entry, parentNamespace: options.parentNamespace }
            )
            if (options === undefined) return undefined
            const conditions = yield* P.snapshotConditions(
              { entry: options.entry, parentNamespace: options.parentNamespace },
              "removeRecursive"
            )
            return { ...conditions, maxVisits: options.maxVisits }
          })
        ),
        { onFailure: R.failure, onSuccess: Effect.fromResult }
      )
    )
    const run = yield* acquire(caller, target, "removeRecursive", fixed?.maxVisits)
    const initial = yield* step(run, "removeRecursive", (tx) =>
      Result.gen(function*() {
        const slot = yield* tx.slotResult(run.target)
        yield* tx.requireResult(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
        yield* tx.conditionsResult(slot.parent, slot.binding, fixed)
        if (slot.binding === undefined) {
          return yield* Result.fail(new M.NotFound({ operation: "removeRecursive", reason: "missingEntry" }))
        }
        const route = yield* tx.targetResult(run.target, false)
        const retained = yield* tx.retainRouteResult(run.receiver, { kind: "frame", route })
        return { route: retained.route, parent: slot.parent.id, name: slot.name, resource: retained.resource }
      }))
    const stack: Array<{ readonly route: E.SavedRoute; readonly resource: R.Resource }> = [{
      route: initial.route,
      resource: initial.resource
    }]
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const outcome = yield* step(run, "removeRecursive", (tx) =>
        Result.gen(function*() {
          const top = yield* tx.validateRouteResult(initial.route)
          if (top.parent === undefined || top.binding === undefined) {
            return yield* Result.fail(new M.AccessDenied({ operation: "removeRecursive", reason: "confinement" }))
          }
          yield* tx.conditionsResult(top.parent, top.binding, fixed)
          const route = yield* tx.validateRouteResult(frame.route)
          if (route.parent === undefined || route.binding === undefined) {
            return yield* Result.fail(new M.AccessDenied({ operation: "removeRecursive", reason: "confinement" }))
          }
          const node = route.object
          if (node.kind === "directory" && node.entries.size > 0) {
            yield* tx.requireResult(node, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
            const binding = Array.from(node.entries.values()).sort((a, b) => BytePath.Order(a.name, b.name))[0]
            yield* tx.visitResult()
            const stable = appendRoute(frame.route, E.routeEdge(node.id, binding))
            const retained = yield* tx.retainRouteResult(run.receiver, { kind: "frame", route: stable })
            return { kind: "descend" as const, route: retained.route, resource: retained.resource }
          }
          const address: M.EntryAddress = { directory: tx.engine.reference(route.parent.id), name: route.binding.name }
          const guard: M.EntryConditions = {
            entry: {
              expected: "binding",
              binding: M.issueToken("binding", tx.engine.runtime.instanceNumber, route.parent.id, route.binding.version)
            }
          }
          if (node.kind === "directory") yield* A.removeDirectory(tx, address, guard)
          else yield* A.unlink(tx, address, guard)
          return { kind: "removed" as const }
        }))
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

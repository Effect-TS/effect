import * as BytePath from "../../BytePath.ts"
import type * as ByteSize from "../../ByteSize.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import * as Result from "../../Result.ts"
import * as Scope from "../../Scope.ts"
import * as A from "./atomic.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as P from "./preparation.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Operation context and leases
// -----------------------------------------------------------------------------

interface OperationContext {
  readonly caller: E.Caller
  readonly resource: R.Resource
  readonly ticket: R.Ticket
}

const zero = BigInt(0)
const two = BigInt(2)
const three = BigInt(3)

interface Lease {
  readonly context: OperationContext
  readonly resource: R.Resource
}

const requireOpenResult = (
  context: OperationContext,
  operation: string,
  lease?: R.Resource
) => {
  if (context.caller.runtime.inTurn) return Result.fail(new M.ReentrantOperation({ operation, reason: "sameInstance" }))
  if (context.resource.state !== "open") return Result.fail(R.closed(operation, context.resource.state))
  if (lease !== undefined && lease.state !== "open") return Result.fail(R.closed(operation, lease.state))
  return Result.succeed(undefined)
}

const checkLeaseResult = <L extends Lease>(
  context: OperationContext,
  lease: L | undefined,
  operation: string
) => {
  if (lease === undefined) return Result.fail(new M.InvalidInput({ operation, field: "lease", reason: "malformed" }))
  if (lease.context !== context) return Result.fail(new M.InvalidResource({ operation, reason: "foreign" }))
  if (lease.resource.state !== "open") return Result.fail(R.closed(operation, lease.resource.state))
  return Result.succeed(lease)
}

// -----------------------------------------------------------------------------
// Budgets and session acquisition
// -----------------------------------------------------------------------------

const reserveManual = Effect.fnUntraced(
  function*(
    context: OperationContext,
    input: ByteSize.Input
  ) {
    const operation = "reservePayload"
    const runtime = context.caller.runtime
    const { resource, bytes } = yield* Effect.suspend(() =>
      Effect.fromResult(Result.gen(function*() {
        yield* requireOpenResult(context, operation)
        const bytes = yield* R.sizeResult(input, operation, "bytes")
        return { resource: yield* runtime.resourceResult("lease", operation), bytes }
      }))
    )
    return yield* Effect.onError(
      Effect.suspend(() =>
        Effect.fromResult(Result.gen(function*() {
          yield* context.resource.ownResult(resource)
          const charge = new R.ChargedBytes(runtime, operation)
          yield* resource.releaseWithResult(() => charge.clear())
          yield* charge.reserveResult(bytes)
          const value: M.PayloadReservation = {
            [M.PayloadHoldTypeId]: M.PayloadHoldTypeId,
            [M.PayloadReservationTypeId]: M.PayloadReservationTypeId,
            release: resource.close,
            resize: (input) =>
              budgetOnly(Effect.suspend(() =>
                Effect.fromResult(Result.gen(function*() {
                  const operation = "resizePayload"
                  yield* requireOpenResult(context, operation, resource)
                  const next = yield* R.sizeResult(input, operation, "totalBytes")
                  yield* charge.resizeResult(next, operation)
                }))
              ))
          }
          return Object.freeze(value)
        }))
      ),
      () => resource.close
    )
  },
  Effect.uninterruptible
)

const budgetOnly = <A>(
  effect: Effect.Effect<A, M.OperationError>
) =>
  Effect.catchTag(effect, [
    "NotFound",
    "AlreadyExists",
    "AccessDenied",
    "ConditionFailed",
    "NamespaceChanged",
    "Busy",
    "CapabilityUnavailable"
  ], Effect.die)

const traversalOnly = <A>(effect: Effect.Effect<A, M.OperationError>) =>
  Effect.catchTag(effect, ["AlreadyExists", "ConditionFailed", "CapabilityUnavailable"], Effect.die)

const makeBudget = (context: OperationContext) =>
  Object.freeze<M.OperationBudget>({
    [M.OperationBudgetTypeId]: M.OperationBudgetTypeId,
    reservePayload: (bytes) => budgetOnly(reserveManual(context, bytes)),
    consumeComparisons: (input) =>
      budgetOnly(Effect.suspend(() =>
        Effect.fromResult(Result.gen(function*() {
          const operation = "consumeComparisons"
          yield* requireOpenResult(context, operation)
          const count = yield* R.countResult(input, operation, "count")
          const ledger = context.ticket.ledger
          if (count > ledger.maxComparisons - ledger.comparisons) {
            return yield* Result.fail(new M.LimitExceeded({ operation, domain: "comparisons", stage: "traversal" }))
          }
          ledger.comparisons += count
        }))
      ))
  })

const makeSession = (context: OperationContext) => {
  const budget = makeBudget(context)
  return Object.freeze<M.OperationSession>({
    [M.OperationSessionTypeId]: M.OperationSessionTypeId,
    files: makeFiles(context),
    budget,
    traversal: (options) => makeTraversal(context, budget, options),
    close: context.resource.close
  })
}

export const acquireOperation = Effect.fnUntraced(
  function*(
    source: E.Caller,
    options?: M.OperationOptions
  ) {
    const scope = yield* Scope.Scope
    const runtime = source.runtime
    const { engine, settings } = yield* Effect.suspend(() =>
      Result.match(
        Result.try(() =>
          Result.gen(function*() {
            if (runtime.inTurn) {
              return yield* Result.fail(
                new M.ReentrantOperation({ operation: "acquireOperation", reason: "sameInstance" })
              )
            }
            if (source.resource.state !== "open") {
              return yield* Result.fail(R.closed("acquireOperation", source.resource.state))
            }
            yield* E.checkOptionsResult(options, ["maxVisits", "maxComparisons", "maxCopyBytes"], "acquireOperation")
            const ledger = yield* runtime.ledgerResult(
              options === undefined ? undefined : {
                maxVisits: options.maxVisits,
                maxComparisons: options.maxComparisons,
                maxCopyBytes: options.maxCopyBytes
              },
              "acquireOperation"
            )
            if (source.resource.state !== "open") {
              return yield* Result.fail(R.closed("acquireOperation", source.resource.state))
            }
            return {
              engine: E.resolveEngine(source),
              settings: {
                maxVisits: ledger.maxVisits,
                maxComparisons: ledger.maxComparisons,
                maxCopyBytes: ledger.maxCopyBytes
              }
            }
          })
        ),
        { onFailure: R.failure, onSuccess: Effect.fromResult }
      )
    )
    return yield* runtime.acquireScopedResourceResult(
      "operation",
      "acquireOperation",
      scope,
      (resource) =>
        Result.gen(function*() {
          yield* engine.retainResult(source.policy, resource)
          const ticket = yield* runtime.ticketResult("acquireOperation", settings)
          yield* resource.releaseWithResult(() => runtime.releaseTicket(ticket))
          const caller = yield* E.createCallerResult(engine, source.policy, resource)
          const context = { caller, resource, ticket }
          return makeSession(context)
        })
    )
  },
  Effect.uninterruptible
)

export const acquireTraversal = Effect.fnUntraced(
  function*(
    source: E.Caller,
    options?: M.TraversalOptions
  ) {
    yield* Effect.suspend(() =>
      Result.match(
        Result.try(() =>
          Result.gen(function*() {
            if (source.runtime.inTurn) {
              return yield* Result.fail(
                new M.ReentrantOperation({ operation: "acquireTraversal", reason: "sameInstance" })
              )
            }
            if (source.resource.state !== "open") {
              return yield* Result.fail(R.closed("acquireTraversal", source.resource.state))
            }
            yield* E.checkOptionsResult(
              options,
              ["base", "maxVisits", "maxComparisons", "maxCopyBytes"],
              "acquireTraversal"
            )
          })
        ),
        { onFailure: R.failure, onSuccess: Effect.fromResult }
      )
    )
    const session = yield* acquireOperation(
      source,
      options === undefined ? undefined : {
        ...(options.maxVisits === undefined ? {} : { maxVisits: options.maxVisits }),
        ...(options.maxComparisons === undefined ? {} : { maxComparisons: options.maxComparisons }),
        ...(options.maxCopyBytes === undefined ? {} : { maxCopyBytes: options.maxCopyBytes })
      }
    )
    return yield* Effect.onError(
      session.traversal(options?.base === undefined ? undefined : { base: options.base }),
      () => session.close
    )
  }
)

// -----------------------------------------------------------------------------
// Namespace traversal
// -----------------------------------------------------------------------------

interface RouteLease extends Lease {
  readonly route: E.SavedRoute
}

// Membership finds the issued state; checkLease still enforces its session and lifetime.
const directoryLeases = new WeakMap<object, RouteLease>()
const selectionLeases = new WeakMap<object, RouteLease>()

const directoryLease = (candidate: unknown) =>
  typeof candidate === "object" && candidate !== null ? directoryLeases.get(candidate) : undefined

const selectionLease = (candidate: unknown) =>
  typeof candidate === "object" && candidate !== null ? selectionLeases.get(candidate) : undefined

const isSelection = (candidate: unknown): candidate is M.TraversalSelection => selectionLease(candidate) !== undefined

const registerDirectory = (view: M.TraversalDirectory, lease: RouteLease) => {
  directoryLeases.set(view, lease)
}

const registerSelection = (view: M.TraversalSelection, lease: RouteLease) => {
  selectionLeases.set(view, lease)
}

const location = (
  context: OperationContext,
  tx: E.Transaction,
  route: E.Route
) =>
  Result.gen(function*() {
    if (route.object.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    const retained = yield* tx.retainRouteResult(context.resource, { kind: "traversal", route, outputBytes: zero })
    const lease = { context, ...retained }
    const value = Object.freeze<M.TraversalDirectory>({
      [M.TraversalDirectoryTypeId]: M.TraversalDirectoryTypeId,
      release: lease.resource.close
    })
    registerDirectory(value, lease)
    return value
  })

const selection = (
  context: OperationContext,
  tx: E.Transaction,
  route: E.Route,
  named: boolean
) =>
  Result.gen(function*() {
    const entry = named && route.parent !== undefined && route.binding !== undefined
      ? yield* tx.entryResult(route.parent, route.binding.name, route.binding)
      : undefined
    if (entry !== undefined && entry.state !== "present") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    const retained = yield* tx.retainRouteResult(context.resource, {
      kind: "traversal",
      route,
      outputBytes: entry === undefined ? zero : BigInt(BytePath.byteLength(entry.name))
    })
    const lease = { context, ...retained }
    const value = Object.freeze<M.TraversalSelection>({
      [M.TraversalSelectionTypeId]: M.TraversalSelectionTypeId,
      object: entry === undefined ? tx.observation(route.object) : entry.object,
      entry: entry === undefined ? Option.none() : Option.some(entry),
      release: lease.resource.close
    })
    registerSelection(value, lease)
    return { value, lease }
  })

const stepResult = <A>(
  context: OperationContext,
  operation: string,
  targets: ReadonlyArray<M.Target | M.DirectorySelector>,
  leases: ReadonlyArray<Lease>,
  snapshot: (work: R.Work) => Result.Result<(tx: E.Transaction) => Result.Result<A, M.OperationError>, M.OperationError>
) =>
  E.runAtomicResult(
    context.caller,
    operation,
    targets,
    () => Result.succeed(undefined),
    (work) =>
      Result.gen(function*() {
        yield* requireOpenResult(context, operation)
        for (const lease of leases) {
          yield* checkLeaseResult(context, lease, operation)
          yield* work.borrowResult(lease.resource)
        }
        return yield* snapshot(work)
      }),
    context.resource,
    context.ticket
  )

const makeTraversal = (
  context: OperationContext,
  budget: M.OperationBudget,
  options?: M.TraversalViewOptions
) =>
  traversalOnly(Effect.suspend(() =>
    Result.match(
      Result.try(() =>
        Result.gen(function*() {
          yield* requireOpenResult(context, "traversal")
          yield* E.checkOptionsResult(options, ["base"], "traversal")
          const base = options?.base ?? "."
          return stepResult(context, "traversal", [base], [], () =>
            Result.succeed((tx: E.Transaction) =>
              Result.gen(function*() {
                const route = yield* tx.selectDirectoryRouteResult(base)
                const directory = yield* location(context, tx, route)
                return Object.freeze<M.NamespaceTraversal>({
                  [M.NamespaceTraversalTypeId]: M.NamespaceTraversalTypeId,
                  base: directory,
                  select: (directory, probe) => select(context, directory, probe),
                  list: (directory) => list(context, directory),
                  classify: (selected) =>
                    classify(context, selected),
                  budget,
                  close: context.resource.close
                })
              })
            ))
        })
      ),
      {
        onFailure: R.failure,
        onSuccess: (prepared) => Effect.flatten(Effect.fromResult(prepared))
      }
    )
  ))

const select = (
  context: OperationContext,
  directory: M.TraversalDirectory,
  probe: M.TraversalProbe
) =>
  traversalOnly(Effect.suspend(() =>
    Result.match(
      Result.try(() =>
        Result.gen(function*() {
          yield* requireOpenResult(context, "select")
          const lease = yield* checkLeaseResult(context, directoryLease(directory), "select")
          const navigation = probe?._tag
          let fixed: M.TraversalProbe
          if (navigation === "Name") fixed = { _tag: navigation, name: probe.name }
          else if (navigation === "Current" || navigation === "Parent" || navigation === "Root") {
            fixed = { _tag: navigation }
          } else {
            return yield* Result.fail(new M.InvalidInput({ operation: "select", field: "probe", reason: "malformed" }))
          }
          return stepResult(context, "select", fixed._tag === "Name" ? [fixed.name] : [], [lease], () =>
            Result.succeed((tx: E.Transaction) =>
              Result.gen(function*() {
                let route: E.Route
                if (fixed._tag === "Root") {
                  route = yield* tx.resolveResult(E.asciiPath("/"), true)
                } else {
                  const path = fixed._tag === "Name"
                    ? yield* E.nameValueResult(fixed.name, tx.operation)
                    : E.asciiPath(fixed._tag === "Parent" ? ".." : ".")
                  if (fixed._tag === "Name" && BigInt(BytePath.byteLength(path)) > tx.engine.runtime.limits.nameBytes) {
                    return yield* Result.fail(
                      new M.LimitExceeded({ operation: tx.operation, domain: "name", stage: "resolution" })
                    )
                  }
                  const child = tx.childRouteResult(lease.route, path, false)
                  if (
                    Result.isFailure(child) && fixed._tag === "Name" && child.failure instanceof M.NotFound &&
                    child.failure.reason === "missingEntry"
                  ) {
                    return Option.none()
                  }
                  route = yield* child
                }
                const selected = yield* selection(context, tx, route, fixed._tag === "Name")
                return Option.some(selected.value)
              })
            ))
        })
      ),
      {
        onFailure: R.failure,
        onSuccess: (prepared) => Effect.flatten(Effect.fromResult(prepared))
      }
    )
  ))

const list = (
  context: OperationContext,
  directory: M.TraversalDirectory
) =>
  traversalOnly(Effect.suspend(() => {
    return Effect.flatten(Effect.fromResult(Result.gen(function*() {
      yield* requireOpenResult(context, "list")
      const lease = yield* checkLeaseResult(context, directoryLease(directory), "list")
      return stepResult(context, "list", [], [lease], () =>
        Result.succeed((tx: E.Transaction) =>
          Result.gen(function*() {
            const route = yield* tx.validateRouteResult(lease.route)
            if (route.object.kind !== "directory") {
              return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
            }
            yield* tx.requireResult(route.object, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
            const bindings = [...route.object.entries.values()].sort((a, b) => BytePath.Order(a.name, b.name))
            const entries: Array<M.NamedTraversalSelection> = []
            for (const binding of bindings) {
              yield* tx.visitResult()
              const child: E.Route = {
                object: yield* tx.getResult(binding.object),
                parent: route.object,
                binding,
                support: [...lease.route.support, E.routeEdge(route.object.id, binding)]
              }
              const created = yield* selection(context, tx, child, true)
              const selected = created.value
              if (Option.isNone(selected.entry)) {
                return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
              }
              const named = Object.freeze({ ...selected, entry: selected.entry })
              registerSelection(named, created.lease)
              entries.push(named)
            }
            yield* tx.touchResult(route.object.id, ["atime"])
            const observation = tx.observation(yield* tx.getResult(route.object.id))
            if (observation.kind !== "directory") {
              return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
            }
            return { directory: observation, entries }
          })
        ))
    })))
  }))

const classify = (
  context: OperationContext,
  selected: M.TraversalSelection
) =>
  traversalOnly(Effect.suspend(() => {
    return Effect.flatten(Effect.fromResult(Result.gen(function*() {
      yield* requireOpenResult(context, "classify")
      const lease = yield* checkLeaseResult(context, selectionLease(selected), "classify")
      return stepResult(context, "classify", [], [lease], () =>
        Result.succeed((tx: E.Transaction): Result.Result<M.TraversalClassification, M.OperationError> =>
          Result.gen(function*() {
            let route = yield* tx.validateRouteResult(lease.route)
            if (route.object.kind === "symlink") {
              const followed = tx.followRouteResult(lease.route)
              if (
                Result.isFailure(followed) && followed.failure instanceof M.NotFound &&
                followed.failure.reason === "missingEntry"
              ) {
                return { kind: "nonDirectory" }
              }
              route = yield* followed
            }
            return route.object.kind === "directory"
              ? { kind: "directory", directory: yield* location(context, tx, route) }
              : { kind: "nonDirectory" }
          })
        ))
    })))
  }))

// -----------------------------------------------------------------------------
// Payload leases and reads
// -----------------------------------------------------------------------------

const fixedHold = (
  context: OperationContext,
  work: R.Work,
  bytes: bigint
) =>
  Result.gen(function*() {
    const resource = yield* work.acquireResourceResult("lease", context.resource)
    yield* work.retainResult(bytes, resource)
    return Object.freeze<M.PayloadHold>({ [M.PayloadHoldTypeId]: M.PayloadHoldTypeId, release: resource.close })
  })

const readLease = <A>(hold: M.PayloadHold, value: A) =>
  Object.freeze<M.ReadLease<A>>({
    ...hold,
    [M.ReadLeaseTypeId]: M.ReadLeaseTypeId,
    value
  })

const readLimits = (tx: E.Transaction, bytes: bigint, file: boolean) => {
  if (bytes > tx.engine.runtime.limits.ioBytes) {
    return Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "io", stage: "reservation" }))
  }
  if (file && bytes > tx.engine.runtime.limits.fileBytes) {
    return Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "file", stage: "reservation" }))
  }
  return Result.succeed(undefined)
}

const readForText = (context: OperationContext, target: M.Target) =>
  R.readOnly(
    stepResult(context, "readForText", [target], [], () =>
      Result.map(E.snapshotTargetResult(target), (selected) =>
      (tx: E.Transaction) =>
        Result.gen(function*() {
          const { object: node } = yield* tx.targetResult(selected)
          if (node.kind !== "file") {
            return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
          }
          yield* tx.requireResult(node, E.READ_PERMISSION)
          const bytes = BigInt(node.data.length)
          yield* readLimits(tx, bytes, true)
          yield* tx.reserveResult(three * bytes)
          const input = yield* fixedHold(context, tx.work, bytes)
          const output = yield* fixedHold(context, tx.work, two * bytes)
          const value = node.data.slice()
          yield* tx.touchResult(node.id, ["atime"])
          return { bytes: readLease(input, value), output }
        })))
  )

const readForCopy = (
  context: OperationContext,
  source: M.EntryTarget | M.TraversalSelection,
  options?: M.CopyReadOptions
) =>
  traversalOnly(Effect.suspend(() =>
    Result.match(
      Result.try(() =>
        Result.gen(function*() {
          yield* requireOpenResult(context, "readForCopy")
          const sourcePlan: { readonly kind: "selection"; readonly lease: RouteLease } | {
            readonly kind: "target"
            readonly target: M.EntryTarget
          } = isSelection(source)
            ? { kind: "selection", lease: yield* checkLeaseResult(context, selectionLease(source), "readForCopy") }
            : M.isToken(source)
            ? yield* Result.fail(new M.InvalidInput({ operation: "readForCopy", field: "source", reason: "malformed" }))
            : { kind: "target", target: source }
          yield* E.checkOptionsResult(options, ["followFinalSymlink"], "readForCopy")
          if (options?.followFinalSymlink !== undefined && typeof options.followFinalSymlink !== "boolean") {
            return yield* Result.fail(
              new M.InvalidInput({ operation: "readForCopy", field: "followFinalSymlink", reason: "malformed" })
            )
          }
          const follow = options?.followFinalSymlink ?? false
          return stepResult(
            context,
            "readForCopy",
            sourcePlan.kind === "target" ? [sourcePlan.target] : [],
            sourcePlan.kind === "selection" ? [sourcePlan.lease] : [],
            () =>
              Result.gen(function*() {
                let resolve: (tx: E.Transaction) => Result.Result<E.Route, M.OperationError>
                if (sourcePlan.kind === "target") {
                  const target = yield* E.snapshotTargetResult(sourcePlan.target)
                  resolve = (tx) => tx.targetResult(target, follow)
                } else {
                  const selected = sourcePlan.lease
                  resolve = (tx) =>
                    follow ? tx.followRouteResult(selected.route) : tx.validateRouteResult(selected.route)
                }
                return (tx: E.Transaction) =>
                  Result.gen(function*() {
                    const route = yield* resolve(tx)
                    const node = route.object
                    if (node.kind !== "file" && (follow || node.kind !== "symlink")) {
                      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
                    }
                    if (node.kind === "file") yield* tx.requireResult(node, E.READ_PERMISSION)
                    const bytes = BigInt(node.kind === "file" ? node.data.length : BytePath.byteLength(node.target))
                    yield* readLimits(tx, bytes, node.kind === "file")
                    const ledger = context.ticket.ledger
                    if (bytes > ledger.maxCopyBytes - ledger.copyBytes) {
                      return yield* Result.fail(
                        new M.LimitExceeded({ operation: tx.operation, domain: "copyBytes", stage: "traversal" })
                      )
                    }
                    ledger.copyBytes += bytes
                    yield* tx.reserveResult(bytes)
                    const hold = yield* fixedHold(context, tx.work, bytes)
                    const accessTimeBeforeRead = node.atime
                    const value = node.kind === "file" ? node.data.slice() : node.target
                    yield* tx.touchResult(node.id, ["atime"])
                    const observation = tx.observation(yield* tx.getResult(node.id))
                    if (node.kind === "file" && observation.kind === "file" && value instanceof Uint8Array) {
                      return readLease<M.CopySourceRead>(hold, {
                        kind: "file",
                        read: { value, object: observation, accessTimeBeforeRead }
                      })
                    }
                    if (node.kind === "symlink" && observation.kind === "symlink" && BytePath.isBytePath(value)) {
                      return readLease<M.CopySourceRead>(hold, {
                        kind: "symlink",
                        read: { value, object: observation, accessTimeBeforeRead }
                      })
                    }
                    return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
                  })
              })
          )
        })
      ),
      {
        onFailure: R.failure,
        onSuccess: (prepared) => Effect.flatten(Effect.fromResult(prepared))
      }
    )
  ))

// -----------------------------------------------------------------------------
// Target planning and mutations
// -----------------------------------------------------------------------------

interface TargetPlan<Target extends M.Target = M.Target> {
  readonly targets: ReadonlyArray<M.Target | M.DirectorySelector>
  readonly leases: ReadonlyArray<Lease>
  readonly snapshot: () => Result.Result<
    (tx: E.Transaction) => Result.Result<Target, M.OperationError>,
    M.OperationError
  >
}

type OperationTarget = M.Target | M.OperationEntryAddress | M.TraversalDirectory

type PlannedTarget<Target extends OperationTarget> = Target extends M.Path ? M.Path :
  Target extends M.EntryAddress | M.OperationEntryAddress ? M.EntryAddress
  : M.Target

function planTarget<Target extends OperationTarget>(
  context: OperationContext,
  target: Target,
  operation: string
): Result.Result<TargetPlan<PlannedTarget<Target>>, M.OperationError>
function planTarget(
  context: OperationContext,
  target: OperationTarget,
  operation: string
): Result.Result<TargetPlan, M.OperationError> {
  return Result.gen(function*() {
    const direct = directoryLease(target)
    if (direct !== undefined) {
      yield* checkLeaseResult(context, direct, operation)
      return {
        targets: [],
        leases: [direct],
        snapshot: () =>
          Result.succeed((tx: E.Transaction) =>
            Result.gen(function*() {
              yield* tx.validateRouteResult(direct.route)
              return tx.engine.reference(direct.route.id)
            })
          )
      }
    }
    if (target !== null && typeof target === "object" && "directory" in target) {
      const directory = directoryLease(target.directory)
      if (directory !== undefined) {
        yield* checkLeaseResult(context, directory, operation)
        const name = target.name
        return {
          targets: [name],
          leases: [directory],
          snapshot: () =>
            Result.succeed((tx: E.Transaction) =>
              Result.gen(function*() {
                yield* tx.validateRouteResult(directory.route)
                return {
                  directory: tx.engine.reference(directory.route.id),
                  name: yield* E.nameValueResult(name, operation)
                }
              })
            )
        }
      }
    }
    // NOTE: Failed membership leaves an untrusted candidate, not an authenticated lease.
    // This transport assertion only hands it to addressBytes, which rejects malformed
    // address shapes before snapshot(). Transaction still checks token kinds,
    // instance identity and current authority; registered leases were checked above.
    const candidate = target as M.Target
    return {
      targets: [candidate],
      leases: [],
      snapshot: () => Result.map(E.snapshotTargetResult(candidate), (selected) => () => Result.succeed(selected))
    }
  })
}

const mutate = <Operation extends A.Operation, Target extends OperationTarget, Value>(
  context: OperationContext,
  operation: Operation,
  target: Target,
  options: A.OptionsByOperation[Operation],
  prepare: (
    work: R.Work
  ) => Result.Result<
    (
      tx: E.Transaction,
      target: PlannedTarget<Target>,
      options: A.OptionsByOperation[Operation]
    ) => Result.Result<Value, M.OperationError>,
    M.OperationError
  >,
  validate?: () => Result.Result<unknown, M.OperationError>
) =>
  Effect.suspend(() =>
    Result.match(
      Result.try(() =>
        Result.gen(function*() {
          yield* requireOpenResult(context, operation)
          yield* A.validate(operation, options)
          if (validate !== undefined) yield* validate()
          const plan = yield* planTarget(context, target, operation)
          return stepResult(context, operation, plan.targets, plan.leases, (work) =>
            Result.gen(function*() {
              yield* A.validate(operation, options)
              const selected = yield* plan.snapshot()
              const fixedOptions = yield* P.snapshotOptions[operation](options)
              const body = yield* prepare(work)
              return (tx: E.Transaction) => Result.flatMap(selected(tx), (target) => body(tx, target, fixedOptions))
            }))
        })
      ),
      {
        onFailure: R.failure,
        onSuccess: (prepared) => Effect.flatten(Effect.fromResult(prepared))
      }
    )
  )

const makeFiles = (context: OperationContext) =>
  Object.freeze<M.OperationFiles>({
    [M.OperationFilesTypeId]: M.OperationFilesTypeId,
    readForText: (target) => readForText(context, target),
    readForCopy: (target, options) => readForCopy(context, target, options),
    writeFile: (target: M.Target | M.OperationEntryAddress, data: Uint8Array, options?: M.WriteFileOptions) =>
      mutate(context, "writeFile", target, options, (work) =>
        Result.map(P.snapshotInput(work, data), (fixed) => (tx, target, options) =>
          A.writeFile(tx, target, fixed, options)), () =>
        P.inputLength(data, "writeFile", context.caller.runtime.limits)),
    publishCopiedFile: (target, data, options) =>
      mutate(context, "publishCopiedFile", target, options, (work) =>
        Result.map(P.snapshotInput(work, data), (fixed) => (tx, target, options) =>
          A.publishCopiedFile(tx, target, fixed, options)), () =>
        P.inputLength(data, "publishCopiedFile", context.caller.runtime.limits)),
    publishCopiedSymlink: (target, link, options) =>
      mutate(context, "publishCopiedSymlink", target, options, (work) =>
        Result.gen(function*() {
          if (!BytePath.isBytePath(link)) {
            return yield* Result.fail(
              new M.InvalidInput({ operation: work.operation, field: "target", reason: "malformed" })
            )
          }
          yield* work.reserveResult(BigInt(BytePath.byteLength(link)))
          return (tx, target, options) =>
            A.publishCopiedSymlink(tx, target, link, options)
        })),
    makeDirectory: (target, options) =>
      mutate(context, "makeDirectory", target, options, () =>
        Result.succeed((tx, target, options) =>
          A.makeDirectory(tx, target, options)
        )),
    setAttributes: (target, attributes, options) =>
      mutate(context, "setAttributes", target, options, () =>
        Result.gen(function*() {
          yield* A.validateAttributes(attributes, "setAttributes")
          const fixed = yield* P.snapshotAttributes(attributes, "setAttributes")
          return (tx, target, options) =>
            A.setAttributes(tx, target, fixed, options)
        }), () =>
        A.validateAttributes(attributes, "setAttributes"))
  })

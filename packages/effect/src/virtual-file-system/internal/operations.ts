import * as BytePath from "../../BytePath.ts"
import type * as ByteSize from "../../ByteSize.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
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

const requireOpen = (context: OperationContext, operation: string, lease?: R.Resource): void => {
  if (context.caller.runtime.inTurn) throw new M.ReentrantOperation({ operation, reason: "sameInstance" })
  if (context.resource.state !== "open") throw R.closed(operation, context.resource.state)
  if (lease !== undefined && lease.state !== "open") throw R.closed(operation, lease.state)
}

const checkLease = <L extends Lease>(context: OperationContext, lease: L | undefined, operation: string): L => {
  if (lease === undefined) return R.invalid(operation, "lease")
  if (lease.context !== context) throw new M.InvalidResource({ operation, reason: "foreign" })
  if (lease.resource.state !== "open") throw R.closed(operation, lease.resource.state)
  return lease
}

// -----------------------------------------------------------------------------
// Budgets and session acquisition
// -----------------------------------------------------------------------------

const reserveManual = Effect.fnUntraced(
  function*(
    context: OperationContext,
    input: ByteSize.Input
  ): Effect.fn.Return<M.PayloadReservation, M.OperationError> {
    const operation = "reservePayload"
    const runtime = context.caller.runtime
    const { resource, bytes } = yield* R.evaluate(() => {
      requireOpen(context, operation)
      const bytes = R.size(input, operation, "bytes")
      return { resource: runtime.resource("lease", operation), bytes }
    })
    return yield* Effect.onError(
      R.evaluate(() => {
        context.resource.own(resource)
        const charge = new R.ChargedBytes(runtime, operation)
        resource.releaseWith(() => charge.clear())
        charge.reserve(bytes)
        const value: M.PayloadReservation = {
          [M.PayloadHoldTypeId]: M.PayloadHoldTypeId,
          [M.PayloadReservationTypeId]: M.PayloadReservationTypeId,
          release: resource.close,
          resize: (input) =>
            budgetOnly(R.evaluate(() => {
              const operation = "resizePayload"
              requireOpen(context, operation, resource)
              const next = R.size(input, operation, "totalBytes")
              charge.resize(next, operation)
            }))
        }
        return Object.freeze(value)
      }),
      () => resource.close
    )
  },
  Effect.uninterruptible
)

const budgetOnly = <A>(
  effect: Effect.Effect<A, M.OperationError>
): Effect.Effect<A, M.InvalidInput | M.InvalidResource | M.LimitExceeded | M.ReentrantOperation> =>
  Effect.catchTag(effect, [
    "NotFound",
    "AlreadyExists",
    "AccessDenied",
    "ConditionFailed",
    "NamespaceChanged",
    "Busy",
    "CapabilityUnavailable"
  ], Effect.die)

const traversalOnly = <A>(effect: Effect.Effect<A, M.OperationError>): Effect.Effect<A, M.TraversalError> =>
  Effect.catchTag(effect, ["AlreadyExists", "ConditionFailed", "CapabilityUnavailable"], Effect.die)

const makeBudget = (context: OperationContext): M.OperationBudget =>
  Object.freeze<M.OperationBudget>({
    [M.OperationBudgetTypeId]: M.OperationBudgetTypeId,
    reservePayload: (bytes) => budgetOnly(reserveManual(context, bytes)),
    consumeComparisons: (input) =>
      budgetOnly(R.evaluate(() => {
        const operation = "consumeComparisons"
        requireOpen(context, operation)
        const count = R.count(input, operation, "count")
        const ledger = context.ticket.ledger
        if (count > ledger.maxComparisons - ledger.comparisons) return R.limit(operation, "comparisons", "traversal")
        ledger.comparisons += count
      }))
  })

const makeSession = (context: OperationContext): M.OperationSession => {
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
  ): Effect.fn.Return<M.OperationSession, M.OperationError, Scope.Scope> {
    const scope = yield* Scope.Scope
    const runtime = source.runtime
    const { engine, settings } = yield* R.evaluate(() => {
      if (runtime.inTurn) throw new M.ReentrantOperation({ operation: "acquireOperation", reason: "sameInstance" })
      if (source.resource.state !== "open") throw R.closed("acquireOperation", source.resource.state)
      E.checkOptions(options, ["maxVisits", "maxComparisons", "maxCopyBytes"], "acquireOperation")
      const ledger = runtime.ledger(
        options === undefined ? undefined : {
          maxVisits: options.maxVisits,
          maxComparisons: options.maxComparisons,
          maxCopyBytes: options.maxCopyBytes
        },
        "acquireOperation"
      )
      if (source.resource.state !== "open") throw R.closed("acquireOperation", source.resource.state)
      return {
        engine: E.resolveEngine(source),
        settings: {
          maxVisits: ledger.maxVisits,
          maxComparisons: ledger.maxComparisons,
          maxCopyBytes: ledger.maxCopyBytes
        }
      }
    })
    return yield* runtime.acquireScopedResource("operation", "acquireOperation", scope, (resource) => {
      engine.retain(source.policy, resource)
      const ticket = runtime.ticket("acquireOperation", settings)
      resource.releaseWith(() => runtime.releaseTicket(ticket))
      const caller = E.createCaller(engine, source.policy, resource)
      const context = { caller, resource, ticket }
      return makeSession(context)
    })
  },
  Effect.uninterruptible
)

export const acquireTraversal = Effect.fnUntraced(
  function*(
    source: E.Caller,
    options?: M.TraversalOptions
  ): Effect.fn.Return<M.NamespaceTraversal, M.OperationError, Scope.Scope> {
    yield* R.evaluate(() => {
      if (source.runtime.inTurn) {
        throw new M.ReentrantOperation({ operation: "acquireTraversal", reason: "sameInstance" })
      }
      if (source.resource.state !== "open") {
        throw R.closed("acquireTraversal", source.resource.state)
      }
      E.checkOptions(options, ["base", "maxVisits", "maxComparisons", "maxCopyBytes"], "acquireTraversal")
    })
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

const directoryLease = (candidate: unknown): RouteLease | undefined =>
  typeof candidate === "object" && candidate !== null ? directoryLeases.get(candidate) : undefined

const selectionLease = (candidate: unknown): RouteLease | undefined =>
  typeof candidate === "object" && candidate !== null ? selectionLeases.get(candidate) : undefined

const isSelection = (candidate: unknown): candidate is M.TraversalSelection => selectionLease(candidate) !== undefined

const registerDirectory = (view: M.TraversalDirectory, lease: RouteLease): void => {
  directoryLeases.set(view, lease)
}

const registerSelection = (view: M.TraversalSelection, lease: RouteLease): void => {
  selectionLeases.set(view, lease)
}

const location = (context: OperationContext, tx: E.Transaction, route: E.Route): M.TraversalDirectory => {
  if (route.object.kind !== "directory") return tx.wrongKind()
  const lease = { context, ...tx.retainRoute(context.resource, { kind: "traversal", route, outputBytes: zero }) }
  const value = Object.freeze<M.TraversalDirectory>({
    [M.TraversalDirectoryTypeId]: M.TraversalDirectoryTypeId,
    release: lease.resource.close
  })
  registerDirectory(value, lease)
  return value
}

const selection = (
  context: OperationContext,
  tx: E.Transaction,
  route: E.Route,
  named: boolean
): { readonly value: M.TraversalSelection; readonly lease: RouteLease } => {
  const entry = named && route.parent !== undefined && route.binding !== undefined
    ? tx.entry(route.parent, route.binding.name, route.binding)
    : undefined
  if (entry !== undefined && entry.state !== "present") return tx.wrongKind()
  const lease = {
    context,
    ...tx.retainRoute(context.resource, {
      kind: "traversal",
      route,
      outputBytes: entry === undefined ? zero : BigInt(BytePath.byteLength(entry.name))
    })
  }
  const value = Object.freeze<M.TraversalSelection>({
    [M.TraversalSelectionTypeId]: M.TraversalSelectionTypeId,
    object: entry === undefined ? tx.observation(route.object) : entry.object,
    entry: entry === undefined ? Option.none() : Option.some(entry),
    release: lease.resource.close
  })
  registerSelection(value, lease)
  return { value, lease }
}

const step = <A>(
  context: OperationContext,
  operation: string,
  targets: ReadonlyArray<M.Target | M.DirectorySelector>,
  leases: ReadonlyArray<Lease>,
  snapshot: (work: R.Work) => (tx: E.Transaction) => A
): Effect.Effect<A, M.OperationError> =>
  E.runAtomic(
    context.caller,
    operation,
    targets,
    () => {},
    (work) => {
      requireOpen(context, operation)
      for (const lease of leases) {
        checkLease(context, lease, operation)
        work.borrow(lease.resource)
      }
      return snapshot(work)
    },
    context.resource,
    context.ticket
  )

const makeTraversal = (
  context: OperationContext,
  budget: M.OperationBudget,
  options?: M.TraversalViewOptions
): Effect.Effect<M.NamespaceTraversal, M.TraversalError> =>
  traversalOnly(Effect.flatten(R.evaluate(() => {
    requireOpen(context, "traversal")
    E.checkOptions(options, ["base"], "traversal")
    const base = options?.base ?? "."
    return step(context, "traversal", [base], [], () => (tx) => {
      const directory = location(context, tx, tx.selectDirectoryRoute(base))
      return Object.freeze<M.NamespaceTraversal>({
        [M.NamespaceTraversalTypeId]: M.NamespaceTraversalTypeId,
        base: directory,
        select: (directory, probe) => select(context, directory, probe),
        list: (directory) => list(context, directory),
        classify: (selected) => classify(context, selected),
        budget,
        close: context.resource.close
      })
    })
  })))

const select = (
  context: OperationContext,
  directory: M.TraversalDirectory,
  probe: M.TraversalProbe
): Effect.Effect<Option.Option<M.TraversalSelection>, M.TraversalError> =>
  traversalOnly(Effect.flatten(R.evaluate(() => {
    requireOpen(context, "select")
    const lease = checkLease(context, directoryLease(directory), "select")
    const navigation = probe?._tag
    let fixed: M.TraversalProbe
    if (navigation === "Name") fixed = { _tag: navigation, name: probe.name }
    else if (navigation === "Current" || navigation === "Parent" || navigation === "Root") fixed = { _tag: navigation }
    else return R.failure(new M.InvalidInput({ operation: "select", field: "probe", reason: "malformed" }))
    return step(context, "select", fixed._tag === "Name" ? [fixed.name] : [], [lease], () => (tx) => {
      let route: E.Route
      if (fixed._tag === "Root") route = tx.resolve(E.asciiPath("/"), true)
      else {
        const path = fixed._tag === "Name"
          ? E.nameValue(fixed.name, tx.operation)
          : E.asciiPath(fixed._tag === "Parent" ? ".." : ".")
        if (fixed._tag === "Name" && BigInt(BytePath.byteLength(path)) > tx.engine.runtime.limits.nameBytes) {
          return R.limit(tx.operation, "name", "resolution")
        }
        try {
          route = tx.childRoute(lease.route, path, false)
        } catch (error) {
          if (fixed._tag === "Name" && error instanceof M.NotFound && error.reason === "missingEntry") {
            return Option.none()
          }
          throw error
        }
      }
      return Option.some(selection(context, tx, route, fixed._tag === "Name").value)
    })
  })))

const list = (
  context: OperationContext,
  directory: M.TraversalDirectory
): Effect.Effect<M.TraversalListing, M.TraversalError> =>
  traversalOnly(Effect.flatten(R.evaluate(() => {
    requireOpen(context, "list")
    const lease = checkLease(context, directoryLease(directory), "list")
    return step(context, "list", [], [lease], () => (tx) => {
      const route = tx.validateRoute(lease.route)
      if (route.object.kind !== "directory") return tx.wrongKind()
      tx.require(route.object, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
      const bindings = [...route.object.entries.values()].sort((a, b) => BytePath.Order(a.name, b.name))
      const entries: Array<M.NamedTraversalSelection> = []
      for (const binding of bindings) {
        tx.visit()
        const child: E.Route = {
          object: tx.get(binding.object),
          parent: route.object,
          binding,
          support: [...lease.route.support, E.routeEdge(route.object.id, binding)]
        }
        const created = selection(context, tx, child, true)
        const selected = created.value
        if (Option.isNone(selected.entry)) return tx.wrongKind()
        const named = Object.freeze({ ...selected, entry: selected.entry })
        registerSelection(named, created.lease)
        entries.push(named)
      }
      tx.touch(route.object.id, ["atime"])
      const observation = tx.observation(tx.get(route.object.id))
      if (observation.kind !== "directory") return tx.wrongKind()
      return { directory: observation, entries }
    })
  })))

const classify = (
  context: OperationContext,
  selected: M.TraversalSelection
): Effect.Effect<M.TraversalClassification, M.TraversalError> =>
  traversalOnly(Effect.flatten(R.evaluate(() => {
    requireOpen(context, "classify")
    const lease = checkLease(context, selectionLease(selected), "classify")
    return step(context, "classify", [], [lease], () => (tx): M.TraversalClassification => {
      let route = tx.validateRoute(lease.route)
      if (route.object.kind === "symlink") {
        try {
          route = tx.followRoute(lease.route)
        } catch (error) {
          if (error instanceof M.NotFound && error.reason === "missingEntry") return { kind: "nonDirectory" }
          throw error
        }
      }
      return route.object.kind === "directory"
        ? { kind: "directory", directory: location(context, tx, route) }
        : { kind: "nonDirectory" }
    })
  })))

// -----------------------------------------------------------------------------
// Payload leases and reads
// -----------------------------------------------------------------------------

const fixedHold = (context: OperationContext, work: R.Work, bytes: bigint): M.PayloadHold => {
  const resource = work.acquireResource("lease", context.resource)
  work.retain(bytes, resource)
  return Object.freeze<M.PayloadHold>({ [M.PayloadHoldTypeId]: M.PayloadHoldTypeId, release: resource.close })
}

const readLease = <A>(hold: M.PayloadHold, value: A): M.ReadLease<A> =>
  Object.freeze<M.ReadLease<A>>({
    ...hold,
    [M.ReadLeaseTypeId]: M.ReadLeaseTypeId,
    value
  })

const readLimits = (tx: E.Transaction, bytes: bigint, file: boolean): void => {
  if (bytes > tx.engine.runtime.limits.ioBytes) return R.limit(tx.operation, "io", "reservation")
  if (file && bytes > tx.engine.runtime.limits.fileBytes) return R.limit(tx.operation, "file", "reservation")
}

const readForText = (context: OperationContext, target: M.Target): Effect.Effect<M.TextRead, M.ReadError> =>
  R.readOnly(step(context, "readForText", [target], [], () => {
    const selected = E.snapshotTarget(target)
    return (tx) => {
      const node = tx.target(selected).object
      if (node.kind !== "file") return tx.wrongKind()
      tx.require(node, E.READ_PERMISSION)
      const bytes = BigInt(node.data.length)
      readLimits(tx, bytes, true)
      tx.reserve(three * bytes)
      const input = fixedHold(context, tx.work, bytes)
      const output = fixedHold(context, tx.work, two * bytes)
      const value = node.data.slice()
      tx.touch(node.id, ["atime"])
      return { bytes: readLease(input, value), output }
    }
  }))

const readForCopy = (
  context: OperationContext,
  source: M.EntryTarget | M.TraversalSelection,
  options?: M.CopyReadOptions
): Effect.Effect<M.ReadLease<M.CopySourceRead>, M.TraversalError> =>
  traversalOnly(Effect.flatten(R.evaluate(() => {
    requireOpen(context, "readForCopy")
    const sourcePlan: { readonly kind: "selection"; readonly lease: RouteLease } | {
      readonly kind: "target"
      readonly target: M.EntryTarget
    } = isSelection(source)
      ? { kind: "selection", lease: checkLease(context, selectionLease(source), "readForCopy") }
      : M.isToken(source)
      ? R.invalid("readForCopy", "source")
      : { kind: "target", target: source }
    E.checkOptions(options, ["followFinalSymlink"], "readForCopy")
    if (options?.followFinalSymlink !== undefined && typeof options.followFinalSymlink !== "boolean") {
      return R.failure(
        new M.InvalidInput({ operation: "readForCopy", field: "followFinalSymlink", reason: "malformed" })
      )
    }
    const follow = options?.followFinalSymlink ?? false
    return step(
      context,
      "readForCopy",
      sourcePlan.kind === "target" ? [sourcePlan.target] : [],
      sourcePlan.kind === "selection" ? [sourcePlan.lease] : [],
      () => {
        let resolve: (tx: E.Transaction) => E.Route
        if (sourcePlan.kind === "target") {
          const target = E.snapshotTarget(sourcePlan.target)
          resolve = (tx) => tx.target(target, follow)
        } else {
          const selected = sourcePlan.lease
          resolve = (tx) => follow ? tx.followRoute(selected.route) : tx.validateRoute(selected.route)
        }
        return (tx) => {
          const route = resolve(tx)
          const node = route.object
          if (node.kind !== "file" && (follow || node.kind !== "symlink")) return tx.wrongKind()
          if (node.kind === "file") tx.require(node, E.READ_PERMISSION)
          const bytes = BigInt(node.kind === "file" ? node.data.length : BytePath.byteLength(node.target))
          readLimits(tx, bytes, node.kind === "file")
          const ledger = context.ticket.ledger
          if (bytes > ledger.maxCopyBytes - ledger.copyBytes) return R.limit(tx.operation, "copyBytes", "traversal")
          ledger.copyBytes += bytes
          tx.reserve(bytes)
          const hold = fixedHold(context, tx.work, bytes)
          const accessTimeBeforeRead = node.atime
          const value = node.kind === "file" ? node.data.slice() : node.target
          tx.touch(node.id, ["atime"])
          const observation = tx.observation(tx.get(node.id))
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
          return tx.wrongKind()
        }
      }
    )
  })))

// -----------------------------------------------------------------------------
// Target planning and mutations
// -----------------------------------------------------------------------------

interface TargetPlan<Target extends M.Target = M.Target> {
  readonly targets: ReadonlyArray<M.Target | M.DirectorySelector>
  readonly leases: ReadonlyArray<Lease>
  readonly snapshot: () => (tx: E.Transaction) => Target
}

type OperationTarget = M.Target | M.OperationEntryAddress | M.TraversalDirectory

type PlannedTarget<Target extends OperationTarget> = Target extends M.Path ? M.Path :
  Target extends M.EntryAddress | M.OperationEntryAddress ? M.EntryAddress
  : M.Target

function planTarget<Target extends OperationTarget>(
  context: OperationContext,
  target: Target,
  operation: string
): TargetPlan<PlannedTarget<Target>>
function planTarget(context: OperationContext, target: OperationTarget, operation: string): TargetPlan {
  const direct = directoryLease(target)
  if (direct !== undefined) {
    checkLease(context, direct, operation)
    return {
      targets: [],
      leases: [direct],
      snapshot: () => (tx) => {
        tx.validateRoute(direct.route)
        return tx.engine.reference(direct.route.id)
      }
    }
  }
  if (target !== null && typeof target === "object" && "directory" in target) {
    const directory = directoryLease(target.directory)
    if (directory !== undefined) {
      checkLease(context, directory, operation)
      const name = target.name
      return {
        targets: [name],
        leases: [directory],
        snapshot: () => (tx) => {
          tx.validateRoute(directory.route)
          return { directory: tx.engine.reference(directory.route.id), name: E.nameValue(name, operation) }
        }
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
    snapshot: () => {
      const selected = E.snapshotTarget(candidate)
      return () => selected
    }
  }
}

const mutate = <Operation extends A.Operation, Target extends OperationTarget, Value>(
  context: OperationContext,
  operation: Operation,
  target: Target,
  options: A.OptionsByOperation[Operation],
  prepare: (
    work: R.Work
  ) => (tx: E.Transaction, target: PlannedTarget<Target>, options: A.OptionsByOperation[Operation]) => Value,
  validate?: () => void
): Effect.Effect<Value, M.OperationError> =>
  Effect.flatten(R.evaluate(() => {
    requireOpen(context, operation)
    A.validate(operation, options)
    validate?.()
    const plan = planTarget(context, target, operation)
    return step(context, operation, plan.targets, plan.leases, (work) => {
      A.validate(operation, options)
      const selected = plan.snapshot()
      const fixedOptions = P.snapshotOptions[operation](options)
      const body = prepare(work)
      return (tx) => body(tx, selected(tx), fixedOptions)
    })
  }))

const makeFiles = (context: OperationContext): M.OperationFiles =>
  Object.freeze<M.OperationFiles>({
    [M.OperationFilesTypeId]: M.OperationFilesTypeId,
    readForText: (target) => readForText(context, target),
    readForCopy: (target, options) => readForCopy(context, target, options),
    writeFile: (target: M.Target | M.OperationEntryAddress, data: Uint8Array, options?: M.WriteFileOptions) =>
      mutate(context, "writeFile", target, options, (work) => {
        const fixed = P.snapshotInput(work, data)
        return (tx, target, options) => A.writeFile(tx, target, fixed, options)
      }, () => {
        P.inputLength(data, "writeFile", context.caller.runtime.limits)
      }),
    publishCopiedFile: (target, data, options) =>
      mutate(context, "publishCopiedFile", target, options, (work) => {
        const fixed = P.snapshotInput(work, data)
        return (tx, target, options) => A.publishCopiedFile(tx, target, fixed, options)
      }, () => {
        P.inputLength(data, "publishCopiedFile", context.caller.runtime.limits)
      }),
    publishCopiedSymlink: (target, link, options) =>
      mutate(context, "publishCopiedSymlink", target, options, (work) => {
        if (!BytePath.isBytePath(link)) return R.invalid(work.operation, "target")
        work.reserve(BigInt(BytePath.byteLength(link)))
        return (tx, target, options) => A.publishCopiedSymlink(tx, target, link, options)
      }),
    makeDirectory: (target, options) =>
      mutate(context, "makeDirectory", target, options, () => (tx, target, options) =>
        A.makeDirectory(tx, target, options)),
    setAttributes: (target, attributes, options) =>
      mutate(context, "setAttributes", target, options, () => {
        A.validateAttributes(attributes, "setAttributes")
        const fixed = P.snapshotAttributes(attributes, "setAttributes")
        return (tx, target, options) =>
          A.setAttributes(tx, target, fixed, options)
      }, () =>
        A.validateAttributes(attributes, "setAttributes"))
  })

import * as ByteSize from "../../ByteSize.ts"
import * as Cause from "../../Cause.ts"
import type * as Clock from "../../Clock.ts"
import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as M from "./model.ts"

// -----------------------------------------------------------------------------
// Error adaptation
// -----------------------------------------------------------------------------

export const expected = (error: unknown): error is M.OperationError =>
  error instanceof M.InvalidInput || error instanceof M.NotFound || error instanceof M.AlreadyExists ||
  error instanceof M.AccessDenied || error instanceof M.InvalidResource || error instanceof M.ConditionFailed ||
  error instanceof M.NamespaceChanged || error instanceof M.LimitExceeded || error instanceof M.Busy ||
  error instanceof M.ReentrantOperation || error instanceof M.CapabilityUnavailable

const readError = (error: M.OperationError) => {
  if (
    error._tag === "AlreadyExists" || error._tag === "ConditionFailed" ||
    error._tag === "NamespaceChanged" || error._tag === "CapabilityUnavailable"
  ) throw error
  return error
}

export const readOnly = <A, R2>(effect: Effect.Effect<A, M.OperationError, R2>) =>
  Effect.catchTag(effect, ["ConditionFailed", "NamespaceChanged", "AlreadyExists", "CapabilityUnavailable"], Effect.die)

export const readOnlyResult = <A>(value: Result.Result<A, M.OperationError>) => Result.mapError(value, readError)

export const failure = (error: unknown) => expected(error) ? Effect.fail(error) : Effect.die(error)

export const closed = (operation: string, state: "closed" | "closing" = "closed") =>
  new M.InvalidResource({ operation, reason: state })

// -----------------------------------------------------------------------------
// Instance allocation and configuration
// -----------------------------------------------------------------------------

const Allocator = Schema.Struct({
  protocol: Schema.Literal("effect/VFSAllocator/1"),
  next: Schema.BigInt.check(Schema.isGreaterThanBigInt(BigInt("0")))
})

const isAllocator = Schema.is(Allocator)

const allocatorKey = Symbol.for("effect/virtual-file-system/instanceAllocator/v1")

const allocateInstance = () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, allocatorKey)
  let state: typeof Allocator.Type
  if (descriptor === undefined) {
    state = { protocol: "effect/VFSAllocator/1", next: BigInt("1") }
    Object.defineProperty(globalThis, allocatorKey, {
      value: state,
      configurable: false,
      writable: false,
      enumerable: false
    })
  } else {
    if (!("value" in descriptor) || !isAllocator(descriptor.value)) {
      throw new TypeError("Incompatible VFS instance allocator")
    }
    state = descriptor.value
  }
  const value = state.next
  // The bigint domain has no fixed-width rollover. Failed construction leaves gaps.
  Object.defineProperty(state, "next", {
    value: value + BigInt("1"),
    configurable: true,
    writable: true,
    enumerable: true
  })
  return value
}

const DEFAULT_MAX_COMPARISONS = 1048576
const DEFAULT_MAX_COPY_BYTES = ByteSize.mebibytes(128)

const defaults = {
  objects: 32768,
  entries: 65536,
  callers: 256,
  handles: 1024,
  operations: 128,
  nameBytes: ByteSize.bytes(255),
  pathBytes: ByteSize.bytes(4096),
  expandedPathBytes: ByteSize.bytes(16384),
  symlinkFollows: 64,
  namespaceVisits: 131072,
  restoreRecords: 131072,
  contentBytes: ByteSize.mebibytes(64),
  fileBytes: ByteSize.mebibytes(16),
  transientBytes: ByteSize.mebibytes(256),
  ioBytes: ByteSize.mebibytes(16),
  restorePayloadBytes: ByteSize.mebibytes(128),
  synchronous: false
} satisfies M.Limits

const isCount = Schema.is(Schema.Natural)
const isLimits = Schema.is(Schema.Record(Schema.String, Schema.Unknown))
const isBoolean = Schema.is(Schema.Boolean)

/** @internal */
export const countResult = (
  input: unknown,
  operation: string,
  field: string,
  minimum = 0
) => {
  if (!isCount(input) || input < minimum) {
    return Result.fail(new M.InvalidInput({ operation, field, reason: "range" }))
  }
  return Result.succeed(input)
}

/** @internal */
export const sizeResult = (
  input: ByteSize.Input,
  operation: string,
  field: string
) => {
  const decoded = ByteSize.fromInput(input)
  if (decoded._tag === "None") return Result.fail(new M.InvalidInput({ operation, field, reason: "range" }))
  return Result.succeed(decoded.value)
}

/** @internal */
export const configureResult = (options: M.LimitOptions | undefined) =>
  Result.gen(function*() {
    if (options === undefined) return Object.freeze({ ...defaults })
    if (!isLimits(options)) {
      return yield* Result.fail(new M.InvalidInput({ operation: "make", field: "limits", reason: "malformed" }))
    }
    const output: { -readonly [K in keyof M.Limits]: M.Limits[K] } = { ...defaults }
    const countKeys = [
      "objects",
      "entries",
      "callers",
      "handles",
      "operations",
      "symlinkFollows",
      "namespaceVisits",
      "restoreRecords"
    ] as const
    for (const key of countKeys) {
      if (options[key] !== undefined) {
        output[key] = yield* countResult(options[key], "make", key, key === "objects" || key === "operations" ? 1 : 0)
      }
    }
    const byteKeys = [
      "nameBytes",
      "pathBytes",
      "expandedPathBytes",
      "contentBytes",
      "fileBytes",
      "transientBytes",
      "ioBytes",
      "restorePayloadBytes"
    ] as const
    for (const key of byteKeys) {
      if (options[key] !== undefined) {
        const n = yield* sizeResult(options[key], "make", key)
        if (
          (key === "nameBytes" || key === "pathBytes" || key === "expandedPathBytes") && n < BigInt("1")
        ) return yield* Result.fail(new M.InvalidInput({ operation: "make", field: key, reason: "range" }))
        output[key] = ByteSize.bytes(n)
      }
    }
    if (options.synchronous !== undefined) {
      if (!isBoolean(options.synchronous)) {
        return yield* Result.fail(new M.InvalidInput({ operation: "make", field: "synchronous", reason: "malformed" }))
      }
      output.synchronous = options.synchronous
    }
    for (const key of Object.keys(options)) {
      if (!(key in defaults)) {
        return yield* Result.fail(new M.InvalidInput({ operation: "make", field: key, reason: "excessField" }))
      }
    }
    return Object.freeze(output)
  })

// -----------------------------------------------------------------------------
// Resources and operation tickets
// -----------------------------------------------------------------------------

interface Ledger {
  visits: number
  comparisons: number
  copyBytes: bigint
  readonly maxVisits: number
  readonly maxComparisons: number
  readonly maxCopyBytes: bigint
}

export interface Ticket {
  readonly runtime: Runtime
  readonly ledger: Ledger
  live: boolean
}

export interface ContextCell<A> {
  value: A | undefined
}

export class Resource {
  private currentState: "open" | "closing" | "closed" = "open"
  private readonly uses = new Set<Work>()
  private readonly owned = new Set<Resource>()
  private readonly idle = Deferred.makeUnsafe<void>()
  private readonly done = Deferred.makeUnsafe<void>()
  private readonly releases: Array<() => void> = []
  private readonly contexts: Array<ContextCell<unknown>> = []
  private outcome: Exit.Exit<void> | undefined
  readonly close: Effect.Effect<void>
  readonly runtime: Runtime
  readonly kind: "caller" | "handle" | "region" | "operation" | "lease"
  private readonly operation: string

  constructor(runtime: Runtime, kind: Resource["kind"], operation: string) {
    this.runtime = runtime
    this.kind = kind
    this.operation = operation
    this.close = Effect.uninterruptible(Effect.suspend(() => {
      if (this.currentState !== "open") return Deferred.await(this.done)
      this.currentState = "closing"
      for (const work of this.uses) this.runtime.cancel(work)
      const drain = Effect.gen({ self: this }, function*() {
        const reasons: Array<Cause.Reason<never>> = []
        if (this.uses.size !== 0) yield* Deferred.await(this.idle)
        for (const child of this.owned) {
          const exit = yield* Effect.exit(child.close)
          if (Exit.isFailure(exit)) reasons.push(...exit.cause.reasons)
        }
        this.releaseLocal(reasons)
        return yield* closeExit(reasons)
      })
      return Effect.onExit(drain, (exit) => Effect.sync(() => this.completeClose(exit)))
    }))
  }

  get state() {
    return this.currentState
  }

  retainContextResult<A>(value: A) {
    if (this.currentState !== "open") return Result.fail(closed(this.operation, this.currentState))
    const cell: ContextCell<A> = { value }
    this.contexts.push(cell)
    return Result.succeed(cell)
  }

  enroll(scope: Scope.Scope, operation: string) {
    return Effect.gen({ self: this }, function*() {
      yield* Scope.addFinalizer(scope, this.close)
      if (this.currentState !== "open") return yield* closed(operation)
    })
  }

  ownResult(child: Resource, work?: Work) {
    if (
      this.currentState !== "open" && !(this.currentState === "closing" && work !== undefined && this.uses.has(work))
    ) {
      return Result.fail(closed(child.operation, this.currentState))
    }
    return Result.map(child.releaseWithResult(() => this.owned.delete(child)), () => {
      this.owned.add(child)
    })
  }

  releaseWithResult(release: () => void, work?: Work) {
    if (
      this.currentState !== "open" && !(this.currentState === "closing" && work !== undefined && this.uses.has(work))
    ) {
      return Result.fail(closed(this.operation, this.currentState))
    }
    this.releases.push(release)
    return Result.succeed(undefined)
  }

  checkOpenResult(operation: string) {
    return this.currentState === "open" ? Result.succeed(undefined) : Result.fail(closed(operation, this.currentState))
  }

  useResult(work: Work) {
    const open = this.checkOpenResult(work.operation)
    if (Result.isFailure(open)) return open
    this.uses.add(work)
    return Result.succeed(undefined)
  }

  endUse(work: Work) {
    this.uses.delete(work)
    if (this.currentState === "closing" && this.uses.size === 0) Deferred.doneUnsafe(this.idle, Effect.void)
  }

  closeSyncExitResult(operation: string): Result.Result<Exit.Exit<void>, M.ReentrantOperation | M.Busy> {
    if (this.outcome !== undefined) return Result.succeed(this.outcome)
    if (this.runtime.inTurn) return Result.fail(new M.ReentrantOperation({ operation, reason: "sameInstance" }))
    if (this.currentState === "closing") return Result.fail(new M.Busy({ operation, reason: "draining" }))
    if (this.runtime.ordinary !== 0 || this.uses.size !== 0) {
      return Result.fail(new M.Busy({ operation, reason: "pending" }))
    }
    this.currentState = "closing"
    const reasons: Array<Cause.Reason<never>> = []
    // NOTE: A refused child close is a cleanup defect. Attempt every child without an Effect runner.
    for (const child of this.owned) {
      const closed = Result.flatMap(Result.try(() => child.closeSyncExitResult(operation)), (result) => result)
      if (Result.isFailure(closed)) reasons.push(Cause.makeDieReason(closed.failure))
      else if (Exit.isFailure(closed.success)) reasons.push(...closed.success.cause.reasons)
    }
    this.releaseLocal(reasons)
    const exit = closeExit(reasons)
    this.completeClose(exit)
    return Result.succeed(exit)
  }

  private releaseLocal(reasons: Array<Cause.Reason<never>>) {
    // NOTE: Each release must run even after a defect. Preserve repeated occurrences in their observed order.
    for (const release of this.releases) {
      const released = Result.try(release)
      if (Result.isFailure(released)) reasons.push(Cause.makeDieReason(released.failure))
    }
    this.releases.length = 0
    this.owned.clear()
    if (this.kind === "caller" || this.kind === "region" || this.kind === "operation") this.runtime.callers--
    if (this.kind === "handle") this.runtime.handles--
    const released = Result.try(() => this.runtime.onRelease())
    if (Result.isFailure(released)) reasons.push(Cause.makeDieReason(released.failure))
  }

  private completeClose(exit: Exit.Exit<void>) {
    if (this.outcome !== undefined) return
    this.outcome = exit
    for (const cell of this.contexts) cell.value = undefined
    this.contexts.length = 0
    this.currentState = "closed"
    Deferred.doneUnsafe(this.done, exit)
  }
}

// -----------------------------------------------------------------------------
// Work preparation and accounting
// -----------------------------------------------------------------------------

/** @internal */
export interface ResultTransition<A> {
  readonly value: A
  readonly publish?: (() => Result.Result<void, M.OperationError>) | undefined
}

interface ResultPrepared<A> {
  readonly execute: () => Result.Result<ResultTransition<A>, M.OperationError>
  readonly enroll?: Effect.Effect<void, M.OperationError> | undefined
}

/** @internal */
export interface ResultPreparation<A> {
  readonly bytes: bigint
  readonly snapshot: (work: Work) => Result.Result<ResultPrepared<A>, M.OperationError>
}

interface TurnRequest {
  readonly work: Work
  readonly ready: Deferred.Deferred<void, M.OperationError>
  state: "preparing" | "queued" | "selected" | "cancelled" | "released"
}

const releasePayload = (runtime: Runtime, bytes: bigint) => () => {
  runtime.releasePayload(bytes)
}

export class ChargedBytes {
  private balance = BigInt("0")
  protected readonly runtime: Runtime
  readonly operation: string

  constructor(runtime: Runtime, operation: string) {
    this.runtime = runtime
    this.operation = operation
  }

  reserveResult(bytes: bigint, operation = this.operation): Result.Result<void, M.InvalidInput | M.LimitExceeded> {
    if (bytes < BigInt("0")) return Result.fail(new M.InvalidInput({ operation, field: "payload", reason: "range" }))
    const adjusted = this.runtime.adjustPayloadResult(bytes, operation)
    if (Result.isFailure(adjusted)) return adjusted
    this.balance += bytes
    return Result.succeed(undefined)
  }

  release(bytes: bigint) {
    if (bytes < BigInt("0") || bytes > this.balance) throw new RangeError("Invalid VFS payload release")
    this.balance -= bytes
    this.runtime.releasePayload(bytes)
  }

  resizeResult(next: bigint, operation: string) {
    if (next > this.balance) return this.reserveResult(next - this.balance, operation)
    this.release(this.balance - next)
    return Result.succeed(undefined)
  }

  clear() {
    this.release(this.balance)
  }

  protected transferResult(bytes: bigint, resource: Resource, work: Work) {
    if (bytes < BigInt("0") || bytes > this.balance) throw new RangeError("Invalid VFS payload transfer")
    return Result.map(resource.releaseWithResult(releasePayload(this.runtime, bytes), work), () => {
      this.balance -= bytes
    })
  }
}

export class Work extends ChargedBytes {
  private finished = false
  private request: TurnRequest | undefined
  private readonly borrowed = new Set<Resource>()
  private readonly rollbackResources: Array<Resource> = []
  readonly ticket: Ticket
  readonly receiver: Resource
  readonly ownTicket: boolean

  private constructor(ticket: Ticket, receiver: Resource, operation: string, ownTicket: boolean) {
    super(ticket.runtime, operation)
    this.ticket = ticket
    this.receiver = receiver
    this.ownTicket = ownTicket
  }

  static makeResult(
    ticket: Ticket,
    receiver: Resource,
    operation: string,
    ownTicket: boolean
  ) {
    const work = new Work(ticket, receiver, operation, ownTicket)
    const used = receiver.useResult(work)
    if (Result.isFailure(used)) return Result.fail(used.failure)
    return Result.succeed(work)
  }

  get isFinished() {
    return this.finished
  }

  get turn() {
    return this.request
  }

  prepareTurn() {
    if (this.request === undefined) {
      this.request = { work: this, ready: Deferred.makeUnsafe(), state: "preparing" }
    }
    return this.request
  }

  retainResult(bytes: bigint, resource: Resource) {
    return this.transferResult(bytes, resource, this)
  }

  borrowResult(resource: Resource) {
    const used = resource.useResult(this)
    if (Result.isFailure(used)) return used
    this.borrowed.add(resource)
    return Result.succeed(undefined)
  }

  acquireResourceResult(kind: Resource["kind"], owner?: Resource) {
    return Result.gen(this, function*() {
      const resource = yield* this.ticket.runtime.resourceResult(kind, this.operation)
      this.onFailure(resource)
      if (owner !== undefined) yield* owner.ownResult(resource, this)
      return resource
    })
  }

  onFailure(resource: Resource) {
    this.rollbackResources.push(resource)
  }

  rollback() {
    return Effect.gen({ self: this }, function*() {
      const reasons: Array<Cause.Reason<never>> = []
      for (const resource of this.rollbackResources) {
        const exit = yield* Effect.exit(resource.close)
        if (Exit.isFailure(exit)) reasons.push(...exit.cause.reasons)
      }
      return yield* closeExit(reasons)
    })
  }

  rollbackSync(reason: Cause.Reason<M.OperationError>) {
    // Keep the operation failure first, followed by every cleanup occurrence without short-circuiting.
    const reasons: Array<Cause.Reason<M.OperationError>> = [reason]
    for (const resource of this.rollbackResources) {
      const closed = Result.flatMap(
        Result.try(() => resource.closeSyncExitResult(this.operation + ".cleanup")),
        (result) => result
      )
      if (Result.isFailure(closed)) reasons.push(Cause.makeDieReason(closed.failure))
      else if (Exit.isFailure(closed.success)) reasons.push(...closed.success.cause.reasons)
    }
    if (reasons.length === 1) {
      if (Cause.isFailReason(reason)) return Result.fail(reason.error)
      if (Cause.isDieReason(reason)) throw reason.defect
    }
    throw new Cause.UnknownError(Cause.fromReasons(reasons))
  }

  finish() {
    if (this.finished) return
    this.finished = true
    const runtime = this.ticket.runtime
    this.clear()
    if (this.ownTicket) runtime.releaseTicket(this.ticket)
    this.rollbackResources.length = 0
    for (const resource of this.borrowed) resource.endUse(this)
    this.borrowed.clear()
    this.receiver.endUse(this)
  }
}

const closeExit = (reasons: ReadonlyArray<Cause.Reason<never>>) =>
  reasons.length === 0 ? Exit.void : Exit.failCause(Cause.fromReasons(reasons))

// -----------------------------------------------------------------------------
// Scheduling and execution
// -----------------------------------------------------------------------------

export class Runtime {
  readonly instanceNumber = allocateInstance()
  readonly limits: M.Limits
  readonly clock: Clock.Clock
  callers = 0
  handles = 0
  ordinary = 0
  private payloadBytes = BigInt("0")
  inTurn = false
  private active: TurnRequest | undefined
  private readonly queue: Array<TurnRequest> = []
  onRelease: () => void = () => {}

  constructor(limits: M.Limits, clock: Clock.Clock) {
    this.limits = limits
    this.clock = clock
  }

  resourceResult(kind: Resource["kind"], operation: string) {
    const policy = kind === "caller" || kind === "region" || kind === "operation"
    if (policy && this.callers >= this.limits.callers) {
      return Result.fail(new M.LimitExceeded({ operation, domain: "callers", stage: "admission" }))
    }
    if (kind === "handle" && this.handles >= this.limits.handles) {
      return Result.fail(new M.LimitExceeded({ operation, domain: "handles", stage: "admission" }))
    }
    if (policy) this.callers++
    if (kind === "handle") this.handles++
    return Result.succeed(new Resource(this, kind, operation))
  }

  acquireScopedResourceResult<A>(
    kind: Resource["kind"],
    operation: string,
    scope: Scope.Scope,
    initialize: (resource: Resource) => Result.Result<A, M.OperationError>
  ) {
    return Effect.uninterruptible(Effect.gen({ self: this }, function*() {
      const resource = yield* Effect.fromResult(this.resourceResult(kind, operation))
      const acquire = Effect.gen(function*() {
        const value = yield* Effect.suspend(() =>
          Result.match(Result.try(() => initialize(resource)), {
            onFailure: failure,
            onSuccess: Effect.fromResult
          })
        )
        yield* resource.enroll(scope, operation)
        return value
      })
      return yield* Effect.onError(acquire, () => resource.close)
    }))
  }

  cancel(work: Work) {
    const request = work.turn
    if (request === undefined || (request.state !== "queued" && request.state !== "preparing")) return
    const index = this.queue.indexOf(request)
    if (index !== -1) this.queue.splice(index, 1)
    request.state = "cancelled"
    Deferred.doneUnsafe(request.ready, Effect.fail(closed(work.operation, "closing")))
  }

  // ---------------------------------------------------------------------------
  // Operation budgets
  // ---------------------------------------------------------------------------

  ledgerResult(options: M.OperationOptions | undefined, operation: string) {
    const maxVisits = this.limits.namespaceVisits
    return Result.gen(function*() {
      const visits = options?.maxVisits === undefined
        ? maxVisits
        : yield* countResult(options.maxVisits, operation, "maxVisits")
      const comparisons = options?.maxComparisons === undefined
        ? DEFAULT_MAX_COMPARISONS
        : yield* countResult(options.maxComparisons, operation, "maxComparisons")
      const copyBytes = options?.maxCopyBytes === undefined
        ? DEFAULT_MAX_COPY_BYTES
        : yield* sizeResult(options.maxCopyBytes, operation, "maxCopyBytes")
      return {
        visits: 0,
        comparisons: 0,
        copyBytes: BigInt("0"),
        maxVisits: Math.min(maxVisits, visits),
        maxComparisons: comparisons,
        maxCopyBytes: copyBytes
      }
    })
  }

  ticketResult(operation: string, options?: M.OperationOptions) {
    if (this.ordinary >= this.limits.operations) {
      return Result.fail(new M.LimitExceeded({ operation, domain: "operations", stage: "admission" }))
    }
    const ledger = this.ledgerResult(options, operation)
    if (Result.isFailure(ledger)) return Result.fail(ledger.failure)
    this.ordinary++
    return Result.succeed<Ticket>({ runtime: this, ledger: ledger.success, live: true })
  }

  releaseTicket(ticket: Ticket) {
    if (ticket.live) {
      ticket.live = false
      this.ordinary--
    }
  }

  get payload() {
    return this.payloadBytes
  }

  adjustPayloadResult(delta: bigint, operation: string) {
    if (delta > BigInt("0") && this.payloadBytes + delta > this.limits.transientBytes) {
      return Result.fail(new M.LimitExceeded({ operation, domain: "transient", stage: "reservation" }))
    }
    this.payloadBytes += delta
    return Result.succeed(undefined)
  }

  releasePayload(bytes: bigint) {
    this.payloadBytes -= bytes
  }

  visitResult(ticket: Ticket, operation: string, amount = 1) {
    const ledger = ticket.ledger
    if (amount > ledger.maxVisits - ledger.visits) {
      return Result.fail(new M.LimitExceeded({ operation, domain: "visits", stage: "resolution" }))
    }
    ledger.visits += amount
    return Result.succeed(undefined)
  }

  // ---------------------------------------------------------------------------
  // Effectful execution
  // ---------------------------------------------------------------------------

  runResult<A>(
    receiver: Resource,
    operation: string,
    prepare: () => Result.Result<ResultPreparation<A>, M.OperationError>,
    ticket?: Ticket
  ) {
    return Effect.suspend(() => {
      let work: Work | undefined
      const attempt = Result.try(() =>
        Result.gen(this, function*() {
          yield* this.checkOpenResult(receiver, operation, ticket)
          const plan = yield* prepare()
          yield* this.checkOpenResult(receiver, operation, ticket)
          const acquired = ticket ?? (yield* this.ticketResult(operation))
          const created = Work.makeResult(acquired, receiver, operation, ticket === undefined)
          if (Result.isFailure(created)) {
            if (ticket === undefined) this.releaseTicket(acquired)
            return yield* Result.fail(created.failure)
          }
          const admitted = created.success
          work = admitted
          const request = admitted.prepareTurn()
          yield* admitted.reserveResult(plan.bytes)
          const prepared = yield* plan.snapshot(admitted)
          // Read accessors before queueing so failures still use admission cleanup.
          const action = prepared.execute
          const enroll = prepared.enroll
          // Queue before Scope enrollment so immediate finalization can cancel admitted work.
          if (request.state !== "cancelled") {
            request.state = "queued"
            this.queue.push(request)
            this.next()
          }
          return { work: admitted, request, action, enroll }
        })
      )
      if (Result.isFailure(attempt)) {
        // Preserve declared errors thrown by input getters or trusted callbacks at this boundary.
        const error = attempt.failure
        const reason = expected(error) ? Cause.makeFailReason(error) : Cause.makeDieReason(error)
        if (work === undefined) return Effect.failCause(Cause.fromReasons([reason]))
        return this.rejectWork(work, reason)
      }
      const admission = attempt.success
      if (Result.isFailure(admission)) {
        if (work === undefined) return Effect.fail(admission.failure)
        return this.rejectWork(work, Cause.makeFailReason(admission.failure))
      }
      const { work: admitted, request, action, enroll } = admission.success
      const execute = Effect.uninterruptibleMask((restore) =>
        Effect.gen({ self: this }, function*() {
          if (enroll !== undefined) yield* enroll
          yield* Effect.interruptible(Deferred.await(request.ready))
          const transition = yield* restore(Effect.suspend(() => {
            this.inTurn = true
            try {
              return Result.match(Result.try(action), {
                onFailure: failure,
                onSuccess: Effect.fromResult
              })
            } finally {
              this.inTurn = false
            }
          }))
          // Observe interruption before publication, while filesystem changes remain staged.
          yield* Effect.interruptible(Effect.void)
          const publish = transition.publish
          if (publish !== undefined) {
            yield* Effect.suspend(() => {
              this.inTurn = true
              try {
                return Result.match(Result.try(() => publish.call(transition)), {
                  onFailure: failure,
                  onSuccess: Effect.fromResult
                })
              } finally {
                this.inTurn = false
              }
            })
          }
          return transition.value
        })
      )
      return Effect.uninterruptibleMask((restore) =>
        Effect.gen({ self: this }, function*() {
          const exit = yield* Effect.exit(restore(execute))
          const reasons: Array<Cause.Reason<M.OperationError>> = Exit.isFailure(exit) ? [...exit.cause.reasons] : []
          if (Exit.isFailure(exit)) {
            this.cancel(admitted)
            const cleanup = yield* Effect.exit(admitted.rollback())
            if (Exit.isFailure(cleanup)) reasons.push(...cleanup.cause.reasons)
          }
          this.finish(admitted)
          if (Exit.isFailure(exit)) return yield* Effect.failCause(Cause.fromReasons(reasons))
          return exit.value
        })
      )
    })
  }

  private checkOpenResult(
    receiver: Resource,
    operation: string,
    ticket?: Ticket
  ): Result.Result<void, M.InvalidResource | M.ReentrantOperation> {
    if (this.inTurn) return Result.fail(new M.ReentrantOperation({ operation, reason: "sameInstance" }))
    const open = receiver.checkOpenResult(operation)
    if (Result.isFailure(open)) return Result.fail(open.failure)
    if (ticket !== undefined && !ticket.live) return Result.fail(closed(operation))
    return Result.succeed(undefined)
  }

  private rejectWork(work: Work, reason: Cause.Reason<M.OperationError>) {
    this.cancel(work)
    return Effect.uninterruptible(Effect.gen({ self: this }, function*() {
      const reasons: Array<Cause.Reason<M.OperationError>> = [reason]
      const cleanup = yield* Effect.exit(work.rollback())
      if (Exit.isFailure(cleanup)) reasons.push(...cleanup.cause.reasons)
      this.finish(work)
      return yield* Effect.failCause(Cause.fromReasons(reasons))
    }))
  }

  // ---------------------------------------------------------------------------
  // Synchronous execution
  // ---------------------------------------------------------------------------

  syncResult<A>(
    receiver: Resource,
    operation: string,
    body: (work: Work) => Result.Result<ResultTransition<A>, M.OperationError>
  ) {
    const open = this.checkOpenResult(receiver, operation)
    if (Result.isFailure(open)) return Result.fail(open.failure)
    if (this.ordinary !== 0) return Result.fail(new M.Busy({ operation, reason: "pending" }))
    const ledger = this.ledgerResult(undefined, operation)
    if (Result.isFailure(ledger)) return Result.fail(ledger.failure)
    const ticket: Ticket = { runtime: this, ledger: ledger.success, live: true }
    const admitted = Work.makeResult(ticket, receiver, operation, false)
    if (Result.isFailure(admitted)) return Result.fail(admitted.failure)
    const work = admitted.success
    // NOTE: Execution, publication and release finish before this call returns, including on failure.
    try {
      const attempt = Result.try(() => {
        this.inTurn = true
        try {
          const transition = body(work)
          if (Result.isFailure(transition)) return Result.fail(transition.failure)
          const publish = transition.success.publish?.()
          return publish !== undefined && Result.isFailure(publish)
            ? Result.fail(publish.failure)
            : Result.succeed(transition.success.value)
        } finally {
          this.inTurn = false
        }
      })
      if (Result.isFailure(attempt)) {
        const error = attempt.failure
        return work.rollbackSync(expected(error) ? Cause.makeFailReason(error) : Cause.makeDieReason(error))
      }
      const outcome = attempt.success
      return Result.isFailure(outcome) ? work.rollbackSync(Cause.makeFailReason(outcome.failure)) : outcome
    } finally {
      this.finish(work)
    }
  }

  closeSyncResult(resource: Resource, operation: string) {
    const closed = Result.flatMap(Result.try(() => resource.closeSyncExitResult(operation)), (result) => result)
    if (Result.isFailure(closed)) {
      if (expected(closed.failure)) return Result.fail(closed.failure)
      throw closed.failure
    }
    const exit = closed.success
    if (Exit.isFailure(exit)) {
      const reasons = exit.cause.reasons
      if (reasons.length === 1 && Cause.isDieReason(reasons[0])) {
        const defect = reasons[0].defect
        if (expected(defect)) return Result.fail(defect)
        throw defect
      }
      throw new Cause.UnknownError(exit.cause)
    }
    return Result.succeed(undefined)
  }

  // ---------------------------------------------------------------------------
  // Persistent work and queue cleanup
  // ---------------------------------------------------------------------------

  persistentResult(
    receiver: Resource,
    operation: string,
    options?: M.OperationOptions
  ) {
    return Result.gen(this, function*() {
      if (this.inTurn) return yield* Result.fail(new M.ReentrantOperation({ operation, reason: "sameInstance" }))
      if (receiver.state !== "open") return yield* Result.fail(closed(operation, receiver.state))
      const ticket = yield* this.ticketResult(operation, options)
      const created = Work.makeResult(ticket, receiver, operation, true)
      if (Result.isFailure(created)) this.releaseTicket(ticket)
      return yield* created
    })
  }

  finishPersistent(work: Work) {
    this.finish(work)
  }

  private next() {
    if (this.active !== undefined) return
    const first = this.queue.shift()
    if (first === undefined) return
    first.state = "selected"
    this.active = first
    Deferred.doneUnsafe(first.ready, Effect.void)
  }

  private finish(work: Work) {
    if (work.isFinished) return
    const request = work.turn
    if (request !== undefined) {
      const index = this.queue.indexOf(request)
      if (index !== -1) this.queue.splice(index, 1)
      if (this.active === request) this.active = undefined
      request.state = "released"
    }
    work.finish()
    this.next()
  }
}

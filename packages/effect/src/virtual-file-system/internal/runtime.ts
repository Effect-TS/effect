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

const readError = (error: M.OperationError): M.ReadError => {
  if (
    error._tag === "AlreadyExists" || error._tag === "ConditionFailed" ||
    error._tag === "NamespaceChanged" || error._tag === "CapabilityUnavailable"
  ) throw error
  return error
}

export const readOnly = <A, R2>(effect: Effect.Effect<A, M.OperationError, R2>): Effect.Effect<A, M.ReadError, R2> =>
  Effect.catchTag(effect, ["ConditionFailed", "NamespaceChanged", "AlreadyExists", "CapabilityUnavailable"], Effect.die)

export const readOnlyResult = <A>(value: Result.Result<A, M.OperationError>): Result.Result<A, M.ReadError> =>
  Result.mapError(value, readError)

export const failure = <A = never>(error: unknown): Effect.Effect<A, M.OperationError> =>
  expected(error) ? Effect.fail(error) : Effect.die(error)

export const evaluate = <A>(body: () => A): Effect.Effect<A, M.OperationError> =>
  Effect.try({
    try: body,
    catch: (error) => {
      if (expected(error)) return error
      // NOTE: Only declared VFS errors enter the failure channel; rethrow unexpected exceptions as defects.
      throw error
    }
  })

export const result = <A>(body: () => A): Result.Result<A, M.OperationError> =>
  Result.try({
    try: body,
    catch: (error) => {
      if (expected(error)) return error
      // NOTE: Synchronous callers receive declared failures; other thrown values retain their identity.
      throw error
    }
  })

export const invalid = (operation: string, field: string, reason: M.InvalidInput["reason"] = "malformed"): never => {
  throw new M.InvalidInput({ operation, field, reason })
}

export const closed = (operation: string, state: "closed" | "closing" = "closed"): M.InvalidResource =>
  new M.InvalidResource({ operation, reason: state })

export const limit = (operation: string, domain: M.LimitExceeded["domain"], stage: M.LimitExceeded["stage"]): never => {
  throw new M.LimitExceeded({ operation, domain, stage })
}

// -----------------------------------------------------------------------------
// Instance allocation and configuration
// -----------------------------------------------------------------------------

const Allocator = Schema.Struct({
  protocol: Schema.Literal("effect/VFSAllocator/1"),
  next: Schema.BigInt.check(Schema.isGreaterThanBigInt(BigInt("0")))
})

const allocatorKey = Symbol.for("effect/virtual-file-system/instanceAllocator/v1")

const allocateInstance = (): bigint => {
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
    if (!("value" in descriptor) || !Schema.is(Allocator)(descriptor.value)) {
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

const Count = Schema.Natural

export const count = (input: unknown, operation: string, field: string, minimum = 0): number => {
  if (!Schema.is(Count)(input) || input < minimum) return invalid(operation, field, "range")
  return input
}

export const size = (input: ByteSize.Input, operation: string, field: string): bigint => {
  const decoded = ByteSize.fromInput(input)
  if (decoded._tag === "None") return invalid(operation, field, "range")
  return decoded.value
}

export const configure = (options: M.LimitOptions | undefined): M.Limits => {
  if (options === undefined) return Object.freeze({ ...defaults })
  if (!Schema.is(Schema.Record(Schema.String, Schema.Unknown))(options)) return invalid("make", "limits")
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
      output[key] = count(options[key], "make", key, key === "objects" || key === "operations" ? 1 : 0)
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
      const n = size(options[key], "make", key)
      if (
        (key === "nameBytes" || key === "pathBytes" || key === "expandedPathBytes") && n < BigInt("1")
      ) return invalid("make", key, "range")
      output[key] = ByteSize.bytes(n)
    }
  }
  if (options.synchronous !== undefined) {
    if (!Schema.is(Schema.Boolean)(options.synchronous)) return invalid("make", "synchronous")
    output.synchronous = options.synchronous
  }
  for (const key of Object.keys(options)) if (!(key in defaults)) return invalid("make", key, "excessField")
  return Object.freeze(output)
}

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

  get state(): "open" | "closing" | "closed" {
    return this.currentState
  }

  retainContext<A>(value: A): ContextCell<A> {
    if (this.currentState !== "open") throw closed(this.operation, this.currentState)
    const cell: ContextCell<A> = { value }
    this.contexts.push(cell)
    return cell
  }

  enroll(scope: Scope.Scope, operation: string): Effect.Effect<void, M.OperationError> {
    return Effect.gen({ self: this }, function*() {
      yield* Scope.addFinalizer(scope, this.close)
      if (this.currentState !== "open") return yield* closed(operation)
    })
  }

  own(child: Resource, work?: Work): void {
    if (
      this.currentState !== "open" && !(this.currentState === "closing" && work !== undefined && this.uses.has(work))
    ) {
      throw closed(child.operation, this.currentState)
    }
    child.releaseWith(() => this.owned.delete(child))
    this.owned.add(child)
  }

  releaseWith(release: () => void, work?: Work): void {
    if (
      this.currentState !== "open" && !(this.currentState === "closing" && work !== undefined && this.uses.has(work))
    ) {
      throw closed(this.operation, this.currentState)
    }
    this.releases.push(release)
  }

  use(work: Work): void {
    if (this.currentState !== "open") throw closed(work.operation, this.currentState)
    this.uses.add(work)
  }

  endUse(work: Work): void {
    this.uses.delete(work)
    if (this.currentState === "closing" && this.uses.size === 0) Deferred.doneUnsafe(this.idle, Effect.void)
  }

  closeSyncExit(operation: string): Exit.Exit<void> {
    if (this.outcome !== undefined) return this.outcome
    if (this.runtime.inTurn) throw new M.ReentrantOperation({ operation, reason: "sameInstance" })
    if (this.currentState === "closing") throw new M.Busy({ operation, reason: "draining" })
    if (this.runtime.ordinary !== 0 || this.uses.size !== 0) throw new M.Busy({ operation, reason: "pending" })
    this.currentState = "closing"
    const reasons: Array<Cause.Reason<never>> = []
    // NOTE: Synchronous close must attempt every child without an Effect runner, even when a child throws.
    for (const child of this.owned) {
      try {
        const exit = child.closeSyncExit(operation)
        if (Exit.isFailure(exit)) reasons.push(...exit.cause.reasons)
      } catch (error) {
        reasons.push(Cause.makeDieReason(error))
      }
    }
    this.releaseLocal(reasons)
    const exit = closeExit(reasons)
    this.completeClose(exit)
    return exit
  }

  private releaseLocal(reasons: Array<Cause.Reason<never>>): void {
    // NOTE: Each release must run even after a defect. Preserve repeated occurrences in their observed order.
    for (const release of this.releases) {
      try {
        release()
      } catch (error) {
        reasons.push(Cause.makeDieReason(error))
      }
    }
    this.releases.length = 0
    this.owned.clear()
    if (this.kind === "caller" || this.kind === "region" || this.kind === "operation") this.runtime.callers--
    if (this.kind === "handle") this.runtime.handles--
    try {
      this.runtime.onRelease()
    } catch (error) {
      reasons.push(Cause.makeDieReason(error))
    }
  }

  private completeClose(exit: Exit.Exit<void>): void {
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

export interface Transition<A> {
  readonly value: A
  readonly publish?: () => void
}

interface Prepared<A> {
  readonly execute: () => Transition<A>
  readonly enroll?: Effect.Effect<void, M.OperationError>
}

export interface Preparation<A> {
  readonly bytes: bigint
  readonly snapshot: (work: Work) => Prepared<A>
}

interface TurnRequest {
  readonly work: Work
  readonly ready: Deferred.Deferred<void, M.OperationError>
  state: "preparing" | "queued" | "selected" | "cancelled" | "released"
}

const adjustPayload = Symbol()

const releasePayload = (runtime: Runtime, bytes: bigint, operation: string): () => void => () => {
  runtime[adjustPayload](-bytes, operation)
}

export class ChargedBytes {
  private balance = BigInt("0")
  protected readonly runtime: Runtime
  readonly operation: string

  constructor(runtime: Runtime, operation: string) {
    this.runtime = runtime
    this.operation = operation
  }

  reserve(bytes: bigint, operation = this.operation): void {
    if (bytes < BigInt("0")) return invalid(operation, "payload", "range")
    this.runtime[adjustPayload](bytes, operation)
    this.balance += bytes
  }

  release(bytes: bigint): void {
    if (bytes < BigInt("0") || bytes > this.balance) throw new RangeError("Invalid VFS payload release")
    this.balance -= bytes
    this.runtime[adjustPayload](-bytes, this.operation)
  }

  resize(next: bigint, operation: string): void {
    if (next > this.balance) this.reserve(next - this.balance, operation)
    else this.release(this.balance - next)
  }

  clear(): void {
    this.release(this.balance)
  }

  protected transfer(bytes: bigint, resource: Resource, work: Work): void {
    if (bytes < BigInt("0") || bytes > this.balance) throw new RangeError("Invalid VFS payload transfer")
    resource.releaseWith(releasePayload(this.runtime, bytes, this.operation), work)
    this.balance -= bytes
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

  constructor(ticket: Ticket, receiver: Resource, operation: string, ownTicket: boolean) {
    super(ticket.runtime, operation)
    this.ticket = ticket
    this.receiver = receiver
    this.ownTicket = ownTicket
    receiver.use(this)
  }

  get isFinished(): boolean {
    return this.finished
  }

  get turn(): TurnRequest | undefined {
    return this.request
  }

  prepareTurn(): TurnRequest {
    if (this.request === undefined) {
      this.request = { work: this, ready: Deferred.makeUnsafe(), state: "preparing" }
    }
    return this.request
  }

  retain(bytes: bigint, resource: Resource): void {
    this.transfer(bytes, resource, this)
  }

  borrow(resource: Resource): void {
    resource.use(this)
    this.borrowed.add(resource)
  }

  acquireResource(kind: Resource["kind"], owner?: Resource): Resource {
    const resource = this.ticket.runtime.resource(kind, this.operation)
    this.onFailure(resource)
    owner?.own(resource, this)
    return resource
  }

  onFailure(resource: Resource): void {
    this.rollbackResources.push(resource)
  }

  rollback(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function*() {
      const reasons: Array<Cause.Reason<never>> = []
      for (const resource of this.rollbackResources) {
        const exit = yield* Effect.exit(resource.close)
        if (Exit.isFailure(exit)) reasons.push(...exit.cause.reasons)
      }
      return yield* closeExit(reasons)
    })
  }

  rollbackSync(error: unknown): never {
    // Keep the operation failure first, followed by every cleanup occurrence without short-circuiting.
    const reasons: Array<Cause.Reason<M.OperationError>> = [
      expected(error) ? Cause.makeFailReason(error) : Cause.makeDieReason(error)
    ]
    for (const resource of this.rollbackResources) {
      try {
        const exit = resource.closeSyncExit(this.operation + ".cleanup")
        if (Exit.isFailure(exit)) reasons.push(...exit.cause.reasons)
      } catch (cleanup) {
        reasons.push(Cause.makeDieReason(cleanup))
      }
    }
    if (reasons.length > 1) throw new Cause.UnknownError(Cause.fromReasons(reasons))
    throw error
  }

  finish(): void {
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

const closeExit = (reasons: ReadonlyArray<Cause.Reason<never>>): Exit.Exit<void> =>
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

  resource(kind: Resource["kind"], operation: string): Resource {
    const policy = kind === "caller" || kind === "region" || kind === "operation"
    if (policy && this.callers >= this.limits.callers) return limit(operation, "callers", "admission")
    if (kind === "handle" && this.handles >= this.limits.handles) return limit(operation, "handles", "admission")
    if (policy) this.callers++
    if (kind === "handle") this.handles++
    return new Resource(this, kind, operation)
  }

  acquireScopedResource<A>(
    kind: Resource["kind"],
    operation: string,
    scope: Scope.Scope,
    initialize: (resource: Resource) => A
  ): Effect.Effect<A, M.OperationError> {
    return Effect.uninterruptible(Effect.gen({ self: this }, function*() {
      const resource = yield* evaluate(() => this.resource(kind, operation))
      const acquire = Effect.gen(function*() {
        const value = yield* evaluate(() => initialize(resource))
        yield* resource.enroll(scope, operation)
        return value
      })
      return yield* Effect.onError(acquire, () => resource.close)
    }))
  }

  cancel(work: Work): void {
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

  ledger(options: M.OperationOptions | undefined, operation: string): Ledger {
    return {
      visits: 0,
      comparisons: 0,
      copyBytes: BigInt("0"),
      maxVisits: Math.min(
        this.limits.namespaceVisits,
        options?.maxVisits === undefined
          ? this.limits.namespaceVisits
          : count(options.maxVisits, operation, "maxVisits")
      ),
      maxComparisons: options?.maxComparisons === undefined
        ? DEFAULT_MAX_COMPARISONS
        : count(options.maxComparisons, operation, "maxComparisons"),
      maxCopyBytes: options?.maxCopyBytes === undefined
        ? DEFAULT_MAX_COPY_BYTES
        : size(options.maxCopyBytes, operation, "maxCopyBytes")
    }
  }

  ticket(operation: string, options?: M.OperationOptions): Ticket {
    if (this.ordinary >= this.limits.operations) return limit(operation, "operations", "admission")
    const ledger = this.ledger(options, operation)
    this.ordinary++
    return { runtime: this, ledger, live: true }
  }

  releaseTicket(ticket: Ticket): void {
    if (ticket.live) {
      ticket.live = false
      this.ordinary--
    }
  }

  get payload(): bigint {
    return this.payloadBytes
  }

  [adjustPayload](delta: bigint, operation: string): void {
    if (delta > BigInt("0") && this.payloadBytes + delta > this.limits.transientBytes) {
      return limit(operation, "transient", "reservation")
    }
    this.payloadBytes += delta
  }

  visit(ticket: Ticket, operation: string, amount = 1): void {
    const ledger = ticket.ledger
    if (amount > ledger.maxVisits - ledger.visits) return limit(operation, "visits", "resolution")
    ledger.visits += amount
  }

  // ---------------------------------------------------------------------------
  // Effectful execution
  // ---------------------------------------------------------------------------

  run<A>(
    receiver: Resource,
    operation: string,
    prepare: () => Preparation<A>,
    ticket?: Ticket
  ): Effect.Effect<A, M.OperationError> {
    return Effect.suspend(() => {
      let work: Work | undefined
      let request: TurnRequest
      let action: () => Transition<A>
      let enroll: Effect.Effect<void, M.OperationError> | undefined
      // Preparation can allocate before throwing. Roll back that partial work before admission returns.
      try {
        if (this.inTurn) throw new M.ReentrantOperation({ operation, reason: "sameInstance" })
        if (receiver.state !== "open") throw closed(operation, receiver.state)
        if (ticket !== undefined && !ticket.live) throw closed(operation)
        const plan = prepare()
        if (receiver.state !== "open") throw closed(operation, receiver.state)
        if (ticket !== undefined && !ticket.live) throw closed(operation)
        const acquired = ticket ?? this.ticket(operation)
        work = new Work(acquired, receiver, operation, ticket === undefined)
        request = work.prepareTurn()
        work.reserve(plan.bytes)
        const prepared = plan.snapshot(work)
        action = prepared.execute
        enroll = prepared.enroll
        // NOTE: Queue before Scope enrollment so immediate finalization can cancel admitted work.
        if (request.state !== "cancelled") {
          request.state = "queued"
          this.queue.push(request)
          this.next()
        }
      } catch (error) {
        if (work === undefined) return failure(error)
        const abandoned = work
        this.cancel(abandoned)
        return Effect.uninterruptible(Effect.gen({ self: this }, function*() {
          const reasons: Array<Cause.Reason<M.OperationError>> = [
            expected(error) ? Cause.makeFailReason(error) : Cause.makeDieReason(error)
          ]
          const cleanup = yield* Effect.exit(abandoned.rollback())
          if (Exit.isFailure(cleanup)) reasons.push(...cleanup.cause.reasons)
          this.finish(abandoned)
          return yield* Effect.failCause(Cause.fromReasons(reasons))
        }))
      }
      const admitted = work
      const admittedRequest = request
      const execute = Effect.uninterruptibleMask((restore) =>
        Effect.gen({ self: this }, function*() {
          if (enroll !== undefined) yield* enroll
          yield* Effect.interruptible(Deferred.await(admittedRequest.ready))
          const transition = yield* restore(evaluate(() => {
            this.inTurn = true
            try {
              return action()
            } finally {
              this.inTurn = false
            }
          }))
          // NOTE: Observe interruption before publication, while filesystem changes remain staged.
          yield* Effect.interruptible(Effect.void)
          const publish = transition.publish
          if (publish !== undefined) {
            yield* evaluate(() => {
              this.inTurn = true
              try {
                // Preserve the method receiver while calling the locally narrowed callback.
                publish.call(transition)
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

  // ---------------------------------------------------------------------------
  // Synchronous execution
  // ---------------------------------------------------------------------------

  sync<A>(receiver: Resource, operation: string, body: (work: Work) => Transition<A>): A {
    if (this.inTurn) throw new M.ReentrantOperation({ operation, reason: "sameInstance" })
    if (receiver.state !== "open") throw closed(operation, receiver.state)
    if (this.ordinary !== 0) throw new M.Busy({ operation, reason: "pending" })
    const ticket: Ticket = { runtime: this, ledger: this.ledger(undefined, operation), live: true }
    const work = new Work(ticket, receiver, operation, false)
    // NOTE: Execution, publication and release finish before this call returns, including on failure.
    try {
      this.inTurn = true
      try {
        const transition = body(work)
        transition.publish?.()
        return transition.value
      } finally {
        this.inTurn = false
      }
    } catch (error) {
      return work.rollbackSync(error)
    } finally {
      this.finish(work)
    }
  }

  closeSync(resource: Resource, operation: string): void {
    const exit = resource.closeSyncExit(operation)
    if (Exit.isFailure(exit)) {
      const reasons = exit.cause.reasons
      if (reasons.length === 1 && Cause.isDieReason(reasons[0])) throw reasons[0].defect
      throw new Cause.UnknownError(exit.cause)
    }
  }

  // ---------------------------------------------------------------------------
  // Persistent work and queue cleanup
  // ---------------------------------------------------------------------------

  persistent(receiver: Resource, operation: string, options?: M.OperationOptions): Work {
    if (this.inTurn) throw new M.ReentrantOperation({ operation, reason: "sameInstance" })
    if (receiver.state !== "open") throw closed(operation, receiver.state)
    const ticket = this.ticket(operation, options)
    return new Work(ticket, receiver, operation, true)
  }

  finishPersistent(work: Work): void {
    this.finish(work)
  }

  private next(): void {
    if (this.active !== undefined) return
    const first = this.queue.shift()
    if (first === undefined) return
    first.state = "selected"
    this.active = first
    Deferred.doneUnsafe(first.ready, Effect.void)
  }

  private finish(work: Work): void {
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

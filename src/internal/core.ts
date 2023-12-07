import type * as Cause from "../Cause.js"
import * as Chunk from "../Chunk.js"
import * as Context from "../Context.js"
import type * as Deferred from "../Deferred.js"
import type * as Differ from "../Differ.js"
import type * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Equal from "../Equal.js"
import type * as ExecutionStrategy from "../ExecutionStrategy.js"
import type * as Exit from "../Exit.js"
import type * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import type * as FiberStatus from "../FiberStatus.js"
import type { LazyArg } from "../Function.js"
import { dual, identity, pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import * as Hash from "../Hash.js"
import * as HashMap from "../HashMap.js"
import type * as HashSet from "../HashSet.js"
import { format, NodeInspectSymbol, toJSON } from "../Inspectable.js"
import * as List from "../List.js"
import type * as LogLevel from "../LogLevel.js"
import type * as LogSpan from "../LogSpan.js"
import type * as MetricLabel from "../MetricLabel.js"
import * as MutableRef from "../MutableRef.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty, isObject, isPromise, isString, type Predicate, type Refinement } from "../Predicate.js"
import * as ReadonlyArray from "../ReadonlyArray.js"
import type * as Request from "../Request.js"
import type * as BlockedRequests from "../RequestBlock.js"
import type * as RequestResolver from "../RequestResolver.js"
import type * as RuntimeFlags from "../RuntimeFlags.js"
import * as RuntimeFlagsPatch from "../RuntimeFlagsPatch.js"
import type * as Scope from "../Scope.js"
import type * as Tracer from "../Tracer.js"
import type { NoInfer } from "../Types.js"
import * as _blockedRequests from "./blockedRequests.js"
import * as internalCause from "./cause.js"
import * as deferred from "./deferred.js"
import * as internalDiffer from "./differ.js"
import { effectVariance, StructuralCommitPrototype } from "./effectable.js"
import type * as FiberRuntime from "./fiberRuntime.js"
import type * as fiberScope from "./fiberScope.js"
import { internalize } from "./internalize.js"
import * as DeferredOpCodes from "./opCodes/deferred.js"
import * as OpCodes from "./opCodes/effect.js"
import * as _runtimeFlags from "./runtimeFlags.js"
import * as internalTracer from "./tracer.js"

// -----------------------------------------------------------------------------
// Effect
// -----------------------------------------------------------------------------

/** @internal */
const EffectErrorSymbolKey = "effect/EffectError"

/** @internal */
export const EffectErrorTypeId = Symbol.for(EffectErrorSymbolKey)

/** @internal */
export type EffectErrorTypeId = typeof EffectErrorTypeId

/** @internal */
export interface EffectError<out E> {
  readonly [EffectErrorTypeId]: EffectErrorTypeId
  readonly _tag: "EffectError"
  readonly cause: Cause.Cause<E>
}

/** @internal */
export const isEffectError = (u: unknown): u is EffectError<unknown> => hasProperty(u, EffectErrorTypeId)

/** @internal */
export const makeEffectError = <E>(cause: Cause.Cause<E>): EffectError<E> => ({
  [EffectErrorTypeId]: EffectErrorTypeId,
  _tag: "EffectError",
  cause
})

/**
 * @internal
 */
export const blocked = <E, A>(
  blockedRequests: BlockedRequests.RequestBlock,
  _continue: Effect.Effect<never, E, A>
): Effect.Blocked<E, A> => {
  const effect = new EffectPrimitive("Blocked") as any
  effect.i0 = blockedRequests
  effect.i1 = _continue
  return effect
}

/**
 * @internal
 */
export const runRequestBlock = (
  blockedRequests: BlockedRequests.RequestBlock
): Effect.Effect<never, never, void> => {
  const effect = new EffectPrimitive("RunBlocked") as any
  effect.i0 = blockedRequests
  return effect
}

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("effect/Effect") as Effect.EffectTypeId

/** @internal */
export type Primitive =
  | Async
  | Commit
  | Failure
  | OnFailure
  | OnSuccess
  | OnStep
  | OnSuccessAndFailure
  | Success
  | Sync
  | UpdateRuntimeFlags
  | While
  | WithRuntime
  | Yield
  | OpTag
  | Blocked
  | RunBlocked
  | Either.Either<any, any>
  | Option.Option<any>

/** @internal */
export type Continuation =
  | OnSuccess
  | OnStep
  | OnSuccessAndFailure
  | OnFailure
  | While
  | RevertFlags

/** @internal */
export class RevertFlags {
  readonly _op = OpCodes.OP_REVERT_FLAGS
  constructor(
    readonly patch: RuntimeFlagsPatch.RuntimeFlagsPatch,
    readonly op: Primitive & { _op: OpCodes.OP_UPDATE_RUNTIME_FLAGS }
  ) {
  }
}

/** @internal */
class EffectPrimitive {
  public i0 = undefined
  public i1 = undefined
  public i2 = undefined
  public trace = undefined;
  [EffectTypeId] = effectVariance
  constructor(readonly _op: Primitive["_op"]) {}
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  toJSON() {
    return {
      _id: "Effect",
      _op: this._op,
      i0: toJSON(this.i0),
      i1: toJSON(this.i1),
      i2: toJSON(this.i2)
    }
  }
  toString() {
    return format(this.toJSON())
  }
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
class EffectPrimitiveFailure {
  public i0 = undefined
  public i1 = undefined
  public i2 = undefined
  public trace = undefined;
  [EffectTypeId] = effectVariance
  constructor(readonly _op: Primitive["_op"]) {
    // @ts-expect-error
    this._tag = _op
  }
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  get cause() {
    return this.i0
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  toJSON() {
    return {
      _id: "Exit",
      _tag: this._op,
      cause: (this.cause as any).toJSON()
    }
  }
  toString() {
    return format(this.toJSON())
  }
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
class EffectPrimitiveSuccess {
  public i0 = undefined
  public i1 = undefined
  public i2 = undefined
  public trace = undefined;
  [EffectTypeId] = effectVariance
  constructor(readonly _op: Primitive["_op"]) {
    // @ts-expect-error
    this._tag = _op
  }
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  get value() {
    return this.i0
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  toJSON() {
    return {
      _id: "Exit",
      _tag: this._op,
      value: toJSON(this.value)
    }
  }
  toString() {
    return format(this.toJSON())
  }
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
export type Op<Tag extends string, Body = {}> = Effect.Effect<never, never, never> & Body & {
  readonly _op: Tag
}

/** @internal */
export interface Async extends
  Op<OpCodes.OP_ASYNC, {
    i0(resume: (effect: Primitive) => void): void
    readonly i1: FiberId.FiberId
  }>
{}

/** @internal */
export interface Blocked<out E = any, out A = any> extends
  Op<"Blocked", {
    readonly i0: BlockedRequests.RequestBlock
    readonly i1: Effect.Effect<never, E, A>
  }>
{}

/** @internal */
export interface RunBlocked extends
  Op<"RunBlocked", {
    readonly i0: BlockedRequests.RequestBlock
  }>
{}

/** @internal */
export interface Failure extends
  Op<OpCodes.OP_FAILURE, {
    readonly i0: Cause.Cause<unknown>
  }>
{}

/** @internal */
export interface OpTag extends Op<OpCodes.OP_TAG, {}> {}

/** @internal */
export interface Commit extends
  Op<OpCodes.OP_COMMIT, {
    commit(): Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface OnFailure extends
  Op<OpCodes.OP_ON_FAILURE, {
    readonly i0: Primitive
    i1(a: Cause.Cause<unknown>): Primitive
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<OpCodes.OP_ON_SUCCESS, {
    readonly i0: Primitive
    i1(a: unknown): Primitive
  }>
{}

/** @internal */
export interface OnStep extends Op<"OnStep", { readonly i0: Primitive }> {}

/** @internal */
export interface OnSuccessAndFailure extends
  Op<OpCodes.OP_ON_SUCCESS_AND_FAILURE, {
    readonly i0: Primitive
    i1(a: Cause.Cause<unknown>): Primitive
    i2(a: unknown): Primitive
  }>
{}

/** @internal */
export interface Success extends
  Op<OpCodes.OP_SUCCESS, {
    readonly i0: unknown
  }>
{}

/** @internal */
export interface Sync extends
  Op<OpCodes.OP_SYNC, {
    i0(): unknown
  }>
{}

/** @internal */
export interface UpdateRuntimeFlags extends
  Op<OpCodes.OP_UPDATE_RUNTIME_FLAGS, {
    readonly i0: RuntimeFlagsPatch.RuntimeFlagsPatch
    readonly i1?: (oldRuntimeFlags: RuntimeFlags.RuntimeFlags) => Primitive
  }>
{}

/** @internal */
export interface While extends
  Op<OpCodes.OP_WHILE, {
    i0(): boolean
    i1(): Primitive
    i2(a: unknown): void
  }>
{}

/** @internal */
export interface WithRuntime extends
  Op<OpCodes.OP_WITH_RUNTIME, {
    i0(fiber: FiberRuntime.FiberRuntime<unknown, unknown>, status: FiberStatus.Running): Primitive
  }>
{}

/** @internal */
export interface Yield extends Op<OpCodes.OP_YIELD> {}

/** @internal */
export const isEffect = (u: unknown): u is Effect.Effect<unknown, unknown, unknown> => hasProperty(u, EffectTypeId)

/* @internal */
export const withFiberRuntime = <R, E, A>(
  withRuntime: (fiber: FiberRuntime.FiberRuntime<E, A>, status: FiberStatus.Running) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  internalize(withRuntime)
  const effect = new EffectPrimitive(OpCodes.OP_WITH_RUNTIME) as any
  effect.i0 = withRuntime
  return effect
}

/* @internal */
export const acquireUseRelease = dual<
  <A, R2, E2, A2, R3, X>(
    use: (a: A) => Effect.Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
  ) => <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E | E2, A2>,
  <R, E, A, R2, E2, A2, R3, X>(
    acquire: Effect.Effect<R, E, A>,
    use: (a: A) => Effect.Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
  ) => Effect.Effect<R | R2 | R3, E | E2, A2>
>(3, <R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect.Effect<R, E, A>,
  use: (a: A) => Effect.Effect<R2, E2, A2>,
  release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
): Effect.Effect<R | R2 | R3, E | E2, A2> =>
  uninterruptibleMask((restore) =>
    flatMap(
      acquire,
      (a) =>
        flatMap(exit(suspend(() => restore(use(a)))), (exit): Effect.Effect<R | R2 | R3, E | E2, A2> => {
          return suspend(() => release(a, exit)).pipe(
            matchCauseEffect({
              onFailure: (cause) => {
                switch (exit._tag) {
                  case OpCodes.OP_FAILURE: {
                    return failCause(internalCause.parallel(exit.i0, cause))
                  }
                  case OpCodes.OP_SUCCESS: {
                    return failCause(cause)
                  }
                }
              },
              onSuccess: () => exit
            })
          )
        })
    )
  ))

/* @internal */
export const as = dual<
  <B>(value: B) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>,
  <R, E, A, B>(self: Effect.Effect<R, E, A>, value: B) => Effect.Effect<R, E, B>
>(2, (self, value) => flatMap(self, () => succeed(value)))

/* @internal */
export const asUnit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, void> => as(self, void 0)

/* @internal */
export const async = <R, E, A>(
  register: (
    callback: (_: Effect.Effect<R, E, A>) => void,
    signal: AbortSignal
  ) => void | Effect.Effect<R, never, void>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> =>
  suspend(() => {
    internalize(register)
    let backingResume: ((_: Effect.Effect<R, E, A>) => void) | undefined = undefined
    let pendingEffect: Effect.Effect<R, E, A> | undefined = undefined
    function proxyResume(effect: Effect.Effect<R, E, A>) {
      if (backingResume) {
        backingResume(effect)
      } else if (pendingEffect === undefined) {
        pendingEffect = effect
      }
    }
    const effect = new EffectPrimitive(OpCodes.OP_ASYNC) as any
    effect.i0 = (resume: (_: Effect.Effect<R, E, A>) => void) => {
      backingResume = resume
      if (pendingEffect) {
        resume(pendingEffect)
      }
    }
    effect.i1 = blockingOn

    let cancelerRef: Effect.Effect<R, never, void> | void = undefined
    let controllerRef: AbortController | void = undefined
    if (register.length !== 1) {
      controllerRef = new AbortController()
      cancelerRef = register(proxyResume, controllerRef.signal)
    } else {
      cancelerRef = (register as any)(proxyResume)
    }

    return (cancelerRef || controllerRef) ?
      onInterrupt(effect, (_) => {
        if (controllerRef) {
          controllerRef.abort()
        }
        return cancelerRef ?? unit
      }) :
      effect
  })

/* @internal */
export const asyncEither = <R, E, A>(
  register: (
    callback: (effect: Effect.Effect<R, E, A>) => void
  ) => Either.Either<Effect.Effect<R, never, void>, Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> =>
  async<R, E, A>((resume) => {
    const result = register(resume)
    if (Either.isRight(result)) {
      resume(result.right)
    } else {
      return result.left
    }
  }, blockingOn)

/* @internal */
export const catchAllCause = dual<
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R2 | R, E2, A2 | A>
>(2, (self, f) => {
  const effect = new EffectPrimitive(OpCodes.OP_ON_FAILURE) as any
  effect.i0 = self
  effect.i1 = f
  internalize(f)
  return effect
})

/* @internal */
export const catchAll = dual<
  <E, R2, E2, A2>(
    f: (e: E) => Effect.Effect<R2, E2, A2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R2 | R, E2, A2 | A>
>(2, (self, f) => matchEffect(self, { onFailure: f, onSuccess: succeed }))

/**
 * @macro identity
 * @internal
 */
export const unified = <Args extends ReadonlyArray<any>, Ret extends Effect.Effect<any, any, any>>(
  f: (...args: Args) => Ret
) =>
(...args: Args): Effect.Effect.Unify<Ret> => f(...args)

/* @internal */
export const catchIf = dual<
  {
    <E, EA extends E, EB extends EA, R2, E2, A2>(
      refinement: Refinement<EA, EB>,
      f: (e: EB) => Effect.Effect<R2, E2, A2>
    ): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, Exclude<E, EB> | E2, A2 | A>
    <E, EX extends E, R2, E2, A2>(
      predicate: Predicate<EX>,
      f: (e: EX) => Effect.Effect<R2, E2, A2>
    ): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E | E2, A2 | A>
  },
  {
    <R, E, A, EA extends E, EB extends EA, R2, E2, A2>(
      self: Effect.Effect<R, E, A>,
      refinement: Refinement<EA, EB>,
      f: (e: EB) => Effect.Effect<R2, E2, A2>
    ): Effect.Effect<R2 | R, Exclude<E, EB> | E2, A2 | A>
    <R, E, A, EX extends E, R2, E2, A2>(
      self: Effect.Effect<R, E, A>,
      predicate: Predicate<EX>,
      f: (e: EX) => Effect.Effect<R2, E2, A2>
    ): Effect.Effect<R2 | R, E | E2, A2 | A>
  }
>(3, <R, E, A, EX extends E, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  predicate: Predicate<EX>,
  f: (e: EX) => Effect.Effect<R2, E2, A2>
) =>
  catchAllCause(self, (cause): Effect.Effect<R2 | R, E | E2, A2 | A> => {
    const either = internalCause.failureOrCause(cause)
    switch (either._tag) {
      case "Left": {
        return predicate(either.left as EX) ? f(either.left as EX) : failCause(cause)
      }
      case "Right": {
        return failCause(either.right)
      }
    }
  }))

/* @internal */
export const catchSome = dual<
  <E, R2, E2, A2>(
    pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E | E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R2 | R, E | E2, A2 | A>
>(2, <R, A, E, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>
) =>
  catchAllCause(self, (cause): Effect.Effect<R2 | R, E | E2, A2 | A> => {
    const either = internalCause.failureOrCause(cause)
    switch (either._tag) {
      case "Left": {
        return pipe(pf(either.left), Option.getOrElse(() => failCause(cause)))
      }
      case "Right": {
        return failCause(either.right)
      }
    }
  }))

/* @internal */
export const checkInterruptible = <R, E, A>(
  f: (isInterruptible: boolean) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  withFiberRuntime<R, E, A>((_, status) => f(_runtimeFlags.interruption(status.runtimeFlags)))

const spanSymbol = Symbol.for("effect/SpanAnnotation")
const originalSymbol = Symbol.for("effect/OriginalAnnotation")

/* @internal */
export const originalInstance = <E>(obj: E): E => {
  if (hasProperty(obj, originalSymbol)) {
    // @ts-expect-error
    return obj[originalSymbol]
  }
  return obj
}

/* @internal */
const capture = <E>(obj: E & object, span: Option.Option<Tracer.Span>): E => {
  if (Option.isSome(span)) {
    return new Proxy(obj, {
      has(target, p) {
        return p === spanSymbol || p === originalSymbol || p in target
      },
      get(target, p) {
        if (p === spanSymbol) {
          return span.value
        }
        if (p === originalSymbol) {
          return obj
        }
        // @ts-expect-error
        return target[p]
      }
    })
  }
  return obj
}

/* @internal */
export const die = (defect: unknown): Effect.Effect<never, never, never> =>
  isObject(defect) && !(spanSymbol in defect) ?
    withFiberRuntime((fiber) => failCause(internalCause.die(capture(defect, currentSpanFromFiber(fiber)))))
    : failCause(internalCause.die(defect))

/* @internal */
export const dieMessage = (message: string): Effect.Effect<never, never, never> =>
  failCauseSync(() => internalCause.die(new RuntimeException(message)))

/* @internal */
export const dieSync = (evaluate: LazyArg<unknown>): Effect.Effect<never, never, never> => flatMap(sync(evaluate), die)

/* @internal */
export const either = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Either.Either<E, A>> =>
  matchEffect(self, {
    onFailure: (e) => succeed(Either.left(e)),
    onSuccess: (a) => succeed(Either.right(a))
  })

/* @internal */
export const exit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Exit.Exit<E, A>> =>
  matchCause(self, {
    onFailure: exitFailCause,
    onSuccess: exitSucceed
  })

/* @internal */
export const fail = <E>(error: E): Effect.Effect<never, E, never> =>
  isObject(error) && !(spanSymbol in error) ?
    withFiberRuntime((fiber) => failCause(internalCause.fail(capture(error, currentSpanFromFiber(fiber)))))
    : failCause(internalCause.fail(error))

/* @internal */
export const failSync = <E>(evaluate: LazyArg<E>): Effect.Effect<never, E, never> => flatMap(sync(evaluate), fail)

/* @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const effect = new EffectPrimitiveFailure(OpCodes.OP_FAILURE) as any
  effect.i0 = cause
  return effect
}

/* @internal */
export const failCauseSync = <E>(
  evaluate: LazyArg<Cause.Cause<E>>
): Effect.Effect<never, E, never> => flatMap(sync(evaluate), failCause)

/* @internal */
export const fiberId: Effect.Effect<never, never, FiberId.FiberId> = withFiberRuntime<never, never, FiberId.FiberId>((
  state
) => succeed(state.id()))

/* @internal */
export const fiberIdWith = <R, E, A>(
  f: (descriptor: FiberId.Runtime) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => withFiberRuntime<R, E, A>((state) => f(state.id()))

/* @internal */
export const flatMap = dual<
  <A, R1, E1, B>(
    f: (a: A) => Effect.Effect<R1, E1, B>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R1 | R, E1 | E, B>,
  <R, E, A, R1, E1, B>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => Effect.Effect<R1, E1, B>
  ) => Effect.Effect<R1 | R, E1 | E, B>
>(2, (self, f) => {
  internalize(f)
  const effect = new EffectPrimitive(OpCodes.OP_ON_SUCCESS) as any
  effect.i0 = self
  effect.i1 = f
  return effect
})

/* @internal */
export const andThen = dual<
  {
    <A, X>(
      f: (a: NoInfer<A>) => X
    ): <R, E>(
      self: Effect.Effect<R, E, A>
    ) => [X] extends [Effect.Effect<infer R1, infer E1, infer A1>] ? Effect.Effect<R | R1, E | E1, A1>
      : [X] extends [Promise<infer A1>] ? Effect.Effect<R, E | Cause.UnknownException, A1>
      : Effect.Effect<R, E, X>
    <X>(
      f: X
    ): <R, E, A>(
      self: Effect.Effect<R, E, A>
    ) => [X] extends [Effect.Effect<infer R1, infer E1, infer A1>] ? Effect.Effect<R | R1, E | E1, A1>
      : [X] extends [Promise<infer A1>] ? Effect.Effect<R, E | Cause.UnknownException, A1>
      : Effect.Effect<R, E, X>
  },
  {
    <A, R, E, X>(
      self: Effect.Effect<R, E, A>,
      f: (a: NoInfer<A>) => X
    ): [X] extends [Effect.Effect<infer R1, infer E1, infer A1>] ? Effect.Effect<R | R1, E | E1, A1>
      : [X] extends [Promise<infer A1>] ? Effect.Effect<R, E | Cause.UnknownException, A1>
      : Effect.Effect<R, E, X>
    <A, R, E, X>(
      self: Effect.Effect<R, E, A>,
      f: X
    ): [X] extends [Effect.Effect<infer R1, infer E1, infer A1>] ? Effect.Effect<R | R1, E | E1, A1>
      : [X] extends [Promise<infer A1>] ? Effect.Effect<R, E | Cause.UnknownException, A1>
      : Effect.Effect<R, E, X>
  }
>(2, (self, f) =>
  flatMap(self, (a) => {
    const b = typeof f === "function" ? (f as any)(a) : f
    if (isEffect(b)) {
      return b
    } else if (isPromise(b)) {
      return async<never, Cause.UnknownException, any>((resume) => {
        b.then((a) => resume(succeed(a))).catch((e) => resume(fail(new UnknownException(e))))
      })
    }
    return succeed(b)
  }))

/* @internal */
export const step = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, never, Exit.Exit<E, A> | Effect.Blocked<E, A>> => {
  const effect = new EffectPrimitive("OnStep") as any
  effect.i0 = self
  return effect
}

/* @internal */
export const flatten = <R, E, R1, E1, A>(self: Effect.Effect<R, E, Effect.Effect<R1, E1, A>>) => flatMap(self, identity)

/* @internal */
export const flip = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, A, E> =>
  matchEffect(self, { onFailure: succeed, onSuccess: fail })

/* @internal */
export const matchCause = dual<
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A2 | A3>,
  <R, E, A2, A, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ) => Effect.Effect<R, never, A2 | A3>
>(2, (self, { onFailure, onSuccess }) =>
  matchCauseEffect(self, {
    onFailure: (cause) => succeed(onFailure(cause)),
    onSuccess: (a) => succeed(onSuccess(a))
  }))

/* @internal */
export const matchCauseEffect = dual<
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>
>(2, (self, { onFailure, onSuccess }) => {
  const effect = new EffectPrimitive(OpCodes.OP_ON_SUCCESS_AND_FAILURE) as any
  effect.i0 = self
  effect.i1 = onFailure
  effect.i2 = onSuccess
  internalize(onFailure)
  internalize(onSuccess)
  return effect
})

/* @internal */
export const matchEffect = dual<
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (e: E) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (e: E) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>
>(2, (self, { onFailure, onSuccess }) =>
  matchCauseEffect(self, {
    onFailure: (cause) => {
      const failures = internalCause.failures(cause)
      const defects = internalCause.defects(cause)
      if (defects.length > 0) {
        return failCause(internalCause.electFailures(cause))
      }
      if (failures.length > 0) {
        return onFailure(Chunk.unsafeHead(failures))
      }
      return failCause(cause as Cause.Cause<never>)
    },
    onSuccess
  }))

/* @internal */
export const forEachSequential = dual<
  <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => (self: Iterable<A>) => Effect.Effect<R, E, Array<B>>,
  <A, R, E, B>(self: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>) => Effect.Effect<R, E, Array<B>>
>(2, (self, f) =>
  suspend(() => {
    const arr = ReadonlyArray.fromIterable(self)
    const ret = new Array(arr.length)
    let i = 0
    return as(
      whileLoop({
        while: () => i < arr.length,
        body: () => f(arr[i], i),
        step: (b) => {
          ret[i++] = b
        }
      }),
      ret
    )
  }))

/* @internal */
export const forEachSequentialDiscard = dual<
  <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => (self: Iterable<A>) => Effect.Effect<R, E, void>,
  <A, R, E, B>(self: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>) => Effect.Effect<R, E, void>
>(2, (self, f) =>
  suspend(() => {
    const arr = ReadonlyArray.fromIterable(self)
    let i = 0
    return whileLoop({
      while: () => i < arr.length,
      body: () => f(arr[i], i),
      step: () => {
        i++
      }
    })
  }))

/* @internal */
export const if_ = dual<
  <R1, R2, E1, E2, A, A1>(
    options: {
      readonly onTrue: Effect.Effect<R1, E1, A>
      readonly onFalse: Effect.Effect<R2, E2, A1>
    }
  ) => <R = never, E = never>(
    self: Effect.Effect<R, E, boolean> | boolean
  ) => Effect.Effect<R | R1 | R2, E | E1 | E2, A | A1>,
  {
    <R1, R2, E1, E2, A, A1>(
      self: boolean,
      options: {
        readonly onTrue: Effect.Effect<R1, E1, A>
        readonly onFalse: Effect.Effect<R2, E2, A1>
      }
    ): Effect.Effect<R1 | R2, E1 | E2, A | A1>
    <R, E, R1, R2, E1, E2, A, A1>(
      self: Effect.Effect<R, E, boolean>,
      options: {
        readonly onTrue: Effect.Effect<R1, E1, A>
        readonly onFalse: Effect.Effect<R2, E2, A1>
      }
    ): Effect.Effect<R1 | R2 | R, E1 | E2 | E, A | A1>
  }
>(
  (args) => typeof args[0] === "boolean" || isEffect(args[0]),
  (self: boolean | Effect.Effect<unknown, unknown, unknown>, { onFalse, onTrue }: {
    readonly onTrue: Effect.Effect<unknown, unknown, unknown>
    readonly onFalse: Effect.Effect<unknown, unknown, unknown>
  }) => typeof self === "boolean" ? (self ? onTrue : onFalse) : flatMap(self, unified((b) => (b ? onTrue : onFalse)))
)

/* @internal */
export const interrupt: Effect.Effect<never, never, never> = flatMap(fiberId, (fiberId) => interruptWith(fiberId))

/* @internal */
export const interruptWith = (fiberId: FiberId.FiberId): Effect.Effect<never, never, never> =>
  failCause(internalCause.interrupt(fiberId))

/* @internal */
export const interruptible = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.enable(_runtimeFlags.Interruption)
  effect.i1 = () => self
  return effect
}

/* @internal */
export const interruptibleMask = <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect.Effect<RX, EX, AX>) => Effect.Effect<RX, EX, AX>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  internalize(f)
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.enable(_runtimeFlags.Interruption)
  effect.i1 = (oldFlags: RuntimeFlags.RuntimeFlags) =>
    _runtimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  return effect
}

/* @internal */
export const intoDeferred = dual<
  <E, A>(deferred: Deferred.Deferred<E, A>) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, boolean>,
  <R, E, A>(self: Effect.Effect<R, E, A>, deferred: Deferred.Deferred<E, A>) => Effect.Effect<R, never, boolean>
>(2, (self, deferred) =>
  uninterruptibleMask((restore) =>
    flatMap(
      exit(restore(self)),
      (exit) => deferredDone(deferred, exit)
    )
  ))

/* @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>,
  <R, E, A, B>(self: Effect.Effect<R, E, A>, f: (a: A) => B) => Effect.Effect<R, E, B>
>(2, (self, f) => flatMap(self, (a) => sync(() => f(a))))

/* @internal */
export const mapBoth = dual<
  <E, A, E2, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A2>,
  <R, E, A, E2, A2>(
    self: Effect.Effect<R, E, A>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ) => Effect.Effect<R, E2, A2>
>(2, (self, { onFailure, onSuccess }) =>
  matchEffect(self, {
    onFailure: (e) => failSync(() => onFailure(e)),
    onSuccess: (a) => sync(() => onSuccess(a))
  }))

/* @internal */
export const mapError = dual<
  <E, E2>(f: (e: E) => E2) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>,
  <R, A, E, E2>(self: Effect.Effect<R, E, A>, f: (e: E) => E2) => Effect.Effect<R, E2, A>
>(2, (self, f) =>
  matchCauseEffect(self, {
    onFailure: (cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return failSync(() => f(either.left))
        }
        case "Right": {
          return failCause(either.right)
        }
      }
    },
    onSuccess: succeed
  }))

/* @internal */
export const onError = dual<
  <E, R2, X>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E, A>,
  <R, A, E, R2, X>(
    self: Effect.Effect<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R2 | R, E, A>
>(2, (self, cleanup) => onExit(self, unified((exit) => exitIsSuccess(exit) ? unit : cleanup(exit.i0))))

/* @internal */
export const onExit = dual<
  <E, A, R2, X>(
    cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E, A>,
  <R, E, A, R2, X>(
    self: Effect.Effect<R, E, A>,
    cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R2 | R, E, A>
>(2, (self, cleanup) =>
  uninterruptibleMask((restore) =>
    matchCauseEffect(restore(self), {
      onFailure: (cause1) => {
        const result = exitFailCause(cause1)
        return matchCauseEffect(cleanup(result), {
          onFailure: (cause2) => exitFailCause(internalCause.sequential(cause1, cause2)),
          onSuccess: () => result
        })
      },
      onSuccess: (success) => {
        const result = exitSucceed(success)
        return zipRight(cleanup(result), result)
      }
    })
  ))

/* @internal */
export const onInterrupt = dual<
  <R2, X>(
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect.Effect<R2, never, X>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E, A>,
  <R, E, A, R2, X>(
    self: Effect.Effect<R, E, A>,
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R2 | R, E, A>
>(2, (self, cleanup) =>
  onExit(
    self,
    exitMatch({
      onFailure: (cause) =>
        internalCause.isInterruptedOnly(cause)
          ? asUnit(cleanup(internalCause.interruptors(cause)))
          : unit,
      onSuccess: () => unit
    })
  ))

/* @internal */
export const orElse = dual<
  <R2, E2, A2>(
    that: LazyArg<Effect.Effect<R2, E2, A2>>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: LazyArg<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R | R2, E2, A | A2>
>(2, (self, that) => attemptOrElse(self, that, succeed))

/* @internal */
export const orDie = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => orDieWith(self, identity)

/* @internal */
export const orDieWith = dual<
  <E>(f: (error: E) => unknown) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, f: (error: E) => unknown) => Effect.Effect<R, never, A>
>(2, (self, f) =>
  matchEffect(self, {
    onFailure: (e) => die(f(e)),
    onSuccess: succeed
  }))

/* @internal */
export const partitionMap = <A, A1, A2>(
  elements: Iterable<A>,
  f: (a: A) => Either.Either<A1, A2>
): [left: Array<A1>, right: Array<A2>] =>
  ReadonlyArray.fromIterable(elements).reduceRight(
    ([lefts, rights], current) => {
      const either = f(current)
      switch (either._tag) {
        case "Left": {
          return [[either.left, ...lefts], rights]
        }
        case "Right": {
          return [lefts, [either.right, ...rights]]
        }
      }
    },
    [new Array<A1>(), new Array<A2>()]
  )

/* @internal */
export const runtimeFlags: Effect.Effect<never, never, RuntimeFlags.RuntimeFlags> = withFiberRuntime<
  never,
  never,
  RuntimeFlags.RuntimeFlags
>((_, status) => succeed(status.runtimeFlags))

/* @internal */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => {
  const effect = new EffectPrimitiveSuccess(OpCodes.OP_SUCCESS) as any
  effect.i0 = value
  return effect
}

/* @internal */
export const suspend = <R, E, A>(effect: LazyArg<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> =>
  flatMap(sync(effect), identity)

/* @internal */
export const sync = <A>(evaluate: LazyArg<A>): Effect.Effect<never, never, A> => {
  internalize(evaluate)
  const effect = new EffectPrimitive(OpCodes.OP_SYNC) as any
  effect.i0 = evaluate
  return effect
}

/* @internal */
export const tap = dual<
  {
    <A, X>(
      f: (a: NoInfer<A>) => X
    ): <R, E>(
      self: Effect.Effect<R, E, A>
    ) => [X] extends [Effect.Effect<infer R1, infer E1, infer _A1>] ? Effect.Effect<R | R1, E | E1, A>
      : [X] extends [Promise<infer _A1>] ? Effect.Effect<R, E | Cause.UnknownException, A>
      : Effect.Effect<R, E, A>
    <X>(
      f: X
    ): <R, E, A>(
      self: Effect.Effect<R, E, A>
    ) => [X] extends [Effect.Effect<infer R1, infer E1, infer _A1>] ? Effect.Effect<R | R1, E | E1, A>
      : [X] extends [Promise<infer _A1>] ? Effect.Effect<R, E | Cause.UnknownException, A>
      : Effect.Effect<R, E, A>
  },
  {
    <A, R, E, X>(
      self: Effect.Effect<R, E, A>,
      f: (a: NoInfer<A>) => X
    ): [X] extends [Effect.Effect<infer R1, infer E1, infer _A1>] ? Effect.Effect<R | R1, E | E1, A>
      : [X] extends [Promise<infer _A1>] ? Effect.Effect<R, E | Cause.UnknownException, A>
      : Effect.Effect<R, E, A>
    <A, R, E, X>(
      self: Effect.Effect<R, E, A>,
      f: X
    ): [X] extends [Effect.Effect<infer R1, infer E1, infer _A1>] ? Effect.Effect<R | R1, E | E1, A>
      : [X] extends [Promise<infer _A1>] ? Effect.Effect<R, E | Cause.UnknownException, A>
      : Effect.Effect<R, E, A>
  }
>(2, (self, f) =>
  flatMap(self, (a) => {
    const b = typeof f === "function" ? (f as any)(a) : f
    if (isEffect(b)) {
      return as(b, a)
    } else if (isPromise(b)) {
      return async<never, Cause.UnknownException, any>((resume) => {
        b.then((_) => resume(succeed(a))).catch((e) => resume(fail(new UnknownException(e))))
      })
    }
    return succeed(a)
  }))

/* @internal */
export const transplant = <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect.Effect<R2, E2, A2>) => Effect.Effect<R2, E2, A2>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  withFiberRuntime<R, E, A>((state) => {
    const scopeOverride = state.getFiberRef(currentForkScopeOverride)
    const scope = pipe(scopeOverride, Option.getOrElse(() => state.scope()))
    return f(fiberRefLocally(currentForkScopeOverride, Option.some(scope)))
  })

/* @internal */
export const attemptOrElse = dual<
  <R2, E2, A2, A, R3, E3, A3>(
    that: LazyArg<Effect.Effect<R2, E2, A2>>,
    onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    that: LazyArg<Effect.Effect<R2, E2, A2>>,
    onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
  ) => Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3>
>(3, (self, that, onSuccess) =>
  matchCauseEffect(self, {
    onFailure: (cause) => {
      const defects = internalCause.defects(cause)
      if (defects.length > 0) {
        return failCause(Option.getOrThrow(internalCause.keepDefectsAndElectFailures(cause)))
      }
      return that()
    },
    onSuccess
  }))

/* @internal */
export const uninterruptible: <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.disable(_runtimeFlags.Interruption)
  effect.i1 = () => self
  return effect
}

/* @internal */
export const uninterruptibleMask = <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect.Effect<RX, EX, AX>) => Effect.Effect<RX, EX, AX>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  internalize(f)
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.disable(_runtimeFlags.Interruption)
  effect.i1 = (oldFlags: RuntimeFlags.RuntimeFlags) =>
    _runtimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  return effect
}

/* @internal */
export const unit: Effect.Effect<never, never, void> = succeed(void 0)

/* @internal */
export const updateRuntimeFlags = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): Effect.Effect<never, never, void> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = patch
  effect.i1 = void 0
  return effect
}

/* @internal */
export const whenEffect = dual<
  <R, E>(
    predicate: Effect.Effect<R, E, boolean>
  ) => <R2, E2, A>(
    effect: Effect.Effect<R2, E2, A>
  ) => Effect.Effect<R | R2, E | E2, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: Effect.Effect<R2, E2, A>,
    predicate: Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R | R2, E | E2, Option.Option<A>>
>(2, (self, predicate) =>
  flatMap(predicate, (b) => {
    if (b) {
      return pipe(self, map(Option.some))
    }
    return succeed(Option.none())
  }))

/* @internal */
export const whileLoop = <R, E, A>(
  options: {
    readonly while: LazyArg<boolean>
    readonly body: LazyArg<Effect.Effect<R, E, A>>
    readonly step: (a: A) => void
  }
): Effect.Effect<R, E, void> => {
  const effect = new EffectPrimitive(OpCodes.OP_WHILE) as any
  effect.i0 = options.while
  effect.i1 = options.body
  effect.i2 = options.step
  internalize(options.body)
  internalize(options.step)
  internalize(options.while)
  return effect
}

/* @internal */
export const withConcurrency = dual<
  (concurrency: number | "unbounded") => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, concurrency: number | "unbounded") => Effect.Effect<R, E, A>
>(2, (self, concurrency) => fiberRefLocally(self, currentConcurrency, concurrency))

/* @internal */
export const withRequestBatching = dual<
  (requestBatching: boolean) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, requestBatching: boolean) => Effect.Effect<R, E, A>
>(2, (self, requestBatching) => fiberRefLocally(self, currentRequestBatching, requestBatching))

/* @internal */
export const withRuntimeFlags = dual<
  (update: RuntimeFlagsPatch.RuntimeFlagsPatch) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, update: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect.Effect<R, E, A>
>(2, (self, update) => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = update
  effect.i1 = () => self
  return effect
})

/** @internal */
export const withTracerTiming = dual<
  (enabled: boolean) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, enabled: boolean) => Effect.Effect<R, E, A>
>(2, (effect, enabled) =>
  fiberRefLocally(
    effect,
    currentTracerTimingEnabled,
    enabled
  ))

/* @internal */
export const yieldNow = (options?: {
  readonly priority?: number | undefined
}): Effect.Effect<never, never, void> => {
  const effect = new EffectPrimitive(OpCodes.OP_YIELD) as any
  return typeof options?.priority !== "undefined" ?
    withSchedulingPriority(effect, options.priority) :
    effect
}

/* @internal */
export const zip = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>
>(2, <R, E, A, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>
): Effect.Effect<R | R2, E | E2, [A, A2]> => flatMap(self, (a) => map(that, (b) => [a, b])))

/* @internal */
export const zipFlatten = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A extends ReadonlyArray<any>>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [...A, A2]>,
  <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, [...A, A2]>
>(2, <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>
): Effect.Effect<R | R2, E | E2, [...A, A2]> => flatMap(self, (a) => map(that, (b) => [...a, b] as [...A, A2])))

/* @internal */
export const zipLeft = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, that) => flatMap(self, (a) => as(that, a)))

/* @internal */
export const zipRight = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A2>
>(2, (self, that) => flatMap(self, () => that))

/* @internal */
export const zipWith = dual<
  <R2, E2, A2, A, B>(
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B>,
  <R, E, R2, E2, A2, A, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B
  ) => Effect.Effect<R | R2, E | E2, B>
>(3, (self, that, f) => flatMap(self, (a) => map(that, (b) => f(a, b))))

/* @internal */
export const never: Effect.Effect<never, never, never> = asyncEither<never, never, never>(() => {
  const interval = setInterval(() => {
    //
  }, 2 ** 31 - 1)
  return Either.left(sync(() => clearInterval(interval)))
})

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

/* @internal */
export const interruptFiber = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> =>
  flatMap(fiberId, (fiberId) => pipe(self, interruptAsFiber(fiberId)))

/* @internal */
export const interruptAsFiber = dual<
  (fiberId: FiberId.FiberId) => <E, A>(self: Fiber.Fiber<E, A>) => Effect.Effect<never, never, Exit.Exit<E, A>>,
  <E, A>(self: Fiber.Fiber<E, A>, fiberId: FiberId.FiberId) => Effect.Effect<never, never, Exit.Exit<E, A>>
>(2, (self, fiberId) => flatMap(self.interruptAsFork(fiberId), () => self.await))

// -----------------------------------------------------------------------------
// LogLevel
// -----------------------------------------------------------------------------

/** @internal */
export const logLevelAll: LogLevel.LogLevel = {
  _tag: "All",
  syslog: 0,
  label: "ALL",
  ordinal: Number.MIN_SAFE_INTEGER,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelFatal: LogLevel.LogLevel = {
  _tag: "Fatal",
  syslog: 2,
  label: "FATAL",
  ordinal: 50000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelError: LogLevel.LogLevel = {
  _tag: "Error",
  syslog: 3,
  label: "ERROR",
  ordinal: 40000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelWarning: LogLevel.LogLevel = {
  _tag: "Warning",
  syslog: 4,
  label: "WARN",
  ordinal: 30000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelInfo: LogLevel.LogLevel = {
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelDebug: LogLevel.LogLevel = {
  _tag: "Debug",
  syslog: 7,
  label: "DEBUG",
  ordinal: 10000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelTrace: LogLevel.LogLevel = {
  _tag: "Trace",
  syslog: 7,
  label: "TRACE",
  ordinal: 0,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const logLevelNone: LogLevel.LogLevel = {
  _tag: "None",
  syslog: 7,
  label: "OFF",
  ordinal: Number.MAX_SAFE_INTEGER,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const allLogLevels: ReadonlyArray<LogLevel.LogLevel> = [
  logLevelAll,
  logLevelTrace,
  logLevelDebug,
  logLevelInfo,
  logLevelWarning,
  logLevelError,
  logLevelFatal,
  logLevelNone
]

// -----------------------------------------------------------------------------
// FiberRef
// -----------------------------------------------------------------------------

/** @internal */
const FiberRefSymbolKey = "effect/FiberRef"

/** @internal */
export const FiberRefTypeId: FiberRef.FiberRefTypeId = Symbol.for(
  FiberRefSymbolKey
) as FiberRef.FiberRefTypeId

const fiberRefVariance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/* @internal */
export const fiberRefGet = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> =>
  fiberRefModify(self, (a) => [a, a] as const)

/* @internal */
export const fiberRefGetAndSet = dual<
  <A>(value: A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<never, never, A>
>(2, (self, value) => fiberRefModify(self, (v) => [v, value] as const))

/* @internal */
export const fiberRefGetAndUpdate = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<never, never, A>
>(2, (self, f) => fiberRefModify(self, (v) => [v, f(v)] as const))

/* @internal */
export const fiberRefGetAndUpdateSome = dual<
  <A>(
    pf: (a: A) => Option.Option<A>
  ) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(
    self: FiberRef.FiberRef<A>,
    pf: (a: A) => Option.Option<A>
  ) => Effect.Effect<never, never, A>
>(2, (self, pf) => fiberRefModify(self, (v) => [v, Option.getOrElse(pf(v), () => v)] as const))

/* @internal */
export const fiberRefGetWith = dual<
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, B>) => (self: FiberRef.FiberRef<A>) => Effect.Effect<R, E, B>,
  <A, R, E, B>(self: FiberRef.FiberRef<A>, f: (a: A) => Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>
>(2, (self, f) => flatMap(fiberRefGet(self), f))

/* @internal */
export const fiberRefSet = dual<
  <A>(value: A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void>,
  <A>(self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<never, never, void>
>(2, (self, value) => fiberRefModify(self, () => [void 0, value] as const))

/* @internal */
export const fiberRefDelete = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> =>
  withFiberRuntime<never, never, void>((state) => {
    state.unsafeDeleteFiberRef(self)
    return unit
  })

/* @internal */
export const fiberRefReset = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> =>
  fiberRefSet(self, self.initial)

/* @internal */
export const fiberRefModify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, B>,
  <A, B>(self: FiberRef.FiberRef<A>, f: (a: A) => readonly [B, A]) => Effect.Effect<never, never, B>
>(2, <A, B>(
  self: FiberRef.FiberRef<A>,
  f: (a: A) => readonly [B, A]
): Effect.Effect<never, never, B> =>
  withFiberRuntime<never, never, B>((state) => {
    const [b, a] = f(state.getFiberRef(self) as A)
    state.setFiberRef(self, a)
    return succeed(b)
  }))

/* @internal */
export const fiberRefModifySome = <A, B>(
  self: FiberRef.FiberRef<A>,
  def: B,
  f: (a: A) => Option.Option<readonly [B, A]>
): Effect.Effect<never, never, B> => fiberRefModify(self, (v) => Option.getOrElse(f(v), () => [def, v] as const))

/* @internal */
export const fiberRefUpdate = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<never, never, void>
>(2, (self, f) => fiberRefModify(self, (v) => [void 0, f(v)] as const))

/* @internal */
export const fiberRefUpdateSome = dual<
  <A>(pf: (a: A) => Option.Option<A>) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void>,
  <A>(self: FiberRef.FiberRef<A>, pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, void>
>(2, (self, pf) => fiberRefModify(self, (v) => [void 0, Option.getOrElse(pf(v), () => v)] as const))

/* @internal */
export const fiberRefUpdateAndGet = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<never, never, A>
>(2, (self, f) =>
  fiberRefModify(self, (v) => {
    const result = f(v)
    return [result, result] as const
  }))

/* @internal */
export const fiberRefUpdateSomeAndGet = dual<
  <A>(pf: (a: A) => Option.Option<A>) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, A>
>(2, (self, pf) =>
  fiberRefModify(self, (v) => {
    const result = Option.getOrElse(pf(v), () => v)
    return [result, result] as const
  }))

// circular
/** @internal */
const RequestResolverSymbolKey = "effect/RequestResolver"

/** @internal */
export const RequestResolverTypeId: RequestResolver.RequestResolverTypeId = Symbol.for(
  RequestResolverSymbolKey
) as RequestResolver.RequestResolverTypeId

const requestResolverVariance = {
  /* c8 ignore next */
  _A: (_: unknown) => _,
  /* c8 ignore next */
  _R: (_: never) => _
}

/** @internal */
export class RequestResolverImpl<out R, in A> implements RequestResolver.RequestResolver<A, R> {
  readonly [RequestResolverTypeId] = requestResolverVariance
  constructor(
    readonly runAll: (
      requests: Array<Array<Request.Entry<A>>>
    ) => Effect.Effect<R, never, void>,
    readonly target?: unknown
  ) {
    this.runAll = runAll as any
  }
  [Hash.symbol](): number {
    return this.target ? Hash.hash(this.target) : Hash.random(this)
  }
  [Equal.symbol](that: unknown): boolean {
    return this.target ?
      isRequestResolver(that) && Equal.equals(this.target, (that as RequestResolverImpl<any, any>).target) :
      this === that
  }
  identified(...ids: Array<unknown>): RequestResolver.RequestResolver<A, R> {
    return new RequestResolverImpl(this.runAll, Chunk.fromIterable(ids))
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isRequestResolver = (u: unknown): u is RequestResolver.RequestResolver<unknown, unknown> =>
  hasProperty(u, RequestResolverTypeId)

// end

/** @internal */
export const resolverLocally = dual<
  <A>(
    self: FiberRef.FiberRef<A>,
    value: A
  ) => <R, B extends Request.Request<any, any>>(
    use: RequestResolver.RequestResolver<B, R>
  ) => RequestResolver.RequestResolver<B, R>,
  <R, B extends Request.Request<any, any>, A>(
    use: RequestResolver.RequestResolver<B, R>,
    self: FiberRef.FiberRef<A>,
    value: A
  ) => RequestResolver.RequestResolver<B, R>
>(3, <R, B extends Request.Request<any, any>, A>(
  use: RequestResolver.RequestResolver<B, R>,
  self: FiberRef.FiberRef<A>,
  value: A
): RequestResolver.RequestResolver<B, R> =>
  new RequestResolverImpl<R, B>(
    (requests) =>
      fiberRefLocally(
        use.runAll(requests),
        self,
        value
      ),
    Chunk.make("Locally", use, self, value)
  ))

/** @internal */
export const requestBlockLocally = <A>(
  self: BlockedRequests.RequestBlock,
  ref: FiberRef.FiberRef<A>,
  value: A
): BlockedRequests.RequestBlock => _blockedRequests.reduce(self, LocallyReducer(ref, value))

const LocallyReducer = <A>(
  ref: FiberRef.FiberRef<A>,
  value: A
): BlockedRequests.RequestBlock.Reducer<BlockedRequests.RequestBlock> => ({
  emptyCase: () => _blockedRequests.empty,
  parCase: (left, right) => _blockedRequests.par(left, right),
  seqCase: (left, right) => _blockedRequests.seq(left, right),
  singleCase: (dataSource, blockedRequest) =>
    _blockedRequests.single(
      resolverLocally(dataSource, ref, value),
      blockedRequest as any
    )
})

/* @internal */
export const fiberRefLocally: {
  <A>(self: FiberRef.FiberRef<A>, value: A): <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>
  <R, E, B, A>(use: Effect.Effect<R, E, B>, self: FiberRef.FiberRef<A>, value: A): Effect.Effect<R, E, B>
} = dual<
  <A>(self: FiberRef.FiberRef<A>, value: A) => <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B, A>(use: Effect.Effect<R, E, B>, self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<R, E, B>
>(3, (use, self, value) =>
  acquireUseRelease(
    zipLeft(fiberRefGet(self), fiberRefSet(self, value)),
    () => use,
    (oldValue) => fiberRefSet(self, oldValue)
  ))

/* @internal */
export const fiberRefLocallyWith = dual<
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B, A>(use: Effect.Effect<R, E, B>, self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<R, E, B>
>(3, (use, self, f) => fiberRefGetWith(self, (a) => fiberRefLocally(use, self, f(a))))

/** @internal */
export const fiberRefUnsafeMake = <Value>(
  initial: Value,
  options?: {
    readonly fork?: ((a: Value) => Value) | undefined
    readonly join?: ((left: Value, right: Value) => Value) | undefined
  }
): FiberRef.FiberRef<Value> =>
  fiberRefUnsafeMakePatch(initial, {
    differ: internalDiffer.update(),
    fork: options?.fork ?? identity,
    join: options?.join
  })

/** @internal */
export const fiberRefUnsafeMakeHashSet = <A>(
  initial: HashSet.HashSet<A>
): FiberRef.FiberRef<HashSet.HashSet<A>> => {
  const differ = internalDiffer.hashSet<A>()
  return fiberRefUnsafeMakePatch(initial, {
    differ,
    fork: differ.empty
  })
}

/** @internal */
export const fiberRefUnsafeMakeReadonlyArray = <A>(
  initial: ReadonlyArray<A>
): FiberRef.FiberRef<ReadonlyArray<A>> => {
  const differ = internalDiffer.readonlyArray(internalDiffer.update<A>())
  return fiberRefUnsafeMakePatch(initial, {
    differ,
    fork: differ.empty
  })
}

/** @internal */
export const fiberRefUnsafeMakeContext = <A>(
  initial: Context.Context<A>
): FiberRef.FiberRef<Context.Context<A>> => {
  const differ = internalDiffer.environment<A>()
  return fiberRefUnsafeMakePatch(initial, {
    differ,
    fork: differ.empty
  })
}

/** @internal */
export const fiberRefUnsafeMakePatch = <Value, Patch>(
  initial: Value,
  options: {
    readonly differ: Differ.Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: ((oldV: Value, newV: Value) => Value) | undefined
  }
): FiberRef.FiberRef<Value> => ({
  [FiberRefTypeId]: fiberRefVariance,
  initial,
  diff: (oldValue, newValue) => options.differ.diff(oldValue, newValue),
  combine: (first, second) => options.differ.combine(first as Patch, second as Patch),
  patch: (patch) => (oldValue) => options.differ.patch(patch as Patch, oldValue),
  fork: options.fork,
  join: options.join ?? ((_, n) => n),
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/** @internal */
export const fiberRefUnsafeMakeRuntimeFlags = (
  initial: RuntimeFlags.RuntimeFlags
): FiberRef.FiberRef<RuntimeFlags.RuntimeFlags> =>
  fiberRefUnsafeMakePatch(initial, {
    differ: _runtimeFlags.differ,
    fork: _runtimeFlags.differ.empty
  })

/** @internal */
export const currentContext: FiberRef.FiberRef<Context.Context<never>> = globalValue(
  Symbol.for("effect/FiberRef/currentContext"),
  () => fiberRefUnsafeMakeContext(Context.empty())
)

/** @internal */
export const currentSchedulingPriority: FiberRef.FiberRef<number> = globalValue(
  Symbol.for("effect/FiberRef/currentSchedulingPriority"),
  () => fiberRefUnsafeMake(0)
)

/** @internal */
export const currentMaxOpsBeforeYield: FiberRef.FiberRef<number> = globalValue(
  Symbol.for("effect/FiberRef/currentMaxOpsBeforeYield"),
  () => fiberRefUnsafeMake(2048)
)

/** @internal */
export const currentLogAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, unknown>> = globalValue(
  Symbol.for("effect/FiberRef/currentLogAnnotation"),
  () => fiberRefUnsafeMake(HashMap.empty())
)

/** @internal */
export const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = globalValue(
  Symbol.for("effect/FiberRef/currentLogLevel"),
  () => fiberRefUnsafeMake<LogLevel.LogLevel>(logLevelInfo)
)

/** @internal */
export const currentLogSpan: FiberRef.FiberRef<List.List<LogSpan.LogSpan>> = globalValue(
  Symbol.for("effect/FiberRef/currentLogSpan"),
  () => fiberRefUnsafeMake(List.empty<LogSpan.LogSpan>())
)

/** @internal */
export const withSchedulingPriority = dual<
  (priority: number) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, priority: number) => Effect.Effect<R, E, B>
>(2, (self, scheduler) => fiberRefLocally(self, currentSchedulingPriority, scheduler))

/** @internal */
export const withMaxOpsBeforeYield = dual<
  (priority: number) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, priority: number) => Effect.Effect<R, E, B>
>(2, (self, scheduler) => fiberRefLocally(self, currentMaxOpsBeforeYield, scheduler))

/** @internal */
export const currentConcurrency: FiberRef.FiberRef<"unbounded" | number> = globalValue(
  Symbol.for("effect/FiberRef/currentConcurrency"),
  () => fiberRefUnsafeMake<"unbounded" | number>("unbounded")
)

/**
 * @internal
 */
export const currentRequestBatching = globalValue(
  Symbol.for("effect/FiberRef/currentRequestBatching"),
  () => fiberRefUnsafeMake(true)
)

/** @internal */
export const currentUnhandledErrorLogLevel: FiberRef.FiberRef<Option.Option<LogLevel.LogLevel>> = globalValue(
  Symbol.for("effect/FiberRef/currentUnhandledErrorLogLevel"),
  () => fiberRefUnsafeMake(Option.some<LogLevel.LogLevel>(logLevelDebug))
)

/** @internal */
export const withUnhandledErrorLogLevel = dual<
  (level: Option.Option<LogLevel.LogLevel>) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, level: Option.Option<LogLevel.LogLevel>) => Effect.Effect<R, E, B>
>(2, (self, level) => fiberRefLocally(self, currentUnhandledErrorLogLevel, level))

/** @internal */
export const currentMetricLabels: FiberRef.FiberRef<ReadonlyArray<MetricLabel.MetricLabel>> = globalValue(
  Symbol.for("effect/FiberRef/currentMetricLabels"),
  () => fiberRefUnsafeMakeReadonlyArray(ReadonlyArray.empty())
)

/* @internal */
export const metricLabels: Effect.Effect<never, never, ReadonlyArray<MetricLabel.MetricLabel>> = fiberRefGet(
  currentMetricLabels
)

/** @internal */
export const currentForkScopeOverride: FiberRef.FiberRef<Option.Option<fiberScope.FiberScope>> = globalValue(
  Symbol.for("effect/FiberRef/currentForkScopeOverride"),
  () =>
    fiberRefUnsafeMake(Option.none(), {
      fork: () => Option.none() as Option.Option<fiberScope.FiberScope>,
      join: (parent, _) => parent
    })
)

/** @internal */
export const currentInterruptedCause: FiberRef.FiberRef<Cause.Cause<never>> = globalValue(
  Symbol.for("effect/FiberRef/currentInterruptedCause"),
  () =>
    fiberRefUnsafeMake(internalCause.empty, {
      fork: () => internalCause.empty,
      join: (parent, _) => parent
    })
)

/** @internal */
export const currentTracerTimingEnabled: FiberRef.FiberRef<boolean> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerTiming"),
  () => fiberRefUnsafeMake(true)
)

/** @internal */
export const currentTracerSpanAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, unknown>> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerSpanAnnotations"),
  () => fiberRefUnsafeMake(HashMap.empty())
)

/** @internal */
export const currentTracerSpanLinks: FiberRef.FiberRef<Chunk.Chunk<Tracer.SpanLink>> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerSpanLinks"),
  () => fiberRefUnsafeMake(Chunk.empty())
)

// -----------------------------------------------------------------------------
// Scope
// -----------------------------------------------------------------------------

/** @internal */
export const ScopeTypeId: Scope.ScopeTypeId = Symbol.for("effect/Scope") as Scope.ScopeTypeId

/** @internal */
export const CloseableScopeTypeId: Scope.CloseableScopeTypeId = Symbol.for(
  "effect/CloseableScope"
) as Scope.CloseableScopeTypeId

/* @internal */
export const scopeAddFinalizer = (
  self: Scope.Scope,
  finalizer: Effect.Effect<never, never, unknown>
): Effect.Effect<never, never, void> => self.addFinalizer(() => asUnit(finalizer))

/* @internal */
export const scopeAddFinalizerExit = (
  self: Scope.Scope,
  finalizer: Scope.Scope.Finalizer
): Effect.Effect<never, never, void> => self.addFinalizer(finalizer)

/* @internal */
export const scopeClose = (
  self: Scope.Scope.Closeable,
  exit: Exit.Exit<unknown, unknown>
): Effect.Effect<never, never, void> => self.close(exit)

/* @internal */
export const scopeFork = (
  self: Scope.Scope,
  strategy: ExecutionStrategy.ExecutionStrategy
): Effect.Effect<never, never, Scope.Scope.Closeable> => self.fork(strategy)

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

/** @internal */
export type ReleaseMapState = {
  _tag: "Exited"
  nextKey: number
  exit: Exit.Exit<unknown, unknown>
  update: (finalizer: Scope.Scope.Finalizer) => Scope.Scope.Finalizer
} | {
  _tag: "Running"
  nextKey: number
  finalizers: Map<number, Scope.Scope.Finalizer>
  update: (finalizer: Scope.Scope.Finalizer) => Scope.Scope.Finalizer
}

/** @internal */
export interface ReleaseMap {
  state: ReleaseMapState // mutable by design
}

/* @internal */
export const releaseMapAdd = dual<
  (finalizer: Scope.Scope.Finalizer) => (self: ReleaseMap) => Effect.Effect<never, never, Scope.Scope.Finalizer>,
  (self: ReleaseMap, finalizer: Scope.Scope.Finalizer) => Effect.Effect<never, never, Scope.Scope.Finalizer>
>(2, (self, finalizer) =>
  map(
    releaseMapAddIfOpen(self, finalizer),
    Option.match({
      onNone: (): Scope.Scope.Finalizer => () => unit,
      onSome: (key): Scope.Scope.Finalizer => (exit) => releaseMapRelease(key, exit)(self)
    })
  ))

/* @internal */
export const releaseMapRelease = dual<
  (key: number, exit: Exit.Exit<unknown, unknown>) => (self: ReleaseMap) => Effect.Effect<never, never, void>,
  (self: ReleaseMap, key: number, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>
>(3, (self, key, exit) =>
  suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        return unit
      }
      case "Running": {
        const finalizer = self.state.finalizers.get(key)
        self.state.finalizers.delete(key)
        if (finalizer != null) {
          return self.state.update(finalizer)(exit)
        }
        return unit
      }
    }
  }))

/* @internal */
export const releaseMapAddIfOpen = dual<
  (finalizer: Scope.Scope.Finalizer) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<number>>,
  (self: ReleaseMap, finalizer: Scope.Scope.Finalizer) => Effect.Effect<never, never, Option.Option<number>>
>(2, (self, finalizer) =>
  suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        self.state.nextKey += 1
        return as(finalizer(self.state.exit), Option.none())
      }
      case "Running": {
        const key = self.state.nextKey
        self.state.finalizers.set(key, finalizer)
        self.state.nextKey += 1
        return succeed(Option.some(key))
      }
    }
  }))

/* @internal */
export const releaseMapGet = dual<
  (key: number) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>,
  (self: ReleaseMap, key: number) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>
>(
  2,
  (self, key) =>
    sync((): Option.Option<Scope.Scope.Finalizer> =>
      self.state._tag === "Running" ? Option.fromNullable(self.state.finalizers.get(key)) : Option.none()
    )
)

/* @internal */
export const releaseMapReplace = dual<
  (
    key: number,
    finalizer: Scope.Scope.Finalizer
  ) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>,
  (
    self: ReleaseMap,
    key: number,
    finalizer: Scope.Scope.Finalizer
  ) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>
>(3, (self, key, finalizer) =>
  suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        return as(finalizer(self.state.exit), Option.none())
      }
      case "Running": {
        const fin = Option.fromNullable(self.state.finalizers.get(key))
        self.state.finalizers.set(key, finalizer)
        return succeed(fin)
      }
    }
  }))

/* @internal */
export const releaseMapRemove = dual<
  (key: number) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>,
  (self: ReleaseMap, key: number) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>
>(2, (self, key) =>
  sync(() => {
    if (self.state._tag === "Exited") {
      return Option.none()
    }
    const fin = Option.fromNullable(self.state.finalizers.get(key))
    self.state.finalizers.delete(key)
    return fin
  }))

/* @internal */
export const releaseMapMake: Effect.Effect<never, never, ReleaseMap> = sync((): ReleaseMap => ({
  state: {
    _tag: "Running",
    nextKey: 0,
    finalizers: new Map(),
    update: identity
  }
}))

// -----------------------------------------------------------------------------
// Cause
// -----------------------------------------------------------------------------

/** @internal */
export const causeSquash = <E>(self: Cause.Cause<E>): unknown => {
  return causeSquashWith(identity)(self)
}

/** @internal */
export const causeSquashWith = dual<
  <E>(f: (error: E) => unknown) => (self: Cause.Cause<E>) => unknown,
  <E>(self: Cause.Cause<E>, f: (error: E) => unknown) => unknown
>(2, (self, f) => {
  const option = pipe(self, internalCause.failureOption, Option.map(f))
  switch (option._tag) {
    case "None": {
      return pipe(
        internalCause.defects(self),
        Chunk.head,
        Option.match({
          onNone: () => {
            const interrupts = Array.from(internalCause.interruptors(self)).flatMap((fiberId) =>
              Array.from(FiberId.ids(fiberId)).map((id) => `#${id}`)
            )
            return new InterruptedException(interrupts ? `Interrupted by fibers: ${interrupts.join(", ")}` : void 0)
          },
          onSome: identity
        })
      )
    }
    case "Some": {
      return option.value
    }
  }
})

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

/** @internal */
export const YieldableError: new(message?: string) => Cause.YieldableError = (function() {
  class YieldableError extends globalThis.Error {
    commit() {
      return fail(this)
    }
    toString() {
      return this.message ? `${this.name}: ${this.message}` : this.name
    }
    toJSON() {
      return { ...this }
    }
    [NodeInspectSymbol](): string {
      const stack = this.stack
      if (stack) {
        return `${this.toString()}\n${stack.split("\n").slice(1).join("\n")}`
      }
      return this.toString()
    }
  }
  Object.assign(YieldableError.prototype, StructuralCommitPrototype)
  return YieldableError as any
})()

const makeException = <T extends { _tag: string; message?: string }>(
  proto: Omit<T, keyof Cause.YieldableError | "_tag">,
  tag: T["_tag"]
): new(message?: string | undefined) => T => {
  class Base extends YieldableError {
    readonly _tag = tag
  }
  Object.assign(Base.prototype, proto)
  ;(Base.prototype as any).name = tag
  return Base as any
}

/** @internal */
export const RuntimeExceptionTypeId: Cause.RuntimeExceptionTypeId = Symbol.for(
  "effect/Cause/errors/RuntimeException"
) as Cause.RuntimeExceptionTypeId

/** @internal */
export const RuntimeException = makeException<Cause.RuntimeException>({
  [RuntimeExceptionTypeId]: RuntimeExceptionTypeId
}, "RuntimeException")

/** @internal */
export const isRuntimeException = (u: unknown): u is Cause.RuntimeException => hasProperty(u, RuntimeExceptionTypeId)

/** @internal */
export const InterruptedExceptionTypeId: Cause.InterruptedExceptionTypeId = Symbol.for(
  "effect/Cause/errors/InterruptedException"
) as Cause.InterruptedExceptionTypeId

/** @internal */
export const InterruptedException = makeException<Cause.InterruptedException>({
  [InterruptedExceptionTypeId]: InterruptedExceptionTypeId
}, "InterruptedException")

/** @internal */
export const isInterruptedException = (u: unknown): u is Cause.InterruptedException =>
  hasProperty(u, InterruptedExceptionTypeId)

/** @internal */
export const IllegalArgumentExceptionTypeId: Cause.IllegalArgumentExceptionTypeId = Symbol.for(
  "effect/Cause/errors/IllegalArgument"
) as Cause.IllegalArgumentExceptionTypeId

/** @internal */
export const IllegalArgumentException = makeException<Cause.IllegalArgumentException>({
  [IllegalArgumentExceptionTypeId]: IllegalArgumentExceptionTypeId
}, "IllegalArgumentException")

/** @internal */
export const isIllegalArgumentException = (u: unknown): u is Cause.IllegalArgumentException =>
  hasProperty(u, IllegalArgumentExceptionTypeId)

/** @internal */
export const NoSuchElementExceptionTypeId: Cause.NoSuchElementExceptionTypeId = Symbol.for(
  "effect/Cause/errors/NoSuchElement"
) as Cause.NoSuchElementExceptionTypeId

/** @internal */
export const NoSuchElementException = makeException<Cause.NoSuchElementException>({
  [NoSuchElementExceptionTypeId]: NoSuchElementExceptionTypeId
}, "NoSuchElementException")

/** @internal */
export const isNoSuchElementException = (u: unknown): u is Cause.NoSuchElementException =>
  hasProperty(u, NoSuchElementExceptionTypeId)

/** @internal */
export const InvalidPubSubCapacityExceptionTypeId: Cause.InvalidPubSubCapacityExceptionTypeId = Symbol.for(
  "effect/Cause/errors/InvalidPubSubCapacityException"
) as Cause.InvalidPubSubCapacityExceptionTypeId

/** @internal */
export const InvalidPubSubCapacityException = makeException<Cause.InvalidPubSubCapacityException>({
  [InvalidPubSubCapacityExceptionTypeId]: InvalidPubSubCapacityExceptionTypeId
}, "InvalidPubSubCapacityException")

/** @internal */
export const isInvalidCapacityError = (u: unknown): u is Cause.InvalidPubSubCapacityException =>
  hasProperty(u, InvalidPubSubCapacityExceptionTypeId)

/** @internal */
export const UnknownExceptionTypeId: Cause.UnknownExceptionTypeId = Symbol.for(
  "effect/Cause/errors/UnknownException"
) as Cause.UnknownExceptionTypeId

/** @internal */
export const UnknownException: new(error: unknown, message?: string | undefined) => Cause.UnknownException =
  (function() {
    class UnknownException extends YieldableError {
      readonly _tag = "UnknownException"
      constructor(readonly error: unknown, message?: string) {
        super(message ?? (hasProperty(error, "message") && isString(error.message) ? error.message : void 0))
      }
    }
    Object.assign(UnknownException.prototype, {
      [UnknownExceptionTypeId]: UnknownExceptionTypeId,
      name: "UnknownException"
    })
    return UnknownException as any
  })()

/** @internal */
export const isUnknownException = (u: unknown): u is Cause.UnknownException => hasProperty(u, UnknownExceptionTypeId)

// -----------------------------------------------------------------------------
// Exit
// -----------------------------------------------------------------------------

/** @internal */
export const exitIsExit = (u: unknown): u is Exit.Exit<unknown, unknown> =>
  isEffect(u) && "_tag" in u && (u._tag === "Success" || u._tag === "Failure")

/** @internal */
export const exitIsFailure = <E, A>(self: Exit.Exit<E, A>): self is Exit.Failure<E, A> => self._tag === "Failure"

/** @internal */
export const exitIsSuccess = <E, A>(self: Exit.Exit<E, A>): self is Exit.Success<E, A> => self._tag === "Success"

/** @internal */
export const exitIsInterrupted = <E, A>(self: Exit.Exit<E, A>): boolean => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return internalCause.isInterrupted(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return false
    }
  }
}

/** @internal */
export const exitAs = dual<
  <A2>(value: A2) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E, A2>,
  <E, A, A2>(self: Exit.Exit<E, A>, value: A2) => Exit.Exit<E, A2>
>(2, <E, A, A2>(self: Exit.Exit<E, A>, value: A2) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(value) as Exit.Exit<E, A2>
    }
  }
})

/** @internal */
export const exitAsUnit = <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, void> =>
  exitAs(self, void 0) as Exit.Exit<E, void>

/** @internal */
export const exitCauseOption = <E, A>(self: Exit.Exit<E, A>): Option.Option<Cause.Cause<E>> => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return Option.some(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return Option.none()
    }
  }
}

/** @internal */
export const exitCollectAll = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  options?: {
    readonly parallel?: boolean | undefined
  }
): Option.Option<Exit.Exit<E, Array<A>>> =>
  exitCollectAllInternal(exits, options?.parallel ? internalCause.parallel : internalCause.sequential)

/** @internal */
export const exitDie = (defect: unknown): Exit.Exit<never, never> =>
  exitFailCause(internalCause.die(defect)) as Exit.Exit<never, never>

/** @internal */
export const exitExists: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(self: Exit.Exit<E, A>) => self is Exit.Exit<never, B>
  <A>(predicate: Predicate<A>): <E>(self: Exit.Exit<E, A>) => boolean
  <E, A, B extends A>(self: Exit.Exit<E, A>, refinement: Refinement<A, B>): self is Exit.Exit<never, B>
  <E, A>(self: Exit.Exit<E, A>, predicate: Predicate<A>): boolean
} = dual(2, <E, A, B extends A>(self: Exit.Exit<E, A>, refinement: Refinement<A, B>): self is Exit.Exit<never, B> => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return false
    }
    case OpCodes.OP_SUCCESS: {
      return refinement(self.i0)
    }
  }
})

/** @internal */
export const exitFail = <E>(error: E): Exit.Exit<E, never> =>
  exitFailCause(internalCause.fail(error)) as Exit.Exit<E, never>

/** @internal */
export const exitFailCause = <E>(cause: Cause.Cause<E>): Exit.Exit<E, never> => {
  const effect = new EffectPrimitiveFailure(OpCodes.OP_FAILURE) as any
  effect.i0 = cause
  return effect
}

/** @internal */
export const exitFlatMap = dual<
  <A, E2, A2>(f: (a: A) => Exit.Exit<E2, A2>) => <E>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A2>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, f: (a: A) => Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A2>
>(2, <E, A, E2, A2>(self: Exit.Exit<E, A>, f: (a: A) => Exit.Exit<E2, A2>) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(self.i0) as Exit.Exit<E | E2, A2>
    }
    case OpCodes.OP_SUCCESS: {
      return f(self.i0) as Exit.Exit<E | E2, A2>
    }
  }
})

/** @internal */
export const exitFlatMapEffect = dual<
  <E, A, R, E2, A2>(
    f: (a: A) => Effect.Effect<R, E2, Exit.Exit<E, A2>>
  ) => (self: Exit.Exit<E, A>) => Effect.Effect<R, E2, Exit.Exit<E, A2>>,
  <E, A, R, E2, A2>(
    self: Exit.Exit<E, A>,
    f: (a: A) => Effect.Effect<R, E2, Exit.Exit<E, A2>>
  ) => Effect.Effect<R, E2, Exit.Exit<E, A2>>
>(2, (self, f) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return succeed(exitFailCause(self.i0))
    }
    case OpCodes.OP_SUCCESS: {
      return f(self.i0)
    }
  }
})

/** @internal */
export const exitFlatten = <E, E1, A>(
  self: Exit.Exit<E, Exit.Exit<E1, A>>
): Exit.Exit<E | E1, A> => pipe(self, exitFlatMap(identity)) as Exit.Exit<E | E1, A>

/** @internal */
export const exitForEachEffect = dual<
  <A, R, E2, B>(
    f: (a: A) => Effect.Effect<R, E2, B>
  ) => <E>(self: Exit.Exit<E, A>) => Effect.Effect<R, never, Exit.Exit<E | E2, B>>,
  <E, A, R, E2, B>(
    self: Exit.Exit<E, A>,
    f: (a: A) => Effect.Effect<R, E2, B>
  ) => Effect.Effect<R, never, Exit.Exit<E | E2, B>>
>(2, (self, f) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return succeed(exitFailCause(self.i0))
    }
    case OpCodes.OP_SUCCESS: {
      return exit(f(self.i0))
    }
  }
})

/** @internal */
export const exitFromEither = <E, A>(either: Either.Either<E, A>): Exit.Exit<E, A> => {
  switch (either._tag) {
    case "Left": {
      return exitFail(either.left) as Exit.Exit<E, A>
    }
    case "Right": {
      return exitSucceed(either.right) as Exit.Exit<E, A>
    }
  }
}

/** @internal */
export const exitFromOption = <A>(option: Option.Option<A>): Exit.Exit<void, A> => {
  switch (option._tag) {
    case "None": {
      return exitFail(void 0) as Exit.Exit<void, A>
    }
    case "Some": {
      return exitSucceed(option.value) as Exit.Exit<void, A>
    }
  }
}

/** @internal */
export const exitGetOrElse = dual<
  <E, A2>(orElse: (cause: Cause.Cause<E>) => A2) => <A1>(self: Exit.Exit<E, A1>) => A1 | A2,
  <E, A1, A2>(self: Exit.Exit<E, A1>, orElse: (cause: Cause.Cause<E>) => A2) => A1 | A2
>(2, (self, orElse) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return orElse(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return self.i0
    }
  }
})

/** @internal */
export const exitInterrupt = (fiberId: FiberId.FiberId): Exit.Exit<never, never> =>
  exitFailCause(internalCause.interrupt(fiberId)) as Exit.Exit<never, never>

/** @internal */
export const exitMap = dual<
  <A, B>(f: (a: A) => B) => <E>(self: Exit.Exit<E, A>) => Exit.Exit<E, B>,
  <E, A, B>(self: Exit.Exit<E, A>, f: (a: A) => B) => Exit.Exit<E, B>
>(2, <E, A, B>(self: Exit.Exit<E, A>, f: (a: A) => B) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(self.i0) as Exit.Exit<E, B>
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(f(self.i0)) as Exit.Exit<E, B>
    }
  }
})

/** @internal */
export const exitMapBoth = dual<
  <E, A, E2, A2>(
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ) => (self: Exit.Exit<E, A>) => Exit.Exit<E2, A2>,
  <E, A, E2, A2>(
    self: Exit.Exit<E, A>,
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ) => Exit.Exit<E2, A2>
>(2, (self, { onFailure, onSuccess }) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(pipe(self.i0, internalCause.map(onFailure)))
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(onSuccess(self.i0))
    }
  }
})

/** @internal */
export const exitMapError = dual<
  <E, E2>(f: (e: E) => E2) => <A>(self: Exit.Exit<E, A>) => Exit.Exit<E2, A>,
  <E, A, E2>(self: Exit.Exit<E, A>, f: (e: E) => E2) => Exit.Exit<E2, A>
>(2, <E, A, E2>(self: Exit.Exit<E, A>, f: (e: E) => E2) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(pipe(self.i0, internalCause.map(f))) as Exit.Exit<E2, A>
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(self.i0) as Exit.Exit<E2, A>
    }
  }
})

/** @internal */
export const exitMapErrorCause = dual<
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => <A>(self: Exit.Exit<E, A>) => Exit.Exit<E2, A>,
  <E, A, E2>(self: Exit.Exit<E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => Exit.Exit<E2, A>
>(2, <E, A, E2>(self: Exit.Exit<E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(f(self.i0)) as Exit.Exit<E2, A>
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(self.i0) as Exit.Exit<E2, A>
    }
  }
})

/** @internal */
export const exitMatch = dual<
  <E, A, Z1, Z2>(options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Z1
    readonly onSuccess: (a: A) => Z2
  }) => (self: Exit.Exit<E, A>) => Z1 | Z2,
  <E, A, Z1, Z2>(self: Exit.Exit<E, A>, options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Z1
    readonly onSuccess: (a: A) => Z2
  }) => Z1 | Z2
>(2, (self, { onFailure, onSuccess }) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return onFailure(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return onSuccess(self.i0)
    }
  }
})

/** @internal */
export const exitMatchEffect = dual<
  <E, A, R, E2, A2, R2, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ) => (self: Exit.Exit<E, A>) => Effect.Effect<R | R2, E2 | E3, A2 | A3>,
  <E, A, R, E2, A2, R2, E3, A3>(
    self: Exit.Exit<E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ) => Effect.Effect<R | R2, E2 | E3, A2 | A3>
>(2, (self, { onFailure, onSuccess }) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return onFailure(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return onSuccess(self.i0)
    }
  }
})

/** @internal */
export const exitSucceed = <A>(value: A): Exit.Exit<never, A> => {
  const effect = new EffectPrimitiveSuccess(OpCodes.OP_SUCCESS) as any
  effect.i0 = value
  return effect
}

/** @internal */
export const exitUnit: Exit.Exit<never, void> = exitSucceed(void 0)

/** @internal */
export const exitZip = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, [A, A2]>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, [A, A2]>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, a2) => [a, a2],
    onFailure: internalCause.sequential
  }))

/** @internal */
export const exitZipLeft = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, _) => a,
    onFailure: internalCause.sequential
  }))

/** @internal */
export const exitZipRight = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A2>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A2>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (_, a2) => a2,
    onFailure: internalCause.sequential
  }))

/** @internal */
export const exitZipPar = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, [A, A2]>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, [A, A2]>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, a2) => [a, a2],
    onFailure: internalCause.parallel
  }))

/** @internal */
export const exitZipParLeft = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, _) => a,
    onFailure: internalCause.parallel
  }))

/** @internal */
export const exitZipParRight = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A2>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A2>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (_, a2) => a2,
    onFailure: internalCause.parallel
  }))

/** @internal */
export const exitZipWith = dual<
  <E, E2, A, B, C>(
    that: Exit.Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ) => (self: Exit.Exit<E, A>) => Exit.Exit<E | E2, C>,
  <E, E2, A, B, C>(
    self: Exit.Exit<E, A>,
    that: Exit.Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ) => Exit.Exit<E | E2, C>
>(3, (
  self,
  that,
  { onFailure, onSuccess }
) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      switch (that._tag) {
        case OpCodes.OP_SUCCESS: {
          return exitFailCause(self.i0)
        }
        case OpCodes.OP_FAILURE: {
          return exitFailCause(onFailure(self.i0, that.i0))
        }
      }
    }
    case OpCodes.OP_SUCCESS: {
      switch (that._tag) {
        case OpCodes.OP_SUCCESS: {
          return exitSucceed(onSuccess(self.i0, that.i0))
        }
        case OpCodes.OP_FAILURE: {
          return exitFailCause(that.i0)
        }
      }
    }
  }
})

const exitCollectAllInternal = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  combineCauses: (causeA: Cause.Cause<E>, causeB: Cause.Cause<E>) => Cause.Cause<E>
): Option.Option<Exit.Exit<E, Array<A>>> => {
  const list = Chunk.fromIterable(exits)
  if (!Chunk.isNonEmpty(list)) {
    return Option.none()
  }
  return pipe(
    Chunk.tailNonEmpty(list),
    ReadonlyArray.reduce(
      pipe(Chunk.headNonEmpty(list), exitMap<A, Chunk.Chunk<A>>(Chunk.of)),
      (accumulator, current) =>
        pipe(
          accumulator,
          exitZipWith(current, {
            onSuccess: (list, value) => pipe(list, Chunk.prepend(value)),
            onFailure: combineCauses
          })
        )
    ),
    exitMap(Chunk.reverse),
    exitMap((chunk) => Array.from(chunk)),
    Option.some
  )
}

// -----------------------------------------------------------------------------
// Deferred
// -----------------------------------------------------------------------------

/** @internal */
export const deferredUnsafeMake = <E, A>(fiberId: FiberId.FiberId): Deferred.Deferred<E, A> => ({
  [deferred.DeferredTypeId]: deferred.deferredVariance,
  state: MutableRef.make(deferred.pending([])),
  blockingOn: fiberId,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/* @internal */
export const deferredMake = <E, A>(): Effect.Effect<never, never, Deferred.Deferred<E, A>> =>
  flatMap(fiberId, (id) => deferredMakeAs<E, A>(id))

/* @internal */
export const deferredMakeAs = <E, A>(fiberId: FiberId.FiberId): Effect.Effect<never, never, Deferred.Deferred<E, A>> =>
  sync(() => deferredUnsafeMake<E, A>(fiberId))

/* @internal */
export const deferredAwait = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, E, A> =>
  asyncEither<never, E, A>((k) => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return Either.right(state.effect)
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        pipe(
          self.state,
          MutableRef.set(deferred.pending([k, ...state.joiners]))
        )
        return Either.left(deferredInterruptJoiner(self, k))
      }
    }
  }, self.blockingOn)

/* @internal */
export const deferredComplete = dual<
  <E, A>(effect: Effect.Effect<never, E, A>) => (self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, effect: Effect.Effect<never, E, A>) => Effect.Effect<never, never, boolean>
>(2, (self, effect) => intoDeferred(effect, self))

/* @internal */
export const deferredCompleteWith = dual<
  <E, A>(effect: Effect.Effect<never, E, A>) => (self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, effect: Effect.Effect<never, E, A>) => Effect.Effect<never, never, boolean>
>(2, (self, effect) =>
  sync(() => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return false
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        pipe(self.state, MutableRef.set(deferred.done(effect)))
        for (let i = 0; i < state.joiners.length; i++) {
          state.joiners[i](effect)
        }
        return true
      }
    }
  }))

/* @internal */
export const deferredDone = dual<
  <E, A>(exit: Exit.Exit<E, A>) => (self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, exit: Exit.Exit<E, A>) => Effect.Effect<never, never, boolean>
>(2, (self, exit) => deferredCompleteWith(self, exit))

/* @internal */
export const deferredFail = dual<
  <E>(error: E) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, error: E) => Effect.Effect<never, never, boolean>
>(2, (self, error) => deferredCompleteWith(self, fail(error)))

/* @internal */
export const deferredFailSync = dual<
  <E>(evaluate: LazyArg<E>) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<E>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, failSync(evaluate)))

/* @internal */
export const deferredFailCause = dual<
  <E>(cause: Cause.Cause<E>) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, cause: Cause.Cause<E>) => Effect.Effect<never, never, boolean>
>(2, (self, cause) => deferredCompleteWith(self, failCause(cause)))

/* @internal */
export const deferredFailCauseSync = dual<
  <E>(evaluate: LazyArg<Cause.Cause<E>>) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<Cause.Cause<E>>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, failCauseSync(evaluate)))

/* @internal */
export const deferredDie = dual<
  (defect: unknown) => <E, A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, defect: unknown) => Effect.Effect<never, never, boolean>
>(2, (self, defect) => deferredCompleteWith(self, die(defect)))

/* @internal */
export const deferredDieSync = dual<
  (evaluate: LazyArg<unknown>) => <E, A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<unknown>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, dieSync(evaluate)))

/* @internal */
export const deferredInterrupt = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> =>
  flatMap(fiberId, (fiberId) => deferredCompleteWith(self, interruptWith(fiberId)))

/* @internal */
export const deferredInterruptWith = dual<
  (fiberId: FiberId.FiberId) => <E, A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, fiberId: FiberId.FiberId) => Effect.Effect<never, never, boolean>
>(2, (self, fiberId) => deferredCompleteWith(self, interruptWith(fiberId)))

/* @internal */
export const deferredIsDone = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> =>
  sync(() => MutableRef.get(self.state)._tag === DeferredOpCodes.OP_STATE_DONE)

/* @internal */
export const deferredPoll = <E, A>(
  self: Deferred.Deferred<E, A>
): Effect.Effect<never, never, Option.Option<Effect.Effect<never, E, A>>> =>
  sync(() => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return Option.some(state.effect)
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        return Option.none()
      }
    }
  })

/* @internal */
export const deferredSucceed = dual<
  <A>(value: A) => <E>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, value: A) => Effect.Effect<never, never, boolean>
>(2, (self, value) => deferredCompleteWith(self, succeed(value)))

/* @internal */
export const deferredSync = dual<
  <A>(evaluate: LazyArg<A>) => <E>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<A>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, sync(evaluate)))

/** @internal */
export const deferredUnsafeDone = <E, A>(self: Deferred.Deferred<E, A>, effect: Effect.Effect<never, E, A>): void => {
  const state = MutableRef.get(self.state)
  if (state._tag === DeferredOpCodes.OP_STATE_PENDING) {
    pipe(self.state, MutableRef.set(deferred.done(effect)))
    for (let i = state.joiners.length - 1; i >= 0; i--) {
      state.joiners[i](effect)
    }
  }
}

const deferredInterruptJoiner = <E, A>(
  self: Deferred.Deferred<E, A>,
  joiner: (effect: Effect.Effect<never, E, A>) => void
): Effect.Effect<never, never, void> =>
  sync(() => {
    const state = MutableRef.get(self.state)
    if (state._tag === DeferredOpCodes.OP_STATE_PENDING) {
      pipe(
        self.state,
        MutableRef.set(deferred.pending(state.joiners.filter((j) => j !== joiner)))
      )
    }
  })

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const constContext = fiberRefGet(currentContext)

/* @internal */
export const context = <R>(): Effect.Effect<R, never, Context.Context<R>> =>
  constContext as Effect.Effect<never, never, Context.Context<R>>

/* @internal */
export const contextWith = <R0, A>(
  f: (context: Context.Context<R0>) => A
): Effect.Effect<R0, never, A> => map(context<R0>(), f)

/* @internal */
export const contextWithEffect = <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect.Effect<R, E, A>
): Effect.Effect<R | R0, E, A> => flatMap(context<R0>(), f)

/* @internal */
export const provideContext = dual<
  <R>(context: Context.Context<R>) => <E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<never, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, context: Context.Context<R>) => Effect.Effect<never, E, A>
>(2, <R, E, A>(self: Effect.Effect<R, E, A>, context: Context.Context<R>) =>
  fiberRefLocally(
    currentContext,
    context
  )(self as Effect.Effect<never, E, A>))

/* @internal */
export const provideSomeContext = dual<
  <R>(context: Context.Context<R>) => <R1, E, A>(self: Effect.Effect<R1, E, A>) => Effect.Effect<Exclude<R1, R>, E, A>,
  <R, R1, E, A>(self: Effect.Effect<R1, E, A>, context: Context.Context<R>) => Effect.Effect<Exclude<R1, R>, E, A>
>(2, <R1, R, E, A>(self: Effect.Effect<R1, E, A>, context: Context.Context<R>) =>
  fiberRefLocallyWith(
    currentContext,
    (parent) => Context.merge(parent, context)
  )(self as Effect.Effect<never, E, A>))

/* @internal */
export const mapInputContext = dual<
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => <E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R0, E, A>,
  <R0, R, E, A>(
    self: Effect.Effect<R, E, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => Effect.Effect<R0, E, A>
>(2, <R0, R, E, A>(
  self: Effect.Effect<R, E, A>,
  f: (context: Context.Context<R0>) => Context.Context<R>
) => contextWithEffect((context: Context.Context<R0>) => provideContext(self, f(context))))

// -----------------------------------------------------------------------------
// Tracing
// -----------------------------------------------------------------------------

/** @internal */
export const currentSpanFromFiber = <E, A>(fiber: Fiber.RuntimeFiber<E, A>): Option.Option<Tracer.Span> => {
  const span = fiber.getFiberRef(currentContext).unsafeMap.get(internalTracer.spanTag) as Tracer.ParentSpan | undefined
  return span !== undefined && span._tag === "Span" ? Option.some(span) : Option.none()
}

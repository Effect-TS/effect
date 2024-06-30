/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.4.0
 * @experimental
 */
import type { Channel, ChannelTypeId } from "./Channel.js"
import * as Context from "./Context.js"
import type { Effect, EffectTypeId, EffectUnify, EffectUnifyIgnore } from "./Effect.js"
import * as Effectable from "./Effectable.js"
import * as Either from "./Either.js"
import { constTrue, constVoid, dual, identity, type LazyArg } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import type { TypeLambda } from "./HKT.js"
import type { Inspectable } from "./Inspectable.js"
import { NodeInspectSymbol, toStringUnknown } from "./Inspectable.js"
import * as doNotation from "./internal/doNotation.js"
import { StructuralPrototype } from "./internal/effectable.js"
import { SingleShotGen } from "./internal/singleShotGen.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { isIterable, isTagged, type Predicate, type Refinement } from "./Predicate.js"
import type { ReadonlyRecord } from "./Record.js"
import type { Sink, SinkTypeId } from "./Sink.js"
import type { Stream, StreamTypeId } from "./Stream.js"
import type { Concurrency, Covariant, Equals, NoInfer, NotFunction, Simplify } from "./Types.js"
import type * as Unify from "./Unify.js"
import { YieldWrap, yieldWrapGet } from "./Utils.js"

/**
 * @since 3.4.0
 * @experimental
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/Micro")

/**
 * @since 3.4.0
 * @experimental
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.4.0
 * @experimental
 * @category symbols
 */
export const runSymbol: unique symbol = Symbol.for("effect/Micro/runSymbol")

/**
 * @since 3.4.0
 * @experimental
 * @category symbols
 */
export type runSymbol = typeof runSymbol

/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.4.0
 * @experimental
 * @category models
 */
export interface Micro<out A, out E = never, out R = never> extends Effect<A, E, R> {
  readonly [TypeId]: Micro.Variance<A, E, R>
  readonly [runSymbol]: (env: Env<any>, onExit: (exit: MicroExit<A, E>) => void) => void
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: MicroUnify<this>
  [Unify.ignoreSymbol]?: MicroUnifyIgnore
  [Symbol.iterator](): MicroIterator<Micro<A, E, R>>
}

/**
 * @category models
 * @since 3.4.3
 */
export interface MicroUnify<A extends { [Unify.typeSymbol]?: any }> extends EffectUnify<A> {
  Micro?: () => A[Unify.typeSymbol] extends Micro<infer A0, infer E0, infer R0> | infer _ ? Micro<A0, E0, R0> : never
}

/**
 * @category models
 * @since 3.4.3
 */
export interface MicroUnifyIgnore extends EffectUnifyIgnore {
  Effect?: true
}
/**
 * @category type lambdas
 * @since 3.4.1
 */
export interface MicroTypeLambda extends TypeLambda {
  readonly type: Micro<this["Target"], this["Out1"], this["Out2"]>
}

/**
 * @since 3.4.0
 * @experimental
 */
export declare namespace Micro {
  /**
   * @since 3.4.0
   * @experimental
   */
  export interface Variance<A, E, R> {
    _A: Covariant<A>
    _E: Covariant<E>
    _R: Covariant<R>
  }

  /**
   * @since 3.4.0
   * @experimental
   */
  export type Success<T> = T extends Micro<infer _A, infer _E, infer _R> ? _A : never

  /**
   * @since 3.4.0
   * @experimental
   */
  export type Error<T> = T extends Micro<infer _A, infer _E, infer _R> ? _E : never

  /**
   * @since 3.4.0
   * @experimental
   */
  export type Context<T> = T extends Micro<infer _A, infer _E, infer _R> ? _R : never
}

/**
 * @since 3.4.0
 * @experimental
 * @category guards
 */
export const isMicro = (u: unknown): u is Micro<any, any, any> => typeof u === "object" && u !== null && TypeId in u

/**
 * @since 3.4.0
 * @experimental
 * @category models
 */
export interface MicroIterator<T extends Micro<any, any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<YieldWrap<T>, Micro.Success<T>>
}

// ----------------------------------------------------------------------------
// MicroCause
// ----------------------------------------------------------------------------

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const MicroCauseTypeId = Symbol.for("effect/Micro/MicroCause")

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export type MicroCauseTypeId = typeof MicroCauseTypeId

/**
 * A Micro Cause is a data type that represents the different ways a Micro can fail.
 *
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export type MicroCause<E> = MicroCause.Die | MicroCause.Fail<E> | MicroCause.Interrupt

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export declare namespace MicroCause {
  /**
   * @since 3.4.6
   * @experimental
   */
  export type Error<T> = T extends MicroCause.Fail<infer E> ? E : never

  /**
   * @since 3.4.0
   * @experimental
   */
  export interface Proto<Tag extends string, E> extends Pipeable, globalThis.Error {
    readonly [MicroCauseTypeId]: {
      _E: Covariant<E>
    }
    readonly _tag: Tag
    readonly traces: ReadonlyArray<string>
  }

  /**
   * @since 3.4.6
   * @experimental
   * @category MicroCause
   */
  export interface Die extends Proto<"Die", never> {
    readonly defect: unknown
  }

  /**
   * @since 3.4.6
   * @experimental
   * @category MicroCause
   */
  export interface Fail<E> extends Proto<"Fail", E> {
    readonly error: E
  }

  /**
   * @since 3.4.6
   * @experimental
   * @category MicroCause
   */
  export interface Interrupt extends Proto<"Interrupt", never> {}
}

const microCauseVariance = {
  _E: identity
}

abstract class MicroCauseImpl<Tag extends string, E> extends globalThis.Error implements MicroCause.Proto<Tag, E> {
  readonly [MicroCauseTypeId]: {
    _E: Covariant<E>
  }
  constructor(
    readonly _tag: Tag,
    originalError: unknown,
    readonly traces: ReadonlyArray<string>
  ) {
    const causeName = `MicroCause.${_tag}`
    let name: string
    let message: string
    let stack: string
    if (originalError instanceof globalThis.Error) {
      name = `(${causeName}) ${originalError.name}`
      message = originalError.message as string
      const messageLines = message.split("\n").length
      stack = originalError.stack
        ? `(${causeName}) ${originalError.stack.split("\n").slice(0, messageLines + 3).join("\n")}`
        : `${name}: ${message}`
    } else {
      name = causeName
      message = toStringUnknown(originalError, 0)
      stack = `${name}: ${message}`
    }
    if (traces.length > 0) {
      stack += `\n    ${traces.join("\n    ")}`
    }
    super(message)
    this[MicroCauseTypeId] = microCauseVariance
    this.name = name
    this.stack = stack
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  toString() {
    return this.stack
  }
  [NodeInspectSymbol]() {
    return this.stack
  }
}

class FailImpl<E> extends MicroCauseImpl<"Fail", E> implements MicroCause.Fail<E> {
  constructor(readonly error: E, traces: ReadonlyArray<string> = []) {
    super("Fail", error, traces)
  }
}

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeFail = <E>(error: E, traces: ReadonlyArray<string> = []): MicroCause<E> => new FailImpl(error, traces)

class DieImpl extends MicroCauseImpl<"Die", never> implements MicroCause.Die {
  constructor(readonly defect: unknown, traces: ReadonlyArray<string> = []) {
    super("Die", defect, traces)
  }
}

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeDie = (defect: unknown, traces: ReadonlyArray<string> = []): MicroCause<never> =>
  new DieImpl(defect, traces)

class InterruptImpl extends MicroCauseImpl<"Interrupt", never> implements MicroCause.Interrupt {
  constructor(traces: ReadonlyArray<string> = []) {
    super("Interrupt", "interrupted", traces)
  }
}

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeInterrupt = (traces: ReadonlyArray<string> = []): MicroCause<never> => new InterruptImpl(traces)

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeIsFail = <E>(self: MicroCause<E>): self is MicroCause.Fail<E> => self._tag === "Fail"

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeIsDie = <E>(self: MicroCause<E>): self is MicroCause.Die => self._tag === "Die"

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeIsInterrupt = <E>(self: MicroCause<E>): self is MicroCause.Interrupt => self._tag === "Interrupt"

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeSquash = <E>(self: MicroCause<E>): unknown =>
  self._tag === "Fail" ? self.error : self._tag === "Die" ? self.defect : self

/**
 * @since 3.4.6
 * @experimental
 * @category MicroCause
 */
export const causeWithTrace: {
  (trace: string): <E>(self: MicroCause<E>) => MicroCause<E>
  <E>(self: MicroCause<E>, trace: string): MicroCause<E>
} = dual(2, <E>(self: MicroCause<E>, trace: string): MicroCause<E> => {
  const traces = [...self.traces, trace]
  switch (self._tag) {
    case "Die":
      return causeDie(self.defect, traces)
    case "Interrupt":
      return causeInterrupt(traces)
    case "Fail":
      return causeFail(self.error, traces)
  }
})

// ----------------------------------------------------------------------------
// MicroExit
// ----------------------------------------------------------------------------

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export declare namespace MicroExit {
  /**
   * @since 3.4.6
   * @experimental
   * @category MicroExit
   */
  export type Success<A, E = never> = Either.Right<MicroCause<E>, A>

  /**
   * @since 3.4.6
   * @experimental
   * @category MicroExit
   */
  export type Failure<A, E = never> = Either.Left<MicroCause<E>, A>
}

/**
 * The MicroExit type is a data type that represents the result of a Micro
 * computation.
 *
 * It uses the `Either` data type to represent the success and failure cases.
 *
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export type MicroExit<A, E = never> = MicroExit.Success<A, E> | MicroExit.Failure<A, E>

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitInterrupt: MicroExit<never> = Either.left(causeInterrupt())

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitSucceed: <A>(a: A) => MicroExit<A, never> = Either.right

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitFail = <E>(e: E): MicroExit<never, E> => Either.left(causeFail(e))

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitDie = (defect: unknown): MicroExit<never> => Either.left(causeDie(defect))

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitFailCause: <E>(cause: MicroCause<E>) => MicroExit<never, E> = Either.left

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitIsSuccess: <A, E>(self: MicroExit<A, E>) => self is MicroExit.Success<A, E> = Either.isRight

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitIsFailure: <A, E>(self: MicroExit<A, E>) => self is MicroExit.Failure<A, E> = Either.isLeft

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitIsInterrupt = <A, E>(self: MicroExit<A, E>): self is Either.Left<MicroCause.Interrupt, A> =>
  exitIsFailure(self) && self.left._tag === "Interrupt"

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitIsFail = <A, E>(self: MicroExit<A, E>): self is Either.Left<MicroCause.Fail<E>, A> =>
  exitIsFailure(self) && self.left._tag === "Fail"

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitIsDie = <A, E>(self: MicroExit<A, E>): self is Either.Left<MicroCause.Die, A> =>
  exitIsFailure(self) && self.left._tag === "Die"

/**
 * @since 3.4.6
 * @experimental
 * @category MicroExit
 */
export const exitVoid: MicroExit<void> = exitSucceed(void 0)

// ----------------------------------------------------------------------------
// env
// ----------------------------------------------------------------------------

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const EnvTypeId = Symbol.for("effect/Micro/Env")

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export type EnvTypeId = typeof EnvTypeId

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export interface Env<R> extends Pipeable {
  readonly [EnvTypeId]: {
    _R: Covariant<R>
  }
  readonly refs: ReadonlyRecord<string, unknown>
}

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const EnvRefTypeId: unique symbol = Symbol.for("effect/Micro/EnvRef")

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export type EnvRefTypeId = typeof EnvRefTypeId

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export interface EnvRef<A> {
  readonly [EnvRefTypeId]: EnvRefTypeId
  readonly key: string
  readonly initial: A
}

const EnvProto = {
  [EnvTypeId]: {
    _R: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const envMake = <R = never>(
  refs: Record<string, unknown>
): Env<R> => {
  const self = Object.create(EnvProto)
  self.refs = refs
  return self
}

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const envUnsafeMakeEmpty = (): Env<never> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  return envMake(refs)
}

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const envGet: {
  <A>(ref: EnvRef<A>): <R>(self: Env<R>) => A
  <A, R>(self: Env<R>, ref: EnvRef<A>): A
} = dual(2, <R, A>(self: Env<R>, ref: EnvRef<A>): A => ref.key in self.refs ? (self.refs[ref.key] as A) : ref.initial)

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const envSet: {
  <A>(ref: EnvRef<A>, value: A): <R>(self: Env<R>) => Env<R>
  <A, R>(self: Env<R>, ref: EnvRef<A>, value: A): Env<R>
} = dual(3, <R, A>(self: Env<R>, ref: EnvRef<A>, value: A): Env<R> => {
  const refs = Object.assign(Object.create(null), self.refs)
  refs[ref.key] = value
  return envMake(refs)
})

/**
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const envMutate: {
  (f: (map: Record<string, unknown>) => void): <R>(self: Env<R>) => Env<R>
  <R>(self: Env<R>, f: (map: Record<string, unknown>) => void): Env<R>
} = dual(
  2,
  <R>(self: Env<R>, f: (map: Record<string, unknown>) => ReadonlyRecord<string, unknown>): Env<R> =>
    envMake(f(Object.assign(Object.create(null), self.refs)))
)

/**
 * Access the given `Context.Tag` from the environment.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const service = <I, S>(tag: Context.Tag<I, S>): Micro<S, never, I> =>
  make(function(env, onExit) {
    onExit(exitSucceed(Context.get(envGet(env, currentContext) as Context.Context<I>, tag as any) as S))
  })

/**
 * Access the given `Context.Tag` from the environment, without tracking the
 * dependency at the type level.
 *
 * It will return an `Option` of the service, depending on whether it is
 * available in the environment or not.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const serviceOption = <I, S>(tag: Context.Tag<I, S>): Micro<Option.Option<S>> =>
  make(function(env, onExit) {
    onExit(exitSucceed(Context.getOption(envGet(env, currentContext) as Context.Context<I>, tag)))
  })

/**
 * Retrieve the current value of the given `EnvRef`.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const getEnvRef = <A>(envRef: EnvRef<A>): Micro<A> =>
  make((env, onExit) => onExit(Either.right(envGet(env, envRef))))

/**
 * Set the value of the given `EnvRef` for the duration of the effect.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const locally: {
  <A>(fiberRef: EnvRef<A>, value: A): <XA, E, R>(self: Micro<XA, E, R>) => Micro<XA, E, R>
  <XA, E, R, A>(self: Micro<XA, E, R>, fiberRef: EnvRef<A>, value: A): Micro<XA, E, R>
} = dual(
  3,
  <XA, E, R, A>(self: Micro<XA, E, R>, fiberRef: EnvRef<A>, value: A): Micro<XA, E, R> =>
    make((env, onExit) => self[runSymbol](envSet(env, fiberRef, value), onExit))
)

/**
 * Access the current `Context` from the environment.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const context = <R>(): Micro<Context.Context<R>> => getEnvRef(currentContext) as any

/**
 * Merge the given `Context` with the current context.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const provideContext: {
  <XR>(context: Context.Context<XR>): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, Exclude<R, XR>>
  <A, E, R, XR>(self: Micro<A, E, R>, context: Context.Context<XR>): Micro<A, E, Exclude<R, XR>>
} = dual(
  2,
  <A, E, R, XR>(self: Micro<A, E, R>, provided: Context.Context<XR>): Micro<A, E, Exclude<R, XR>> =>
    make(function(env, onExit) {
      const context = envGet(env, currentContext)
      const nextEnv = envSet(env, currentContext, Context.merge(context, provided))
      self[runSymbol](nextEnv, onExit)
    })
)

/**
 * Add the provided service to the current context.
 *
 * @since 3.4.0
 * @experimental
 * @category environment
 */
export const provideService: {
  <I, S>(tag: Context.Tag<I, S>, service: S): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, Exclude<R, I>>
  <A, E, R, I, S>(self: Micro<A, E, R>, tag: Context.Tag<I, S>, service: S): Micro<A, E, Exclude<R, I>>
} = dual(
  3,
  <A, E, R, I, S>(self: Micro<A, E, R>, tag: Context.Tag<I, S>, service: S): Micro<A, E, Exclude<R, I>> =>
    make(function(env, onExit) {
      const context = envGet(env, currentContext)
      const nextEnv = envSet(env, currentContext, Context.add(context, tag, service))
      self[runSymbol](nextEnv, onExit)
    })
)

/**
 * Create a service using the provided `Micro` effect, and add it to the
 * current context.
 *
 * @since 3.4.6
 * @experimental
 * @category environment
 */
export const provideServiceEffect: {
  <I, S, E2, R2>(
    tag: Context.Tag<I, S>,
    acquire: Micro<S, E2, R2>
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E | E2, Exclude<R, I> | R2>
  <A, E, R, I, S, E2, R2>(
    self: Micro<A, E, R>,
    tag: Context.Tag<I, S>,
    acquire: Micro<S, E2, R2>
  ): Micro<A, E | E2, Exclude<R, I> | R2>
} = dual(
  3,
  <A, E, R, I, S, E2, R2>(
    self: Micro<A, E, R>,
    tag: Context.Tag<I, S>,
    acquire: Micro<S, E2, R2>
  ): Micro<A, E | E2, Exclude<R, I> | R2> => flatMap(acquire, (service) => provideService(self, tag, service))
)

// ========================================================================
// Env refs
// ========================================================================

const EnvRefProto = {
  [EnvRefTypeId]: EnvRefTypeId
}

/**
 * @since 3.4.0
 * @experimental
 * @category environment refs
 */
export const envRefMake = <A>(key: string, initial: LazyArg<A>): EnvRef<A> =>
  globalValue(key, () => {
    const self = Object.create(EnvRefProto)
    self.key = key
    self.initial = initial()
    return self
  })

/**
 * @since 3.4.0
 * @experimental
 * @category environment refs
 */
export const currentAbortController: EnvRef<AbortController> = envRefMake(
  "effect/Micro/currentAbortController",
  () => undefined as any
)

/**
 * @since 3.4.0
 * @experimental
 * @category environment refs
 */
export const currentAbortSignal: EnvRef<AbortSignal> = envRefMake(
  "effect/Micro/currentAbortSignal",
  () => undefined as any
)

/**
 * @since 3.4.0
 * @experimental
 * @category environment refs
 */
export const currentContext: EnvRef<Context.Context<never>> = envRefMake(
  "effect/Micro/currentContext",
  () => Context.empty()
)

/**
 * @since 3.4.0
 * @experimental
 * @category environment refs
 */
export const currentConcurrency: EnvRef<"unbounded" | number> = envRefMake(
  "effect/Micro/currentConcurrency",
  () => "unbounded"
)

/**
 * @since 3.4.0
 * @experimental
 * @category environment refs
 */
export const currentMaxDepthBeforeYield: EnvRef<number> = envRefMake(
  "effect/Micro/currentMaxDepthBeforeYield",
  () => 2048
)

const currentInterruptible: EnvRef<boolean> = envRefMake(
  "effect/Micro/currentInterruptible",
  () => true
)

/**
 * If you have a `Micro` that uses `concurrency: "inherit"`, you can use this
 * api to control the concurrency of that `Micro` when it is run.
 *
 * @since 3.4.0
 * @experimental
 * @category environment refs
 * @example
 * import * as Micro from "effect/Micro"
 *
 * Micro.forEach([1, 2, 3], (n) => Micro.succeed(n), {
 *   concurrency: "inherit"
 * }).pipe(
 *   Micro.withConcurrency(2) // use a concurrency of 2
 * )
 */
export const withConcurrency: {
  (concurrency: "unbounded" | number): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, concurrency: "unbounded" | number): Micro<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, concurrency: "unbounded" | number): Micro<A, E, R> =>
    locally(self, currentConcurrency, concurrency)
)

// ----------------------------------------------------------------------------
// constructors
// ----------------------------------------------------------------------------

const MicroProto = {
  ...Effectable.EffectPrototype,
  _op: "Micro",
  [TypeId]: {
    _A: identity,
    _E: identity,
    _R: identity
  },
  [Symbol.iterator]() {
    return new SingleShotGen(new YieldWrap(this)) as any
  }
}

const microDepthState = globalValue("effect/Micro/microDepthState", () => ({
  depth: 0,
  maxDepthBeforeYield: currentMaxDepthBeforeYield.initial
}))

const unsafeMake = <R, A, E>(
  run: (env: Env<R>, onExit: (exit: MicroExit<A, E>) => void) => void
): Micro<A, E, R> => {
  const self = Object.create(MicroProto)
  self[runSymbol] = run
  return self
}

const unsafeMakeOptions = <R, A, E>(
  run: (env: Env<R>, onExit: (exit: MicroExit<A, E>) => void) => void,
  checkAbort: boolean
): Micro<A, E, R> =>
  unsafeMake(function execute(env, onExit) {
    if (
      checkAbort && env.refs[currentInterruptible.key] !== false &&
      (env.refs[currentAbortSignal.key] as AbortSignal).aborted
    ) {
      return onExit(exitInterrupt)
    }
    microDepthState.depth++
    if (microDepthState.depth === 1) {
      microDepthState.maxDepthBeforeYield = envGet(env, currentMaxDepthBeforeYield)
    }
    if (microDepthState.depth >= microDepthState.maxDepthBeforeYield) {
      yieldAdd(() => execute(env, onExit))
    } else {
      try {
        run(env, onExit)
      } catch (err) {
        onExit(exitDie(err))
      }
    }
    microDepthState.depth--
  })

/**
 * A low-level constructor for creating a `Micro` effect. It takes a function
 * that receives an environment and a callback which should be called with the
 * result of the effect.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const make = <R, A, E>(
  run: (env: Env<R>, onExit: (exit: MicroExit<A, E>) => void) => void
): Micro<A, E, R> => unsafeMakeOptions(run, true)

/**
 * Converts a `MicroExit` into a `Micro` effect.
 *
 * @since 3.4.6
 * @experimental
 * @category constructors
 */
export const fromExit = <A, E>(self: MicroExit<A, E>): Micro<A, E> =>
  make(function(_env, onExit) {
    onExit(self)
  })

/**
 * Converts a lazy `MicroExit` into a `Micro` effect.
 *
 * @since 3.4.6
 * @experimental
 * @category constructors
 */
export const fromExitSync = <A, E>(self: LazyArg<MicroExit<A, E>>): Micro<A, E> =>
  make(function(_env, onExit) {
    onExit(self())
  })

/**
 * Creates a `Micro` effect that will succeed with the specified constant value.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const succeed = <A>(a: A): Micro<A> => fromExit(exitSucceed(a))

/**
 * Creates a `Micro` effect that will succeed with `Option.Some` of the value.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const succeedSome = <A>(a: A): Micro<Option.Option<A>> => succeed(Option.some(a))

/**
 * Creates a `Micro` effect that will succeed with `Option.None`.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const succeedNone: Micro<Option.Option<never>> = succeed(Option.none())

/**
 * Creates a `Micro` effect that will fail with the specified error.
 *
 * This will result in a `CauseFail`, where the error is tracked at the
 * type level.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const fail = <E>(e: E): Micro<never, E> => fromExit(exitFail(e))

/**
 * Creates a `Micro` effect that will fail with the lazily evaluated error.
 *
 * This will result in a `CauseFail`, where the error is tracked at the
 * type level.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const failSync = <E>(e: LazyArg<E>): Micro<never, E> =>
  make(function(_env, onExit) {
    onExit(exitFail(e()))
  })

/**
 * Creates a `Micro` effect that will die with the specified error.
 *
 * This will result in a `CauseDie`, where the error is not tracked at
 * the type level.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const die = (defect: unknown): Micro<never> => fromExit(exitDie(defect))

/**
 * Creates a `Micro` effect that will fail with the specified `MicroCause`.
 *
 * @since 3.4.6
 * @experimental
 * @category constructors
 */
export const failCause = <E>(cause: MicroCause<E>): Micro<never, E> => fromExit(exitFailCause(cause))

/**
 * Creates a `Micro` effect that will fail with the lazily evaluated `MicroCause`.
 *
 * @since 3.4.6
 * @experimental
 * @category constructors
 */
export const failCauseSync = <E>(cause: LazyArg<MicroCause<E>>): Micro<never, E> =>
  fromExitSync(() => exitFailCause(cause()))

/**
 * Creates a `Micro` effect that will succeed with the lazily evaluated value.
 *
 * If the evaluation of the value throws an error, the effect will fail with
 * `CauseDie`.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const sync = <A>(evaluate: LazyArg<A>): Micro<A> =>
  make(function(_env, onExit) {
    onExit(exitSucceed(evaluate()))
  })

/**
 * Converts an `Option` into a `Micro` effect, that will fail with
 * `NoSuchElementException` if the option is `None`. Otherwise, it will succeed with the
 * value of the option.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const fromOption = <A>(option: Option.Option<A>): Micro<A, NoSuchElementException> =>
  make(function(_env, onExit) {
    onExit(option._tag === "Some" ? exitSucceed(option.value) : exitFail(new NoSuchElementException({})))
  })

/**
 * Converts an `Either` into a `Micro` effect, that will fail with the left side
 * of the either if it is a `Left`. Otherwise, it will succeed with the right
 * side of the either.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const fromEither = <R, L>(either: Either.Either<R, L>): Micro<R, L> =>
  make(function(_env, onExit) {
    onExit(either._tag === "Right" ? either as MicroExit<R, never> : exitFail(either.left))
  })

/**
 * Lazily creates a `Micro` effect from the given side-effect.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const suspend = <A, E, R>(evaluate: LazyArg<Micro<A, E, R>>): Micro<A, E, R> =>
  make(function(env, onExit) {
    evaluate()[runSymbol](env, onExit)
  })

const void_: Micro<void> = succeed(void 0)
export {
  /**
   * A `Micro` effect that will succeed with `void` (`undefined`).
   *
   * @since 3.4.0
   * @experimental
   * @category constructors
   */
  void_ as void
}

/**
 * Create a `Micro` effect from an asynchronous computation.
 *
 * You can return a cleanup effect that will be run when the effect is aborted.
 * It is also passed an `AbortSignal` that is triggered when the effect is
 * aborted.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const async = <A, E = never, R = never>(
  register: (resume: (effect: Micro<A, E, R>) => void, signal: AbortSignal) => void | Micro<void, never, R>
): Micro<A, E, R> =>
  make(function(env, onExit) {
    let resumed = false
    const controller = register.length > 1 ? new AbortController() : undefined
    const signal = envGet(env, currentAbortSignal)
    let cleanup: Micro<void, never, R> | void = undefined
    function onAbort() {
      if (cleanup) {
        resume(uninterruptible(andThen(cleanup, fromExit(exitInterrupt))))
      } else {
        resume(fromExit(exitInterrupt))
      }
      if (controller !== undefined) {
        controller.abort()
      }
    }
    function resume(effect: Micro<A, E, R>) {
      if (resumed) {
        return
      }
      resumed = true
      signal.removeEventListener("abort", onAbort)
      effect[runSymbol](env, onExit)
    }
    cleanup = controller === undefined
      ? (register as any)(resume)
      : register(resume, controller.signal)
    if (resumed) return
    signal.addEventListener("abort", onAbort)
  })

const try_ = <A, E>(options: {
  try: LazyArg<A>
  catch: (error: unknown) => E
}): Micro<A, E> =>
  make(function(_env, onExit) {
    try {
      onExit(exitSucceed(options.try()))
    } catch (err) {
      onExit(exitFail(options.catch(err)))
    }
  })
export {
  /**
   * The `Micro` equivalent of a try / catch block, which allows you to map
   * thrown errors to a specific error type.
   *
   * @since 3.4.0
   * @experimental
   * @category constructors
   * @example
   * import { Micro } from "effect"
   *
   * Micro.try({
   *   try: () => throw new Error("boom"),
   *   catch: (cause) => new Error("caught", { cause })
   * })
   */
  try_ as try
}

/**
 * Wrap a `Promise` into a `Micro` effect. Any errors will result in a
 * `CauseDie`.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const promise = <A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Micro<A> =>
  async<A>(function(resume, signal) {
    evaluate(signal).then(
      (a) => resume(succeed(a)),
      (e) => resume(die(e))
    )
  })

/**
 * Wrap a `Promise` into a `Micro` effect. Any errors will be caught and
 * converted into a specific error type.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 * @example
 * import { Micro } from "effect"
 *
 * Micro.tryPromise({
 *   try: () => Promise.resolve("success"),
 *   catch: (cause) => new Error("caught", { cause })
 * })
 */
export const tryPromise = <A, E>(options: {
  readonly try: (signal: AbortSignal) => PromiseLike<A>
  readonly catch: (error: unknown) => E
}): Micro<A, E> =>
  async<A, E>(function(resume, signal) {
    try {
      options.try(signal).then(
        (a) => resume(succeed(a)),
        (e) => resume(fail(options.catch(e)))
      )
    } catch (err) {
      resume(fail(options.catch(err)))
    }
  })

const yieldState: {
  tasks: Array<() => void>
  working: boolean
} = globalValue("effect/Micro/yieldState", () => ({
  tasks: [],
  working: false
}))

const yieldRunTasks = () => {
  const tasks = yieldState.tasks
  yieldState.tasks = []
  for (let i = 0, len = tasks.length; i < len; i++) {
    tasks[i]()
  }
}

const setImmediate = "setImmediate" in globalThis ? globalThis.setImmediate : (f: () => void) => setTimeout(f, 0)

const yieldAdd = (task: () => void) => {
  yieldState.tasks.push(task)
  if (!yieldState.working) {
    yieldState.working = true
    setImmediate(() => {
      yieldState.working = false
      yieldRunTasks()
    })
  }
}

/**
 * Pause the execution of the current `Micro` effect, and resume it on the next
 * iteration of the event loop.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const yieldNow: Micro<void> = make(function(_env, onExit) {
  yieldAdd(() => onExit(exitVoid))
})

/**
 * Flush any yielded effects that are waiting to be executed.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const yieldFlush: Micro<void> = sync(function() {
  while (yieldState.tasks.length > 0) {
    yieldRunTasks()
  }
})

/**
 * A `Micro` that will never succeed or fail. It wraps `setInterval` to prevent
 * the Javascript runtime from exiting.
 *
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const never: Micro<never> = async<never>(function() {
  const interval = setInterval(constVoid, 2147483646)
  return sync(() => clearInterval(interval))
})

/**
 * @since 3.4.0
 * @experimental
 * @category constructors
 */
export const gen = <Self, Eff extends YieldWrap<Micro<any, any, any>>, AEff>(
  ...args:
    | [self: Self, body: (this: Self) => Generator<Eff, AEff, never>]
    | [body: () => Generator<Eff, AEff, never>]
): Micro<
  AEff,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Micro<infer _A, infer E, infer _R>>] ? E : never,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<Micro<infer _A, infer _E, infer R>>] ? R : never
> =>
  make(function(env, onExit) {
    const iterator: Generator<Eff, AEff, any> = args.length === 1 ? args[0]() : args[1].call(args[0])
    let running = false
    let value: any = undefined
    function run() {
      running = true
      try {
        let shouldContinue = true
        while (shouldContinue) {
          const result = iterator.next(value)
          if (result.done) {
            return onExit(exitSucceed(result.value))
          }
          shouldContinue = false
          yieldWrapGet(result.value)[runSymbol](env, function(exit) {
            if (exit._tag === "Left") {
              onExit(exit)
            } else {
              shouldContinue = true
              value = exit.right
              if (!running) run()
            }
          })
        }
      } catch (err) {
        onExit(exitDie(err))
      }
      running = false
    }
    run()
  })

// ----------------------------------------------------------------------------
// mapping & sequencing
// ----------------------------------------------------------------------------

/**
 * Flattens any nested `Micro` effects, merging the error and requirement types.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const flatten = <A, E, R, E2, R2>(self: Micro<Micro<A, E, R>, E2, R2>): Micro<A, E | E2, R | R2> =>
  make(function(env, onExit) {
    self[runSymbol](
      env,
      (exit) => exit._tag === "Left" ? onExit(exit as MicroExit<never, E2>) : exit.right[runSymbol](env, onExit)
    )
  })

/**
 * Transforms the success value of the `Micro` effect with the specified
 * function.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B>(self: Micro<A, E, R>, f: (a: A) => B): Micro<B, E, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, f: (a: A) => B): Micro<B, E, R> =>
  make(function(env, onExit) {
    self[runSymbol](env, function(exit) {
      onExit(exit._tag === "Left" ? exit as MicroExit<never, E> : exitSucceed(f(exit.right)))
    })
  }))

/**
 * Create a `Micro` effect that will replace the success value of the given
 * effect.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const as: {
  <A, B>(value: B): <E, R>(self: Micro<A, E, R>) => Micro<B, E, R>
  <A, E, R, B>(self: Micro<A, E, R>, value: B): Micro<B, E, R>
} = dual(2, <A, E, R, B>(self: Micro<A, E, R>, value: B): Micro<B, E, R> => map(self, (_) => value))

/**
 * Wrap the success value of this `Micro` effect in an `Option.Some`.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const asSome = <A, E, R>(self: Micro<A, E, R>): Micro<Option.Option<A>, E, R> => map(self, Option.some)

/**
 * Map the success value of this `Micro` effect to another `Micro` effect, then
 * flatten the result.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const flatMap: {
  <A, B, E2, R2>(f: (a: A) => Micro<B, E2, R2>): <E, R>(self: Micro<A, E, R>) => Micro<B, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: A) => Micro<B, E2, R2>): Micro<B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: A) => Micro<B, E2, R2>): Micro<B, E | E2, R | R2> =>
    make(function(env, onExit) {
      self[runSymbol](env, function(exit) {
        if (exit._tag === "Left") {
          return onExit(exit as MicroExit<never, E>)
        }
        f(exit.right)[runSymbol](env, onExit)
      })
    })
)

/**
 * Swap the error and success types of the `Micro` effect.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const flip = <A, E, R>(self: Micro<A, E, R>): Micro<E, A, R> =>
  matchEffect(self, {
    onFailure: succeed,
    onSuccess: fail
  })

/**
 * A more flexible version of `flatMap`, that combines `map` and `flatMap` into
 * a single api.
 *
 * It also allows you to pass in a `Micro` effect directly, which will be
 * executed after the current effect.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const andThen: {
  <A, X>(
    f: (a: A) => X
  ): <E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: (a: A) => X
  ): [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Micro<infer A1, infer E1, infer R1>] ? Micro<A1, E | E1, R | R1>
    : Micro<X, E, R>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: any): Micro<B, E | E2, R | R2> =>
    make(function(env, onExit) {
      self[runSymbol](env, function(exit) {
        if (exit._tag === "Left") {
          return onExit(exit as MicroExit<never, E>)
        } else if (envGet(env, currentAbortSignal).aborted) {
          return onExit(exitInterrupt)
        }
        const value = isMicro(f) ? f : typeof f === "function" ? f(exit.right) : f
        if (isMicro(value)) {
          value[runSymbol](env, onExit)
        } else {
          onExit(exitSucceed(value))
        }
      })
    })
)

/**
 * Execute a side effect from the success value of the `Micro` effect.
 *
 * It is similar to the `andThen` api, but the success value is ignored.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const tap: {
  <A, X>(
    f: (a: NoInfer<A>) => X
  ): <E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
  <X>(
    f: NotFunction<X>
  ): <A, E, R>(
    self: Micro<A, E, R>
  ) => [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: (a: NoInfer<A>) => X
  ): [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
  <A, E, R, X>(
    self: Micro<A, E, R>,
    f: NotFunction<X>
  ): [X] extends [Micro<infer _A1, infer E1, infer R1>] ? Micro<A, E | E1, R | R1>
    : Micro<A, E, R>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (a: A) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2> =>
    make(function(env, onExit) {
      self[runSymbol](env, function(selfExit) {
        if (selfExit._tag === "Left") {
          return onExit(selfExit as MicroExit<never, E>)
        } else if (envGet(env, currentAbortSignal).aborted) {
          return onExit(exitInterrupt)
        }
        const value = isMicro(f) ? f : typeof f === "function" ? f(selfExit.right) : f
        if (isMicro(value)) {
          value[runSymbol](env, function(tapExit) {
            if (tapExit._tag === "Left") {
              return onExit(tapExit)
            }
            onExit(selfExit)
          })
        } else {
          onExit(selfExit)
        }
      })
    })
)

/**
 * Replace the success value of the `Micro` effect with `void`.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const asVoid = <A, E, R>(self: Micro<A, E, R>): Micro<void, E, R> => map(self, (_) => void 0)

/**
 * Access the `MicroExit` of the given `Micro` effect.
 *
 * @since 3.4.6
 * @experimental
 * @category mapping & sequencing
 */
export const exit = <A, E, R>(self: Micro<A, E, R>): Micro<MicroExit<A, E>, never, R> =>
  make(function(env, onExit) {
    self[runSymbol](env, function(exit) {
      onExit(exitSucceed(exit))
    })
  })

/**
 * Replace the error type of the given `Micro` with the full `MicroCause` object.
 *
 * @since 3.4.0
 * @experimental
 * @category mapping & sequencing
 */
export const sandbox = <A, E, R>(self: Micro<A, E, R>): Micro<A, MicroCause<E>, R> =>
  catchAllCause(self, (cause) => fail(cause))

function forkSignal(env: Env<any>) {
  const controller = new AbortController()
  const parentSignal = envGet(env, currentAbortSignal)
  function onAbort() {
    controller.abort()
    parentSignal.removeEventListener("abort", onAbort)
  }
  parentSignal.addEventListener("abort", onAbort)
  const envWithSignal = envMutate(env, function(refs) {
    refs[currentAbortController.key] = controller
    refs[currentAbortSignal.key] = controller.signal
    return refs
  })
  return [envWithSignal, onAbort] as const
}

/**
 * Returns an effect that races all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @since 3.4.0
 * @experimental
 * @category sequencing
 */
export const raceAll = <Eff extends Micro<any, any, any>>(
  all: Iterable<Eff>
): Micro<Micro.Success<Eff>, Micro.Error<Eff>, Micro.Context<Eff>> =>
  make(function(env, onExit) {
    const [envWithSignal, onAbort] = forkSignal(env)

    const effects = Array.from(all)
    let len = effects.length
    let index = 0
    let done = 0
    let exit: MicroExit<any, any> | undefined = undefined
    const causes: Array<MicroCause<any>> = []
    function onDone(exit_: MicroExit<any, any>) {
      done++
      if (exit_._tag === "Right" && exit === undefined) {
        len = index
        exit = exit_
        onAbort()
      } else if (exit_._tag === "Left") {
        causes.push(exit_.left)
      }
      if (done >= len) {
        onExit(exit ?? Either.left(causes[0]))
      }
    }

    for (; index < len; index++) {
      effects[index][runSymbol](envWithSignal, onDone)
    }
  })

/**
 * Returns an effect that races all the specified effects,
 * yielding the value of the first effect to succeed or fail. Losers of
 * the race will be interrupted immediately
 *
 * @since 3.4.0
 * @experimental
 * @category sequencing
 */
export const raceAllFirst = <Eff extends Micro<any, any, any>>(
  all: Iterable<Eff>
): Micro<Micro.Success<Eff>, Micro.Error<Eff>, Micro.Context<Eff>> =>
  make(function(env, onExit) {
    const [envWithSignal, onAbort] = forkSignal(env)

    const effects = Array.from(all)
    let len = effects.length
    let index = 0
    let done = 0
    let exit: MicroExit<any, any> | undefined = undefined
    const causes: Array<MicroCause<any>> = []
    function onDone(exit_: MicroExit<any, any>) {
      done++
      if (exit === undefined) {
        len = index
        exit = exit_
        onAbort()
      }
      if (done >= len) {
        onExit(exit ?? Either.left(causes[0]))
      }
    }

    for (; index < len; index++) {
      effects[index][runSymbol](envWithSignal, onDone)
    }
  })

/**
 * Returns an effect that races two effects, yielding the value of the first
 * effect to succeed. Losers of the race will be interrupted immediately
 *
 * @since 3.4.0
 * @experimental
 * @category sequencing
 */
export const race: {
  <A2, E2, R2>(that: Micro<A2, E2, R2>): <A, E, R>(self: Micro<A, E, R>) => Micro<A | A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2> =>
    raceAll([self, that])
)

/**
 * Returns an effect that races two effects, yielding the value of the first
 * effect to succeed *or* fail. Losers of the race will be interrupted immediately
 *
 * @since 3.4.0
 * @experimental
 * @category sequencing
 */
export const raceFirst: {
  <A2, E2, R2>(that: Micro<A2, E2, R2>): <A, E, R>(self: Micro<A, E, R>) => Micro<A | A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, that: Micro<A2, E2, R2>): Micro<A | A2, E | E2, R | R2> =>
    raceAllFirst([self, that])
)

// ----------------------------------------------------------------------------
// zipping
// ----------------------------------------------------------------------------

/**
 * Combine two `Micro` effects into a single effect that produces a tuple of
 * their results.
 *
 * @since 3.4.0
 * @experimental
 * @category zipping
 */
export const zip: {
  <A2, E2, R2>(
    that: Micro<A2, E2, R2>,
    options?:
      | { readonly concurrent?: boolean | undefined }
      | undefined
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<[A, A2], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Micro<A, E, R>,
    that: Micro<A2, E2, R2>,
    options?: { readonly concurrent?: boolean | undefined }
  ): Micro<[A, A2], E | E2, R | R2>
} = dual((args) => isMicro(args[1]), <A, E, R, A2, E2, R2>(
  self: Micro<A, E, R>,
  that: Micro<A2, E2, R2>,
  options?: { readonly concurrent?: boolean | undefined }
): Micro<[A, A2], E | E2, R | R2> => zipWith(self, that, (a, a2) => [a, a2], options))

/**
 * The `Micro.zipWith` function combines two `Micro` effects and allows you to
 * apply a function to the results of the combined effects, transforming them
 * into a single value.
 *
 * @since 3.4.3
 * @experimental
 * @category zipping
 */
export const zipWith: {
  <A2, E2, R2, A, B>(
    that: Micro<A2, E2, R2>,
    f: (a: A, b: A2) => B,
    options?: { readonly concurrent?: boolean | undefined }
  ): <E, R>(self: Micro<A, E, R>) => Micro<B, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, B>(
    self: Micro<A, E, R>,
    that: Micro<A2, E2, R2>,
    f: (a: A, b: A2) => B,
    options?: { readonly concurrent?: boolean | undefined }
  ): Micro<B, E2 | E, R2 | R>
} = dual((args) => isMicro(args[1]), <A, E, R, A2, E2, R2, B>(
  self: Micro<A, E, R>,
  that: Micro<A2, E2, R2>,
  f: (a: A, b: A2) => B,
  options?: { readonly concurrent?: boolean | undefined }
): Micro<B, E2 | E, R2 | R> => {
  if (options?.concurrent) {
    // Use `all` exclusively for concurrent cases, as it introduces additional overhead due to the management of concurrency
    return map(all([self, that], { concurrency: "unbounded" }), ([a, a2]) => f(a, a2))
  }
  return flatMap(self, (a) => map(that, (a2) => f(a, a2)))
})

// ----------------------------------------------------------------------------
// filtering & conditionals
// ----------------------------------------------------------------------------

/**
 * Filter the specified effect with the provided function, failing with specified
 * `MicroCause` if the predicate fails.
 *
 * In addition to the filtering capabilities discussed earlier, you have the option to further
 * refine and narrow down the type of the success channel by providing a
 *
 * @since 3.4.0
 * @experimental
 * @category filtering & conditionals
 */
export const filterOrFailCause: {
  <A, B extends A, E2>(
    refinement: Refinement<A, B>,
    orFailWith: (a: NoInfer<A>) => MicroCause<E2>
  ): <E, R>(self: Micro<A, E, R>) => Micro<B, E2 | E, R>
  <A, E2>(
    predicate: Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => MicroCause<E2>
  ): <E, R>(self: Micro<A, E, R>) => Micro<A, E2 | E, R>
  <A, E, R, B extends A, E2>(
    self: Micro<A, E, R>,
    refinement: Refinement<A, B>,
    orFailWith: (a: A) => MicroCause<E2>
  ): Micro<B, E | E2, R>
  <A, E, R, E2>(
    self: Micro<A, E, R>,
    predicate: Predicate<A>,
    orFailWith: (a: A) => MicroCause<E2>
  ): Micro<A, E | E2, R>
} = dual((args) => isMicro(args[0]), <A, E, R, B extends A, E2>(
  self: Micro<A, E, R>,
  refinement: Refinement<A, B>,
  orFailWith: (a: A) => MicroCause<E2>
): Micro<B, E | E2, R> => flatMap(self, (a) => refinement(a) ? succeed(a) : failCause(orFailWith(a))))

/**
 * Filter the specified effect with the provided function, failing with specified
 * error if the predicate fails.
 *
 * In addition to the filtering capabilities discussed earlier, you have the option to further
 * refine and narrow down the type of the success channel by providing a
 *
 * @since 3.4.0
 * @experimental
 * @category filtering & conditionals
 */
export const filterOrFail: {
  <A, B extends A, E2>(
    refinement: Refinement<A, B>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: Micro<A, E, R>) => Micro<B, E2 | E, R>
  <A, E2>(
    predicate: Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: Micro<A, E, R>) => Micro<A, E2 | E, R>
  <A, E, R, B extends A, E2>(
    self: Micro<A, E, R>,
    refinement: Refinement<A, B>,
    orFailWith: (a: A) => E2
  ): Micro<B, E | E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, predicate: Predicate<A>, orFailWith: (a: A) => E2): Micro<A, E | E2, R>
} = dual((args) => isMicro(args[0]), <A, E, R, B extends A, E2>(
  self: Micro<A, E, R>,
  refinement: Refinement<A, B>,
  orFailWith: (a: A) => E2
): Micro<B, E | E2, R> => flatMap(self, (a) => refinement(a) ? succeed(a) : fail(orFailWith(a))))

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @since 3.4.0
 * @experimental
 * @category filtering & conditionals
 */
export const when: {
  <E2 = never, R2 = never>(
    condition: LazyArg<boolean> | Micro<boolean, E2, R2>
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<Option.Option<A>, E | E2, R | R2>
  <A, E, R, E2 = never, R2 = never>(
    self: Micro<A, E, R>,
    condition: LazyArg<boolean> | Micro<boolean, E2, R2>
  ): Micro<Option.Option<A>, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, E2 = never, R2 = never>(
    self: Micro<A, E, R>,
    condition: LazyArg<boolean> | Micro<boolean, E2, R2>
  ): Micro<Option.Option<A>, E | E2, R | R2> =>
    flatMap(isMicro(condition) ? condition : sync(condition), (pass) => pass ? asSome(self) : succeed(Option.none()))
)

// ----------------------------------------------------------------------------
// repetition
// ----------------------------------------------------------------------------

/**
 * Repeat the given `Micro` using the provided options.
 *
 * The `while` predicate will be checked after each iteration, and can use the
 * fall `MicroExit` of the effect to determine if the repetition should continue.
 *
 * @since 3.4.6
 * @experimental
 * @category repetition
 */
export const repeatExit: {
  <A, E>(options: {
    while: Predicate<MicroExit<A, E>>
    times?: number | undefined
    schedule?: MicroSchedule | undefined
  }): <R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, options: {
    while: Predicate<MicroExit<A, E>>
    times?: number | undefined
    schedule?: MicroSchedule | undefined
  }): Micro<A, E, R>
} = dual(2, <A, E, R>(self: Micro<A, E, R>, options: {
  while: Predicate<MicroExit<A, E>>
  times?: number | undefined
  schedule?: MicroSchedule | undefined
}): Micro<A, E, R> =>
  make(function(env, onExit) {
    const startedAt = options.schedule ? Date.now() : 0
    let attempt = 0
    self[runSymbol](env, function loop(exit) {
      if (options.while !== undefined && !options.while(exit)) {
        return onExit(exit)
      } else if (options.times !== undefined && attempt >= options.times) {
        return onExit(exit)
      }
      attempt++
      let delayEffect = yieldNow
      if (options.schedule !== undefined) {
        const elapsed = Date.now() - startedAt
        const duration = options.schedule(attempt, elapsed)
        if (Option.isNone(duration)) {
          return onExit(exit)
        }
        delayEffect = sleep(duration.value)
      }
      delayEffect[runSymbol](env, function(exit) {
        if (exit._tag === "Left") {
          return onExit(exit as MicroExit<never, never>)
        }
        self[runSymbol](env, loop)
      })
    })
  }))

/**
 * Repeat the given `Micro` effect using the provided options. Only successful
 * results will be repeated.
 *
 * @since 3.4.0
 * @experimental
 * @category repetition
 */
export const repeat: {
  <A, E>(
    options?: {
      while?: Predicate<A> | undefined
      times?: number | undefined
      schedule?: MicroSchedule | undefined
    } | undefined
  ): <R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(
    self: Micro<A, E, R>,
    options?: {
      while?: Predicate<A> | undefined
      times?: number | undefined
      schedule?: MicroSchedule | undefined
    } | undefined
  ): Micro<A, E, R>
} = dual((args) => isMicro(args[0]), <A, E, R>(
  self: Micro<A, E, R>,
  options?: {
    while?: Predicate<A> | undefined
    times?: number | undefined
    schedule?: MicroSchedule | undefined
  } | undefined
): Micro<A, E, R> =>
  repeatExit(self, {
    ...options,
    while: (exit) => exit._tag === "Right" && (options?.while === undefined || options.while(exit.right))
  }))

/**
 * Repeat the given `Micro` effect forever, only stopping if the effect fails.
 *
 * @since 3.4.0
 * @experimental
 * @category repetition
 */
export const forever = <A, E, R>(self: Micro<A, E, R>): Micro<never, E, R> => repeat(self) as any

// ----------------------------------------------------------------------------
// scheduling
// ----------------------------------------------------------------------------

/**
 * The `MicroSchedule` type represents a function that can be used to calculate
 * the delay between repeats.
 *
 * The function takes the current attempt number and the elapsed time since the
 * first attempt, and returns the delay for the next attempt. If the function
 * returns `None`, the repetition will stop.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export type MicroSchedule = (attempt: number, elapsed: number) => Option.Option<number>

/**
 * Create a `MicroSchedule` that will stop repeating after the specified number
 * of attempts.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleRecurs = (n: number): MicroSchedule => (attempt) => attempt <= n ? Option.some(0) : Option.none()

/**
 * Create a `MicroSchedule` that will generate a constant delay.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleSpaced = (millis: number): MicroSchedule => () => Option.some(millis)

/**
 * Create a `MicroSchedule` that will generate a delay with an exponential backoff.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleExponential = (baseMillis: number, factor = 2): MicroSchedule => (attempt) =>
  Option.some(Math.pow(factor, attempt) * baseMillis)

/**
 * Returns a new `MicroSchedule` with an added calculated delay to each delay
 * returned by this schedule.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleAddDelay: {
  (f: () => number): (self: MicroSchedule) => MicroSchedule
  (self: MicroSchedule, f: () => number): MicroSchedule
} = dual(
  2,
  (self: MicroSchedule, f: () => number): MicroSchedule => (attempt, elapsed) =>
    Option.map(self(attempt, elapsed), (duration) => duration + f())
)

/**
 * Transform a `MicroSchedule` to one that will have a delay that will never exceed
 * the specified maximum.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleWithMaxDelay: {
  (max: number): (self: MicroSchedule) => MicroSchedule
  (self: MicroSchedule, max: number): MicroSchedule
} = dual(
  2,
  (self: MicroSchedule, max: number): MicroSchedule => (attempt, elapsed) =>
    Option.map(self(attempt, elapsed), (duration) => Math.min(duration, max))
)

/**
 * Transform a `MicroSchedule` to one that will stop repeating after the specified
 * amount of time.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleWithMaxElapsed: {
  (max: number): (self: MicroSchedule) => MicroSchedule
  (self: MicroSchedule, max: number): MicroSchedule
} = dual(
  2,
  (self: MicroSchedule, max: number): MicroSchedule => (attempt, elapsed) =>
    elapsed < max ? self(attempt, elapsed) : Option.none()
)

/**
 * Combines two `MicroSchedule`s, by recurring if either schedule wants to
 * recur, using the minimum of the two durations between recurrences.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleUnion: {
  (that: MicroSchedule): (self: MicroSchedule) => MicroSchedule
  (self: MicroSchedule, that: MicroSchedule): MicroSchedule
} = dual(
  2,
  (self: MicroSchedule, that: MicroSchedule): MicroSchedule => (attempt, elapsed) =>
    Option.zipWith(self(attempt, elapsed), that(attempt, elapsed), (d1, d2) => Math.min(d1, d2))
)

/**
 * Combines two `MicroSchedule`s, by recurring only if both schedules want to
 * recur, using the maximum of the two durations between recurrences.
 *
 * @since 3.4.6
 * @experimental
 * @category scheduling
 */
export const scheduleIntersect: {
  (that: MicroSchedule): (self: MicroSchedule) => MicroSchedule
  (self: MicroSchedule, that: MicroSchedule): MicroSchedule
} = dual(
  2,
  (self: MicroSchedule, that: MicroSchedule): MicroSchedule => (attempt, elapsed) =>
    Option.zipWith(self(attempt, elapsed), that(attempt, elapsed), (d1, d2) => Math.max(d1, d2))
)

// ----------------------------------------------------------------------------
// error handling
// ----------------------------------------------------------------------------

/**
 * Catch the full `MicroCause` object of the given `Micro` effect, allowing you to
 * recover from any kind of cause.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const catchAllCause: {
  <E, B, E2, R2>(
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2> => catchCauseIf(self, constTrue, f) as Micro<A | B, E2, R | R2>
)

/**
 * Selectively catch a `MicroCause` object of the given `Micro` effect,
 * using the provided predicate to determine if the failure should be caught.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const catchCauseIf: {
  <E, B, E2, R2, EB extends MicroCause<E>>(
    refinement: Refinement<MicroCause<E>, EB>,
    f: (cause: EB) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, Exclude<E, MicroCause.Error<EB>> | E2, R | R2>
  <E, B, E2, R2>(
    predicate: Predicate<MicroCause<NoInfer<E>>>,
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E | E2, R | R2>
  <A, E, R, B, E2, R2, EB extends MicroCause<E>>(
    self: Micro<A, E, R>,
    refinement: Refinement<MicroCause<E>, EB>,
    f: (cause: EB) => Micro<B, E2, R2>
  ): Micro<A | B, Exclude<E, MicroCause.Error<EB>> | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    predicate: Predicate<MicroCause<NoInfer<E>>>,
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): Micro<A | B, E | E2, R | R2>
} = dual(3, <A, E, R, B, E2, R2>(
  self: Micro<A, E, R>,
  predicate: Predicate<MicroCause<E>>,
  f: (cause: MicroCause<E>) => Micro<B, E2, R2>
): Micro<A | B, E | E2, R | R2> =>
  make(function(env, onExit) {
    self[runSymbol](env, function(exit) {
      if (exit._tag === "Right" || !predicate(exit.left)) {
        onExit(exit)
      } else {
        f(exit.left)[runSymbol](env, onExit)
      }
    })
  }))

/**
 * Catch the error of the given `Micro` effect, allowing you to recover from it.
 *
 * It only catches expected (`MicroCause.Fail`) errors.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const catchAll: {
  <E, B, E2, R2>(
    f: (e: NoInfer<E>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (e: NoInfer<E>) => Micro<B, E2, R2>): Micro<A | B, E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (a: NoInfer<E>) => Micro<B, E2, R2>
  ): Micro<A | B, E2, R | R2> => catchAllCause(self, (cause) => causeIsFail(cause) ? f(cause.error) : failCause(cause))
)

/**
 * Catch any unexpected errors of the given `Micro` effect, allowing you to recover from them.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const catchAllDefect: {
  <E, B, E2, R2>(
    f: (defect: unknown) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A | B, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (defect: unknown) => Micro<B, E2, R2>): Micro<A | B, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (defect: unknown) => Micro<B, E2, R2>): Micro<A | B, E | E2, R | R2> =>
    catchCauseIf(self, causeIsDie, (die) => f(die.defect))
)

/**
 * Perform a side effect using the full `MicroCause` object of the given `Micro`.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const tapErrorCause: {
  <E, B, E2, R2>(
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): Micro<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    f: (cause: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): Micro<A, E | E2, R | R2> => tapErrorCauseIf(self, constTrue, f)
)

/**
 * Perform a side effect using if a `MicroCause` object matches the specified
 * predicate.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const tapErrorCauseIf: {
  <E, B, E2, R2, EB extends MicroCause<E>>(
    refinement: Refinement<MicroCause<E>, EB>,
    f: (a: EB) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <E, B, E2, R2>(
    predicate: (cause: NoInfer<MicroCause<E>>) => boolean,
    f: (a: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2, EB extends MicroCause<E>>(
    self: Micro<A, E, R>,
    refinement: Refinement<MicroCause<E>, EB>,
    f: (a: EB) => Micro<B, E2, R2>
  ): Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Micro<A, E, R>,
    predicate: (cause: NoInfer<MicroCause<E>>) => boolean,
    f: (a: NoInfer<MicroCause<E>>) => Micro<B, E2, R2>
  ): Micro<A, E | E2, R | R2>
} = dual(
  3,
  <A, E, R, B, E2, R2, EB extends MicroCause<E>>(
    self: Micro<A, E, R>,
    refinement: Refinement<MicroCause<E>, EB>,
    f: (a: EB) => Micro<B, E2, R2>
  ): Micro<A, E | E2, R | R2> => catchCauseIf(self, refinement, (cause) => andThen(f(cause), failCause(cause)))
)

/**
 * Perform a side effect from expected errors of the given `Micro`.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const tapError: {
  <E, B, E2, R2>(
    f: (e: NoInfer<E>) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (e: NoInfer<E>) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (e: NoInfer<E>) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2> =>
    tapErrorCauseIf(self, causeIsFail, (fail) => f(fail.error))
)

/**
 * Perform a side effect from unexpected errors of the given `Micro`.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const tapDefect: {
  <E, B, E2, R2>(
    f: (defect: unknown) => Micro<B, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A, E | E2, R | R2>
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (defect: unknown) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, B, E2, R2>(self: Micro<A, E, R>, f: (defect: unknown) => Micro<B, E2, R2>): Micro<A, E | E2, R | R2> =>
    tapErrorCauseIf(self, causeIsDie, (die) => f(die.defect))
)

/**
 * Catch any expected errors that match the specified predicate.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const catchIf: {
  <E, EB extends E, A2, E2, R2>(
    refinement: Refinement<NoInfer<E>, EB>,
    f: (e: EB) => Micro<A2, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A2 | A, E2 | Exclude<E, EB>, R2 | R>
  <E, A2, E2, R2>(
    predicate: Predicate<NoInfer<E>>,
    f: (e: NoInfer<E>) => Micro<A2, E2, R2>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A2 | A, E | E2, R2 | R>
  <A, E, R, EB extends E, A2, E2, R2>(
    self: Micro<A, E, R>,
    refinement: Refinement<E, EB>,
    f: (e: EB) => Micro<A2, E2, R2>
  ): Micro<A | A2, E2 | Exclude<E, EB>, R | R2>
  <A, E, R, A2, E2, R2>(
    self: Micro<A, E, R>,
    predicate: Predicate<E>,
    f: (e: E) => Micro<A2, E2, R2>
  ): Micro<A | A2, E | E2, R | R2>
} = dual(
  3,
  <A, E, R, A2, E2, R2>(
    self: Micro<A, E, R>,
    predicate: Predicate<E>,
    f: (e: E) => Micro<A2, E2, R2>
  ): Micro<A | A2, E | E2, R | R2> =>
    catchCauseIf(
      self,
      (f): f is MicroCause.Fail<E> => causeIsFail(f) && predicate(f.error),
      (fail) => f(fail.error)
    )
)

/**
 * Recovers from the specified tagged error.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, A1, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Micro<A1, E1, R1>
  ): <A, R>(self: Micro<A, E, R>) => Micro<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1, A1>(
    self: Micro<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Micro<A1, E1, R1>
  ): Micro<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = dual(3, <A, E, R, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1, A1>(
  self: Micro<A, E, R>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Micro<A1, E1, R1>
): Micro<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1> =>
  catchIf(self, isTagged(k) as Refinement<E, Extract<E, { _tag: K }>>, f) as any)

/**
 * Transform the full `MicroCause` object of the given `Micro` effect.
 *
 * @since 3.4.6
 * @experimental
 * @category error handling
 */
export const mapErrorCause: {
  <E, E2>(f: (e: MicroCause<E>) => MicroCause<E2>): <A, R>(self: Micro<A, E, R>) => Micro<A, E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, f: (e: MicroCause<E>) => MicroCause<E2>): Micro<A, E2, R>
} = dual(
  2,
  <A, E, R, E2>(self: Micro<A, E, R>, f: (e: MicroCause<E>) => MicroCause<E2>): Micro<A, E2, R> =>
    catchAllCause(self, (cause) => failCause(f(cause)))
)

/**
 * Transform any expected errors of the given `Micro` effect.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(self: Micro<A, E, R>) => Micro<A, E2, R>
  <A, E, R, E2>(self: Micro<A, E, R>, f: (e: E) => E2): Micro<A, E2, R>
} = dual(
  2,
  <A, E, R, E2>(self: Micro<A, E, R>, f: (e: E) => E2): Micro<A, E2, R> => catchAll(self, (error) => fail(f(error)))
)

/**
 * Elevate any expected errors of the given `Micro` effect to unexpected errors,
 * resulting in an error type of `never`.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const orDie = <A, E, R>(self: Micro<A, E, R>): Micro<A, never, R> => catchAll(self, die)

/**
 * Recover from all errors by succeeding with the given value.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const orElseSucceed: {
  <B>(f: LazyArg<B>): <A, E, R>(self: Micro<A, E, R>) => Micro<A | B, never, R>
  <A, E, R, B>(self: Micro<A, E, R>, f: LazyArg<B>): Micro<A | B, never, R>
} = dual(
  2,
  <A, E, R, B>(self: Micro<A, E, R>, f: LazyArg<B>): Micro<A | B, never, R> => catchAll(self, (_) => sync(f))
)

/**
 * Ignore any expected errors of the given `Micro` effect, returning `void`.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const ignore = <A, E, R>(self: Micro<A, E, R>): Micro<void, never, R> =>
  matchEffect(self, { onFailure: (_) => void_, onSuccess: (_) => void_ })

/**
 * Ignore any expected errors of the given `Micro` effect, returning `void`.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const ignoreLogged = <A, E, R>(self: Micro<A, E, R>): Micro<void, never, R> =>
  matchEffect(self, {
    onFailure: (error) => sync(() => console.error(error)),
    onSuccess: (_) => void_
  })

/**
 * Replace the success value of the given `Micro` effect with an `Option`,
 * wrapping the success value in `Some` and returning `None` if the effect fails
 * with an expected error.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const option = <A, E, R>(self: Micro<A, E, R>): Micro<Option.Option<A>, never, R> =>
  match(self, { onFailure: (_) => Option.none(), onSuccess: Option.some })

/**
 * Replace the success value of the given `Micro` effect with an `Either`,
 * wrapping the success value in `Right` and wrapping any expected errors with
 * a `Left`.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const either = <A, E, R>(self: Micro<A, E, R>): Micro<Either.Either<A, E>, never, R> =>
  match(self, { onFailure: Either.left, onSuccess: Either.right })

/**
 * Retry the given `Micro` effect using the provided options.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const retry: {
  <A, E>(
    options?: {
      while?: Predicate<E> | undefined
      times?: number | undefined
      schedule?: MicroSchedule | undefined
    } | undefined
  ): <R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(
    self: Micro<A, E, R>,
    options?: {
      while?: Predicate<E> | undefined
      times?: number | undefined
      schedule?: MicroSchedule | undefined
    } | undefined
  ): Micro<A, E, R>
} = dual((args) => isMicro(args[0]), <A, E, R>(
  self: Micro<A, E, R>,
  options?: {
    while?: Predicate<E> | undefined
    times?: number | undefined
    schedule?: MicroSchedule | undefined
  } | undefined
): Micro<A, E, R> =>
  repeatExit(self, {
    ...options,
    while: (exit) =>
      exit._tag === "Left" && exit.left._tag === "Fail" &&
      (options?.while === undefined || options.while(exit.left.error))
  }))

/**
 * Add a stack trace to any failures that occur in the effect. The trace will be
 * added to the `traces` field of the `MicroCause` object.
 *
 * @since 3.4.0
 * @experimental
 * @category error handling
 */
export const withTrace: {
  (name: string): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, name: string): Micro<A, E, R>
} = function() {
  const prevLimit = globalThis.Error.stackTraceLimit
  globalThis.Error.stackTraceLimit = 2
  const error = new globalThis.Error()
  globalThis.Error.stackTraceLimit = prevLimit
  function generate(name: string, cause: MicroCause<any>) {
    const stack = error.stack
    if (!stack) {
      return cause
    }
    const line = stack.split("\n")[2]?.trim().replace(/^at /, "")
    if (!line) {
      return cause
    }
    const lineMatch = line.match(/\((.*)\)$/)
    return causeWithTrace(cause, `at ${name} (${lineMatch ? lineMatch[1] : line})`)
  }
  const f = (name: string) => (self: Micro<any, any, any>) =>
    unsafeMakeOptions(function(env, onExit) {
      self[runSymbol](env, function(exit) {
        onExit(exit._tag === "Left" ? Either.left(generate(name, exit.left)) : exit)
      })
    }, false)
  if (arguments.length === 2) {
    return f(arguments[1])(arguments[0])
  }
  return f(arguments[0])
} as any

// ----------------------------------------------------------------------------
// pattern matching
// ----------------------------------------------------------------------------

/**
 * @since 3.4.6
 * @experimental
 * @category pattern matching
 */
export const matchCauseEffect: {
  <E, A2, E2, R2, A, A3, E3, R3>(
    options: {
      readonly onFailure: (cause: MicroCause<E>) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, E2 | E3, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (cause: MicroCause<E>) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R>
} = dual(
  2,
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (cause: MicroCause<E>) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R> =>
    make(function(env, onExit) {
      self[runSymbol](env, function(exit) {
        try {
          const next = exit._tag === "Left" ? options.onFailure(exit.left) : options.onSuccess(exit.right)
          next[runSymbol](env, onExit)
        } catch (err) {
          onExit(exitDie(err))
        }
      })
    })
)

/**
 * @since 3.4.6
 * @experimental
 * @category pattern matching
 */
export const matchCause: {
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (cause: MicroCause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, never, R>
  <A, E, R, A2, A3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (cause: MicroCause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ): Micro<A2 | A3, never, R>
} = dual(
  2,
  <A, E, R, A2, A3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (cause: MicroCause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ): Micro<A2 | A3, never, R> =>
    matchCauseEffect(self, {
      onFailure: (cause) => sync(() => options.onFailure(cause)),
      onSuccess: (value) => sync(() => options.onSuccess(value))
    })
)

/**
 * @since 3.4.6
 * @experimental
 * @category pattern matching
 */
export const matchEffect: {
  <E, A2, E2, R2, A, A3, E3, R3>(
    options: {
      readonly onFailure: (e: E) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, E2 | E3, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (e: E) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R>
} = dual(
  2,
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (e: E) => Micro<A2, E2, R2>
      readonly onSuccess: (a: A) => Micro<A3, E3, R3>
    }
  ): Micro<A2 | A3, E2 | E3, R2 | R3 | R> =>
    matchCauseEffect(self, {
      onFailure: (cause) => cause._tag === "Fail" ? options.onFailure(cause.error) : failCause(cause),
      onSuccess: options.onSuccess
    })
)

/**
 * @since 3.4.0
 * @experimental
 * @category pattern matching
 */
export const match: {
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): <R>(self: Micro<A, E, R>) => Micro<A2 | A3, never, R>
  <A, E, R, A2, A3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): Micro<A2 | A3, never, R>
} = dual(
  2,
  <A, E, R, A2, A3>(
    self: Micro<A, E, R>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): Micro<A2 | A3, never, R> =>
    matchEffect(self, {
      onFailure: (error) => sync(() => options.onFailure(error)),
      onSuccess: (value) => sync(() => options.onSuccess(value))
    })
)

// ----------------------------------------------------------------------------
// delays & timeouts
// ----------------------------------------------------------------------------

/**
 * Create a `Micro` effect that will sleep for the specified duration.
 *
 * @since 3.4.0
 * @experimental
 * @category delays & timeouts
 */
export const sleep = (millis: number): Micro<void> =>
  async(function(resume) {
    const timeout = setTimeout(function() {
      resume(void_)
    }, millis)
    return sync(() => {
      return clearTimeout(timeout)
    })
  })

/**
 * Returns an effect that will delay the execution of this effect by the
 * specified duration.
 *
 * @since 3.4.0
 * @experimental
 * @category delays & timeouts
 */
export const delay: {
  (millis: number): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, R>
  <A, E, R>(self: Micro<A, E, R>, millis: number): Micro<A, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, millis: number): Micro<A, E, R> => andThen(sleep(millis), self)
)

/**
 * Returns an effect that will timeout this effect, that will execute the
 * fallback effect if the timeout elapses before the effect has produced a value.
 *
 * If the timeout elapses, the running effect will be safely interrupted.
 *
 * @since 3.4.0
 * @experimental
 * @category delays & timeouts
 */
export const timeoutOrElse: {
  <A2, E2, R2>(options: {
    readonly duration: number
    readonly onTimeout: LazyArg<Micro<A2, E2, R2>>
  }): <A, E, R>(self: Micro<A, E, R>) => Micro<A | A2, E | E2, R | R2>
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, options: {
    readonly duration: number
    readonly onTimeout: LazyArg<Micro<A2, E2, R2>>
  }): Micro<A | A2, E | E2, R | R2>
} = dual(
  2,
  <A, E, R, A2, E2, R2>(self: Micro<A, E, R>, options: {
    readonly duration: number
    readonly onTimeout: LazyArg<Micro<A2, E2, R2>>
  }): Micro<A | A2, E | E2, R | R2> =>
    raceFirst(self, andThen(interruptible(sleep(options.duration)), options.onTimeout))
)

/**
 * Returns an effect that will timeout this effect, that will fail with a
 * `TimeoutException` if the timeout elapses before the effect has produced a
 * value.
 *
 * If the timeout elapses, the running effect will be safely interrupted.
 *
 * @since 3.4.0
 * @experimental
 * @category delays & timeouts
 */
export const timeout: {
  (millis: number): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E | TimeoutException, R>
  <A, E, R>(self: Micro<A, E, R>, millis: number): Micro<A, E | TimeoutException, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, millis: number): Micro<A, E | TimeoutException, R> =>
    timeoutOrElse(self, { duration: millis, onTimeout: () => fail(new TimeoutException()) })
)

/**
 * Returns an effect that will timeout this effect, succeeding with a `None`
 * if the timeout elapses before the effect has produced a value; and `Some` of
 * the produced value otherwise.
 *
 * If the timeout elapses, the running effect will be safely interrupted.
 *
 * @since 3.4.0
 * @experimental
 * @category delays & timeouts
 */
export const timeoutOption: {
  (millis: number): <A, E, R>(self: Micro<A, E, R>) => Micro<Option.Option<A>, E, R>
  <A, E, R>(self: Micro<A, E, R>, millis: number): Micro<Option.Option<A>, E, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, millis: number): Micro<Option.Option<A>, E, R> =>
    raceFirst(
      asSome(self),
      as(interruptible(sleep(millis)), Option.none())
    )
)

// ----------------------------------------------------------------------------
// resources & finalization
// ----------------------------------------------------------------------------

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const MicroScopeTypeId: unique symbol = Symbol.for("effect/Micro/MicroScope")

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export type MicroScopeTypeId = typeof MicroScopeTypeId

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export interface MicroScope {
  readonly [MicroScopeTypeId]: MicroScopeTypeId
  readonly addFinalizer: (finalizer: (exit: MicroExit<unknown, unknown>) => Micro<void>) => Micro<void>
  readonly fork: Micro<MicroScope.Closeable>
}

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export declare namespace MicroScope {
  /**
   * @since 3.4.0
   * @experimental
   * @category resources & finalization
   */
  export interface Closeable extends MicroScope {
    readonly close: (exit: MicroExit<any, any>) => Micro<void>
  }
}

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const MicroScope: Context.Tag<MicroScope, MicroScope> = Context.GenericTag<MicroScope>("effect/Micro/MicroScope")

class MicroScopeImpl implements MicroScope.Closeable {
  readonly [MicroScopeTypeId]: MicroScopeTypeId
  state: {
    readonly _tag: "Open"
    readonly finalizers: Set<(exit: MicroExit<any, any>) => Micro<void>>
  } | {
    readonly _tag: "Closed"
    readonly exit: MicroExit<any, any>
  } = { _tag: "Open", finalizers: new Set() }

  constructor() {
    this[MicroScopeTypeId] = MicroScopeTypeId
  }

  unsafeAddFinalizer(finalizer: (exit: MicroExit<any, any>) => Micro<void>): void {
    if (this.state._tag === "Open") {
      this.state.finalizers.add(finalizer)
    }
  }
  addFinalizer(finalizer: (exit: MicroExit<any, any>) => Micro<void>): Micro<void> {
    return suspend(() => {
      if (this.state._tag === "Open") {
        this.state.finalizers.add(finalizer)
        return void_
      }
      return finalizer(this.state.exit)
    })
  }
  unsafeRemoveFinalizer(finalizer: (exit: MicroExit<any, any>) => Micro<void>): void {
    if (this.state._tag === "Open") {
      this.state.finalizers.delete(finalizer)
    }
  }
  close(microExit: MicroExit<any, any>): Micro<void> {
    return suspend(() => {
      if (this.state._tag === "Open") {
        const finalizers = Array.from(this.state.finalizers).reverse()
        this.state = { _tag: "Closed", exit: microExit }
        return flatMap(
          forEach(finalizers, (finalizer) => exit(finalizer(microExit))),
          (exits) => asVoid(fromExit(Either.all(exits)))
        )
      }
      return void_
    })
  }
  get fork() {
    return sync(() => {
      const newScope = new MicroScopeImpl()
      if (this.state._tag === "Closed") {
        newScope.state = this.state
        return newScope
      }
      function fin(exit: MicroExit<any, any>) {
        return newScope.close(exit)
      }
      this.state.finalizers.add(fin)
      newScope.unsafeAddFinalizer((_) => sync(() => this.unsafeRemoveFinalizer(fin)))
      return newScope
    })
  }
}

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const scopeMake: Micro<MicroScope.Closeable> = sync(() => new MicroScopeImpl())

/**
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const scopeUnsafeMake = (): MicroScope.Closeable => new MicroScopeImpl()

/**
 * Access the current `MicroScope`.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const scope: Micro<MicroScope, never, MicroScope> = service(MicroScope)

/**
 * Provide a `MicroScope` to an effect.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const provideScope: {
  (scope: MicroScope): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E, Exclude<R, MicroScope>>
  <A, E, R>(self: Micro<A, E, R>, scope: MicroScope): Micro<A, E, Exclude<R, MicroScope>>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, scope: MicroScope): Micro<A, E, Exclude<R, MicroScope>> =>
    provideService(self, MicroScope, scope)
)

/**
 * Provide a `MicroScope` to the given effect, closing it after the effect has
 * finished executing.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const scoped = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, Exclude<R, MicroScope>> =>
  suspend(function() {
    const scope = new MicroScopeImpl()
    return onExit(provideService(self, MicroScope, scope), (exit) => scope.close(exit))
  })

/**
 * Create a resource with a cleanup `Micro` effect, ensuring the cleanup is
 * executed when the `MicroScope` is closed.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const acquireRelease = <A, E, R>(
  acquire: Micro<A, E, R>,
  release: (a: A, exit: MicroExit<unknown, unknown>) => Micro<void>
): Micro<A, E, R | MicroScope> =>
  uninterruptible(flatMap(
    scope,
    (scope) => tap(acquire, (a) => scope.addFinalizer((exit) => release(a, exit)))
  ))

/**
 * Add a finalizer to the current `MicroScope`.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const addFinalizer = (
  finalizer: (exit: MicroExit<unknown, unknown>) => Micro<void>
): Micro<void, never, MicroScope> => flatMap(scope, (scope) => scope.addFinalizer(finalizer))

/**
 * When the `Micro` effect is completed, run the given finalizer effect with the
 * `MicroExit` of the executed effect.
 *
 * @since 3.4.6
 * @experimental
 * @category resources & finalization
 */
export const onExit: {
  <A, E, XE, XR>(
    f: (exit: MicroExit<A, E>) => Micro<void, XE, XR>
  ): <R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Micro<A, E, R>, f: (exit: MicroExit<A, E>) => Micro<void, XE, XR>): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(
    self: Micro<A, E, R>,
    f: (exit: MicroExit<A, E>) => Micro<void, XE, XR>
  ): Micro<A, E | XE, R | XR> => onExitIf(self, constTrue, f)
)

/**
 * When the `Micro` effect is completed, run the given finalizer effect if it
 * matches the specified predicate.
 *
 * @since 3.4.6
 * @experimental
 * @category resources & finalization
 */
export const onExitIf: {
  <A, E, XE, XR, B extends MicroExit<A, E>>(
    refinement: Refinement<MicroExit<A, E>, B>,
    f: (exit: B) => Micro<void, XE, XR>
  ): <R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, XE, XR>(
    predicate: Predicate<MicroExit<NoInfer<A>, NoInfer<E>>>,
    f: (exit: MicroExit<NoInfer<A>, NoInfer<E>>) => Micro<void, XE, XR>
  ): <R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR, B extends MicroExit<A, E>>(
    self: Micro<A, E, R>,
    refinement: Refinement<MicroExit<A, E>, B>,
    f: (exit: B) => Micro<void, XE, XR>
  ): Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(
    self: Micro<A, E, R>,
    predicate: Predicate<MicroExit<NoInfer<A>, NoInfer<E>>>,
    f: (exit: MicroExit<NoInfer<A>, NoInfer<E>>) => Micro<void, XE, XR>
  ): Micro<A, E | XE, R | XR>
} = dual(
  3,
  <A, E, R, XE, XR, B extends MicroExit<A, E>>(
    self: Micro<A, E, R>,
    refinement: Refinement<MicroExit<A, E>, B>,
    f: (exit: B) => Micro<void, XE, XR>
  ): Micro<A, E | XE, R | XR> =>
    uninterruptibleMask((restore) =>
      make(function(env, onExit) {
        restore(self)[runSymbol](env, function(exit) {
          if (!refinement(exit)) {
            return onExit(exit)
          }
          f(exit)[runSymbol](env, function(finalizerExit) {
            if (finalizerExit._tag === "Left") {
              return onExit(finalizerExit as MicroExit<never, XE>)
            }
            onExit(exit)
          })
        })
      })
    )
)

/**
 * Regardless of the result of the this `Micro` effect, run the finalizer effect.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const ensuring: {
  <XE, XR>(
    finalizer: Micro<void, XE, XR>
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Micro<A, E, R>, finalizer: Micro<void, XE, XR>): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(self: Micro<A, E, R>, finalizer: Micro<void, XE, XR>): Micro<A, E | XE, R | XR> =>
    onExit(self, (_) => finalizer)
)

/**
 * When the `Micro` effect fails, run the given finalizer effect with the
 * `MicroCause` of the executed effect.
 *
 * @since 3.4.6
 * @experimental
 * @category resources & finalization
 */
export const onError: {
  <A, E, XE, XR>(
    f: (cause: MicroCause<NoInfer<E>>) => Micro<void, XE, XR>
  ): <R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(
    self: Micro<A, E, R>,
    f: (cause: MicroCause<NoInfer<E>>) => Micro<void, XE, XR>
  ): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(
    self: Micro<A, E, R>,
    f: (cause: MicroCause<NoInfer<E>>) => Micro<void, XE, XR>
  ): Micro<A, E | XE, R | XR> => onExitIf(self, exitIsFailure, (exit) => f(exit.left))
)

/**
 * If this `Micro` effect is aborted, run the finalizer effect.
 *
 * @since 3.4.6
 * @experimental
 * @category resources & finalization
 */
export const onInterrupt: {
  <XE, XR>(
    finalizer: Micro<void, XE, XR>
  ): <A, E, R>(self: Micro<A, E, R>) => Micro<A, E | XE, R | XR>
  <A, E, R, XE, XR>(self: Micro<A, E, R>, finalizer: Micro<void, XE, XR>): Micro<A, E | XE, R | XR>
} = dual(
  2,
  <A, E, R, XE, XR>(self: Micro<A, E, R>, finalizer: Micro<void, XE, XR>): Micro<A, E | XE, R | XR> =>
    onExitIf(self, exitIsInterrupt, (_) => finalizer)
)

/**
 * Acquire a resource, use it, and then release the resource when the `use`
 * effect has completed.
 *
 * @since 3.4.0
 * @experimental
 * @category resources & finalization
 */
export const acquireUseRelease = <Resource, E, R, A, E2, R2, E3, R3>(
  acquire: Micro<Resource, E, R>,
  use: (a: Resource) => Micro<A, E2, R2>,
  release: (a: Resource, exit: MicroExit<A, E2>) => Micro<void, E3, R3>
): Micro<A, E | E2 | E3, R | R2 | R3> =>
  uninterruptibleMask((restore) =>
    flatMap(
      acquire,
      (a) =>
        flatMap(
          exit(restore(use(a))),
          (exit) => andThen(release(a, exit), fromExit(exit))
        )
    )
  )

// ----------------------------------------------------------------------------
// interruption
// ----------------------------------------------------------------------------

/**
 * Abort the current `Micro` effect.
 *
 * @since 3.4.6
 * @experimental
 * @category interruption
 */
export const interrupt: Micro<never> = make(function(env, onExit) {
  const controller = envGet(env, currentAbortController)
  controller.abort()
  onExit(exitInterrupt)
})

/**
 * Wrap the given `Micro` effect in an uninterruptible region, preventing the
 * effect from being aborted.
 *
 * @since 3.4.0
 * @experimental
 * @category interruption
 */
export const uninterruptible = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, R> =>
  unsafeMakeOptions(function(env, onExit) {
    const nextEnv = envMutate(env, function(env) {
      env[currentInterruptible.key] = false
      env[currentAbortSignal.key] = new AbortController().signal
      return env
    })
    self[runSymbol](nextEnv, onExit)
  }, false)

/**
 * Wrap the given `Micro` effect in an uninterruptible region, preventing the
 * effect from being aborted.
 *
 * You can use the `restore` function to restore a `Micro` effect to the
 * interruptibility state before the `uninterruptibleMask` was applied.
 *
 * @since 3.4.0
 * @experimental
 * @category interruption
 * @example
 * import * as Micro from "effect/Micro"
 *
 * Micro.uninterruptibleMask((restore) =>
 *   Micro.sleep(1000).pipe( // uninterruptible
 *     Micro.andThen(restore(Micro.sleep(1000))) // interruptible
 *   )
 * )
 */
export const uninterruptibleMask = <A, E, R>(
  f: (restore: <A, E, R>(effect: Micro<A, E, R>) => Micro<A, E, R>) => Micro<A, E, R>
): Micro<A, E, R> =>
  unsafeMakeOptions((env, onExit) => {
    const isInterruptible = envGet(env, currentInterruptible)
    const effect = isInterruptible ? f(interruptible) : f(identity)
    const nextEnv = isInterruptible ?
      envMutate(env, function(env) {
        env[currentInterruptible.key] = false
        env[currentAbortSignal.key] = new AbortController().signal
        return env
      }) :
      env
    effect[runSymbol](nextEnv, onExit)
  }, false)

/**
 * Wrap the given `Micro` effect in an interruptible region, allowing the effect
 * to be aborted.
 *
 * @since 3.4.0
 * @experimental
 * @category interruption
 */
export const interruptible = <A, E, R>(self: Micro<A, E, R>): Micro<A, E, R> =>
  make((env, onExit) => {
    const isInterruptible = envGet(env, currentInterruptible)
    let newEnv = env
    if (!isInterruptible) {
      const controller = envGet(env, currentAbortController)
      newEnv = envMutate(env, function(env) {
        env[currentInterruptible.key] = true
        env[currentAbortSignal.key] = controller.signal
        return env
      })
    }
    self[runSymbol](newEnv, onExit)
  })

// ========================================================================
// collecting & elements
// ========================================================================

/**
 * @since 3.4.0
 * @experimental
 */
export declare namespace All {
  /**
   * @since 3.4.0
   * @experimental
   */
  export type MicroAny = Micro<any, any, any>

  /**
   * @since 3.4.0
   * @experimental
   */
  export type ReturnIterable<T extends Iterable<MicroAny>, Discard extends boolean> = [T] extends
    [Iterable<Micro<infer A, infer E, infer R>>] ? Micro<
      Discard extends true ? void : Array<A>,
      E,
      R
    >
    : never

  /**
   * @since 3.4.0
   * @experimental
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean> = Micro<
    Discard extends true ? void
      : T[number] extends never ? []
      : { -readonly [K in keyof T]: T[K] extends Micro<infer _A, infer _E, infer _R> ? _A : never },
    T[number] extends never ? never
      : T[number] extends Micro<infer _A, infer _E, infer _R> ? _E
      : never,
    T[number] extends never ? never
      : T[number] extends Micro<infer _A, infer _E, infer _R> ? _R
      : never
  > extends infer X ? X : never

  /**
   * @since 3.4.0
   * @experimental
   */
  export type ReturnObject<T, Discard extends boolean> = [T] extends [{ [K: string]: MicroAny }] ? Micro<
      Discard extends true ? void :
        { -readonly [K in keyof T]: [T[K]] extends [Micro<infer _A, infer _E, infer _R>] ? _A : never },
      keyof T extends never ? never
        : T[keyof T] extends Micro<infer _A, infer _E, infer _R> ? _E
        : never,
      keyof T extends never ? never
        : T[keyof T] extends Micro<infer _A, infer _E, infer _R> ? _R
        : never
    >
    : never

  /**
   * @since 3.4.0
   * @experimental
   */
  export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true

  /**
   * @since 3.4.0
   * @experimental
   */
  export type Return<
    Arg extends Iterable<MicroAny> | Record<string, MicroAny>,
    O extends {
      readonly concurrency?: Concurrency | undefined
      readonly discard?: boolean | undefined
    }
  > = [Arg] extends [ReadonlyArray<MicroAny>] ? ReturnTuple<Arg, IsDiscard<O>>
    : [Arg] extends [Iterable<MicroAny>] ? ReturnIterable<Arg, IsDiscard<O>>
    : [Arg] extends [Record<string, MicroAny>] ? ReturnObject<Arg, IsDiscard<O>>
    : never
}

/**
 * Runs all the provided effects in sequence respecting the structure provided in input.
 *
 * Supports multiple arguments, a single argument tuple / array or record / struct.
 *
 * @since 3.4.0
 * @experimental
 * @category collecting & elements
 */
export const all = <
  const Arg extends Iterable<Micro<any, any, any>> | Record<string, Micro<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly discard?: boolean | undefined
  }
>(arg: Arg, options?: O): All.Return<Arg, O> => {
  if (Array.isArray(arg) || isIterable(arg)) {
    return (forEach as any)(arg, identity, options)
  } else if (options?.discard) {
    return (forEach as any)(Object.values(arg), identity, options)
  }
  return suspend(() => {
    const out: Record<string, unknown> = {}
    return as(
      forEach(Object.entries(arg), ([key, effect]) =>
        map(effect, (value) => {
          out[key] = value
        }), {
        discard: true,
        concurrency: options?.concurrency
      }),
      out
    )
  }) as any
}

/**
 * For each element of the provided iterable, run the effect and collect the results.
 *
 * If the `discard` option is set to `true`, the results will be discarded and
 * the effect will return `void`.
 *
 * The `concurrency` option can be set to control how many effects are run in
 * parallel. By default, the effects are run sequentially.
 *
 * @since 3.4.0
 * @experimental
 * @category collecting & elements
 */
export const forEach: {
  <A, B, E, R>(iterable: Iterable<A>, f: (a: A, index: number) => Micro<B, E, R>, options?: {
    readonly concurrency?: Concurrency | undefined
    readonly discard?: false | undefined
  }): Micro<Array<B>, E, R>
  <A, B, E, R>(iterable: Iterable<A>, f: (a: A, index: number) => Micro<B, E, R>, options: {
    readonly concurrency?: Concurrency | undefined
    readonly discard: true
  }): Micro<void, E, R>
} = <
  A,
  B,
  E,
  R
>(iterable: Iterable<A>, f: (a: A, index: number) => Micro<B, E, R>, options?: {
  readonly concurrency?: Concurrency | undefined
  readonly discard?: boolean | undefined
}): Micro<any, E, R> =>
  make(function(env, onExit) {
    const concurrencyOption = options?.concurrency === "inherit"
      ? envGet(env, currentConcurrency)
      : options?.concurrency ?? 1
    const concurrency = concurrencyOption === "unbounded"
      ? Number.POSITIVE_INFINITY
      : Math.max(1, concurrencyOption)

    // abort
    const [envWithSignal, onAbort] = forkSignal(env)

    // iterate
    let result: MicroExit<any, any> | undefined = undefined
    const items = Array.from(iterable)
    let length = items.length
    const out: Array<B> | undefined = options?.discard ? undefined : new Array(length)
    let index = 0
    let inProgress = 0
    let doneCount = 0
    let pumping = false
    function pump() {
      pumping = true
      while (inProgress < concurrency && index < length) {
        const currentIndex = index
        const item = items[currentIndex]
        index++
        inProgress++
        try {
          f(item, currentIndex)[runSymbol](envWithSignal, function(exit) {
            if (exit._tag === "Left") {
              if (result === undefined) {
                result = exit
                length = index
                onAbort()
              }
            } else if (out !== undefined) {
              out[currentIndex] = exit.right
            }
            doneCount++
            inProgress--
            if (doneCount === length) {
              onExit(result ?? Either.right(out))
            } else if (!pumping && inProgress < concurrency) {
              pump()
            }
          })
        } catch (err) {
          result = exitDie(err)
          length = index
          onAbort()
        }
      }
      pumping = false
    }
    pump()
  })

/**
 * Effectfully filter the elements of the provided iterable.
 *
 * Use the `concurrency` option to control how many elements are processed in parallel.
 *
 * @since 3.4.0
 * @experimental
 * @category collecting & elements
 */
export const filter = <A, E, R>(iterable: Iterable<A>, f: (a: NoInfer<A>) => Micro<boolean, E, R>, options?: {
  readonly concurrency?: Concurrency | undefined
  readonly negate?: boolean | undefined
}): Micro<Array<A>, E, R> =>
  filterMap(iterable, (a) =>
    map(f(a), (pass) => {
      pass = options?.negate ? !pass : pass
      return pass ? Option.some(a) : Option.none()
    }), options)

/**
 * Effectfully filter the elements of the provided iterable.
 *
 * Use the `concurrency` option to control how many elements are processed in parallel.
 *
 * @since 3.4.0
 * @experimental
 * @category collecting & elements
 */
export const filterMap = <A, B, E, R>(
  iterable: Iterable<A>,
  f: (a: NoInfer<A>) => Micro<Option.Option<B>, E, R>,
  options?: {
    readonly concurrency?: Concurrency | undefined
  }
): Micro<Array<B>, E, R> =>
  suspend(() => {
    const out: Array<B> = []
    return as(
      forEach(iterable, (a) =>
        map(f(a), (o) => {
          if (o._tag === "Some") {
            out.push(o.value)
          }
        }), {
        discard: true,
        concurrency: options?.concurrency
      }),
      out
    )
  })

// ----------------------------------------------------------------------------
// do notation
// ----------------------------------------------------------------------------

/**
 * Start a do notation block.
 *
 * @since 3.4.0
 * @experimental
 * @category do notation
 */
export const Do: Micro<{}> = succeed({})

/**
 * Bind the success value of this `Micro` effect to the provided name.
 *
 * @since 3.4.0
 * @experimental
 * @category do notation
 */
export const bindTo: {
  <N extends string>(name: N): <A, E, R>(self: Micro<A, E, R>) => Micro<{ [K in N]: A }, E, R>
  <A, E, R, N extends string>(self: Micro<A, E, R>, name: N): Micro<{ [K in N]: A }, E, R>
} = doNotation.bindTo<MicroTypeLambda>(map)

/**
 * Bind the success value of this `Micro` effect to the provided name.
 *
 * @since 3.4.0
 * @experimental
 * @category do notation
 */
export const bind: {
  <N extends string, A extends Record<string, any>, B, E2, R2>(
    name: N,
    f: (a: A) => Micro<B, E2, R2>
  ): <E, R>(self: Micro<A, E, R>) => Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E | E2, R | R2>
  <A extends Record<string, any>, E, R, B, E2, R2, N extends string>(
    self: Micro<A, E, R>,
    name: N,
    f: (a: A) => Micro<B, E2, R2>
  ): Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E | E2, R | R2>
} = doNotation.bind<MicroTypeLambda>(map, flatMap)

const let_: {
  <N extends string, A extends Record<string, any>, B>(
    name: N,
    f: (a: A) => B
  ): <E, R>(self: Micro<A, E, R>) => Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E, R>
  <A extends Record<string, any>, E, R, B, N extends string>(
    self: Micro<A, E, R>,
    name: N,
    f: (a: A) => B
  ): Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E, R>
} = doNotation.let_<MicroTypeLambda>(map)

export {
  /**
   * Bind the result of a synchronous computation to the given name.
   *
   * @since 3.4.0
   * @experimental
   * @category do notation
   */
  let_ as let
}

// ----------------------------------------------------------------------------
// handle & forking
// ----------------------------------------------------------------------------

/**
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export const HandleTypeId: unique symbol = Symbol.for("effect/Micro/Handle")

/**
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export type HandleTypeId = typeof HandleTypeId

/**
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export interface Handle<A, E = never> {
  readonly [HandleTypeId]: HandleTypeId
  readonly await: Micro<MicroExit<A, E>>
  readonly join: Micro<A, E>
  readonly interrupt: Micro<MicroExit<A, E>>
  readonly unsafeInterrupt: () => void
  readonly addObserver: (observer: (exit: MicroExit<A, E>) => void) => void
  readonly removeObserver: (observer: (exit: MicroExit<A, E>) => void) => void
  readonly unsafePoll: () => MicroExit<A, E> | null
}

/**
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export const isHandle = (u: unknown): u is Handle<unknown, unknown> =>
  typeof u === "object" && u !== null && HandleTypeId in u

class HandleImpl<A, E> implements Handle<A, E> {
  readonly [HandleTypeId]: HandleTypeId

  readonly observers: Set<(exit: MicroExit<A, E>) => void> = new Set()
  private _exit: MicroExit<A, E> | undefined = undefined
  _controller: AbortController
  readonly isRoot: boolean

  constructor(readonly parentSignal: AbortSignal, controller?: AbortController) {
    this[HandleTypeId] = HandleTypeId
    this.isRoot = controller !== undefined
    this._controller = controller ?? new AbortController()
    if (!this.isRoot) {
      parentSignal.addEventListener("abort", this.unsafeInterrupt)
    }
  }

  unsafePoll(): MicroExit<A, E> | null {
    return this._exit ?? null
  }

  unsafeInterrupt = () => {
    this._controller.abort()
  }

  emit(exit: MicroExit<A, E>): void {
    if (this._exit) {
      return
    }
    this._exit = exit
    if (!this.isRoot) {
      this.parentSignal.removeEventListener("abort", this.unsafeInterrupt)
    }
    this.observers.forEach((observer) => observer(exit))
    this.observers.clear()
  }

  addObserver(observer: (exit: MicroExit<A, E>) => void): void {
    if (this._exit) {
      return observer(this._exit)
    }
    this.observers.add(observer)
  }

  removeObserver(observer: (exit: MicroExit<A, E>) => void): void {
    this.observers.delete(observer)
  }

  get await(): Micro<MicroExit<A, E>> {
    return suspend(() => {
      if (this._exit) {
        return succeed(this._exit)
      }
      return async((resume) => {
        function observer(exit: MicroExit<A, E>) {
          resume(succeed(exit))
        }
        this.addObserver(observer)
        return sync(() => {
          this.removeObserver(observer)
        })
      })
    })
  }

  get join(): Micro<A, E> {
    return flatMap(this.await, fromExit)
  }

  get interrupt(): Micro<MicroExit<A, E>> {
    return suspend(() => {
      this.unsafeInterrupt()
      return this.await
    })
  }
}

/**
 * Run the `Micro` effect in a new `Handle` that can be awaited, joined, or
 * aborted.
 *
 * When the parent `Micro` finishes, this `Micro` will be aborted.
 *
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export const fork = <A, E, R>(self: Micro<A, E, R>): Micro<Handle<A, E>, never, R> =>
  make(function(env, onExit) {
    const signal = envGet(env, currentAbortSignal)
    const handle = new HandleImpl<A, E>(signal)
    const nextEnv = envMutate(env, (map) => {
      map[currentAbortController.key] = handle._controller
      map[currentAbortSignal.key] = handle._controller.signal
      return map
    })
    yieldAdd(() => {
      self[runSymbol](nextEnv, (exit) => {
        handle.emit(exit)
      })
    })
    onExit(Either.right(handle))
  })

/**
 * Run the `Micro` effect in a new `Handle` that can be awaited, joined, or
 * aborted.
 *
 * It will not be aborted when the parent `Micro` finishes.
 *
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export const forkDaemon = <A, E, R>(self: Micro<A, E, R>): Micro<Handle<A, E>, never, R> =>
  make(function(env, onExit) {
    const controller = new AbortController()
    const handle = new HandleImpl<A, E>(controller.signal, controller)
    const nextEnv = envMutate(env, (map) => {
      map[currentAbortController.key] = controller
      map[currentAbortSignal.key] = controller.signal
      return map
    })
    yieldAdd(() => {
      self[runSymbol](nextEnv, (exit) => {
        handle.emit(exit)
      })
    })
    onExit(Either.right(handle))
  })

/**
 * Run the `Micro` effect in a new `Handle` that can be awaited, joined, or
 * aborted.
 *
 * The lifetime of the handle will be attached to the provided `MicroScope`.
 *
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export const forkIn: {
  (scope: MicroScope): <A, E, R>(self: Micro<A, E, R>) => Micro<Handle<A, E>, never, R>
  <A, E, R>(self: Micro<A, E, R>, scope: MicroScope): Micro<Handle<A, E>, never, R>
} = dual(
  2,
  <A, E, R>(self: Micro<A, E, R>, scope: MicroScope): Micro<Handle<A, E>, never, R> =>
    uninterruptibleMask((restore) =>
      flatMap(scope.fork, (scope) =>
        tap(
          restore(forkDaemon(onExit(self, (exit) => scope.close(exit)))),
          (fiber) => scope.addFinalizer((_) => asVoid(fiber.interrupt))
        ))
    )
)

/**
 * Run the `Micro` effect in a new `Handle` that can be awaited, joined, or
 * aborted.
 *
 * The lifetime of the handle will be attached to the current `MicroScope`.
 *
 * @since 3.4.0
 * @experimental
 * @category handle & forking
 */
export const forkScoped = <A, E, R>(self: Micro<A, E, R>): Micro<Handle<A, E>, never, R | MicroScope> =>
  flatMap(scope, (scope) => forkIn(self, scope))

// ----------------------------------------------------------------------------
// execution
// ----------------------------------------------------------------------------

/**
 * Execute the `Micro` effect and return a `Handle` that can be awaited, joined,
 * or aborted.
 *
 * You can listen for the result by adding an observer using the handle's
 * `addObserver` method.
 *
 * @since 3.4.0
 * @experimental
 * @category execution
 * @example
 * import * as Micro from "effect/Micro"
 *
 * const handle = Micro.succeed(42).pipe(
 *   Micro.delay(1000),
 *   Micro.runFork
 * )
 *
 * handle.addObserver((exit) => {
 *   console.log(exit)
 * })
 */
export const runFork = <A, E>(
  effect: Micro<A, E>,
  options?: {
    readonly signal?: AbortSignal | undefined
  } | undefined
): Handle<A, E> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  const env = envMake(refs)
  const handle = new HandleImpl<A, E>(controller.signal, controller)
  effect[runSymbol](envSet(env, currentAbortSignal, handle._controller.signal), (exit) => {
    handle.emit(exit)
    if (options?.signal) {
      options.signal.removeEventListener("abort", handle.unsafeInterrupt)
    }
  })
  if (options?.signal) {
    if (options.signal.aborted) {
      handle.unsafeInterrupt()
    } else {
      options.signal.addEventListener("abort", handle.unsafeInterrupt, { once: true })
    }
  }
  return handle
}

/**
 * Execute the `Micro` effect and return a `Promise` that resolves with the
 * `MicroExit` of the computation.
 *
 * @since 3.4.6
 * @experimental
 * @category execution
 */
export const runPromiseExit = <A, E>(
  effect: Micro<A, E>,
  options?: {
    readonly signal?: AbortSignal | undefined
  } | undefined
): Promise<MicroExit<A, E>> =>
  new Promise((resolve, _reject) => {
    const handle = runFork(effect, options)
    handle.addObserver(resolve)
  })

/**
 * Execute the `Micro` effect and return a `Promise` that resolves with the
 * successful value of the computation.
 *
 * @since 3.4.0
 * @experimental
 * @category execution
 */
export const runPromise = <A, E>(
  effect: Micro<A, E>,
  options?: {
    readonly signal?: AbortSignal | undefined
  } | undefined
): Promise<A> =>
  runPromiseExit(effect, options).then((exit) => {
    if (exit._tag === "Left") {
      throw exit.left
    }
    return exit.right
  })

/**
 * Attempt to execute the `Micro` effect synchronously and return the `MicroExit`.
 *
 * If any asynchronous effects are encountered, the function will return a
 * `CauseDie` containing the `Handle`.
 *
 * @since 3.4.6
 * @experimental
 * @category execution
 */
export const runSyncExit = <A, E>(effect: Micro<A, E>): MicroExit<A, E> => {
  const handle = runFork(effect)
  while (yieldState.tasks.length > 0) {
    yieldRunTasks()
  }
  const exit = handle.unsafePoll()
  if (exit === null) {
    return exitDie(handle)
  }
  return exit
}

/**
 * Attempt to execute the `Micro` effect synchronously and return the success
 * value.
 *
 * @since 3.4.0
 * @experimental
 * @category execution
 */
export const runSync = <A, E>(effect: Micro<A, E>): A => {
  const exit = runSyncExit(effect)
  if (exit._tag === "Left") {
    throw exit.left
  }
  return exit.right
}

// ----------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------

/**
 * @since 3.4.0
 * @experimental
 * @category errors
 */
export interface YieldableError extends Pipeable, Inspectable, Readonly<Error> {
  readonly [EffectTypeId]: Effect.VarianceStruct<never, this, never>
  readonly [StreamTypeId]: Stream.VarianceStruct<never, this, never>
  readonly [SinkTypeId]: Sink.VarianceStruct<never, unknown, never, this, never>
  readonly [ChannelTypeId]: Channel.VarianceStruct<never, unknown, this, unknown, never, unknown, never>
  readonly [TypeId]: Micro.Variance<never, this, never>
  readonly [runSymbol]: (env: Env<any>, onExit: (exit: MicroExit<never, this>) => void) => void
  [Symbol.iterator](): MicroIterator<Micro<never, this, never>>
}

const YieldableError: new(message?: string) => YieldableError = (function() {
  class YieldableError extends globalThis.Error {
    [runSymbol](_env: any, onExit: any) {
      onExit(exitFail(this))
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
  Object.assign(YieldableError.prototype, MicroProto, StructuralPrototype)
  return YieldableError as any
})()

/**
 * @since 3.4.0
 * @experimental
 * @category errors
 */
export const Error: new<A extends Record<string, any> = {}>(
  args: Equals<A, {}> extends true ? void
    : { readonly [P in keyof A]: A[P] }
) => YieldableError & Readonly<A> = (function() {
  return class extends YieldableError {
    constructor(args: any) {
      super()
      if (args) {
        Object.assign(this, args)
      }
    }
  } as any
})()

/**
 * @since 3.4.0
 * @experimental
 * @category errors
 */
export const TaggedError = <Tag extends string>(tag: Tag): new<A extends Record<string, any> = {}>(
  args: Equals<A, {}> extends true ? void
    : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }
) => YieldableError & { readonly _tag: Tag } & Readonly<A> => {
  class Base extends Error<{}> {
    readonly _tag = tag
  }
  ;(Base.prototype as any).name = tag
  return Base as any
}

/**
 * Represents a checked exception which occurs when an expected element was
 * unable to be found.
 *
 * @since 3.4.4
 * @experimental
 * @category errors
 */
export class NoSuchElementException extends TaggedError("NoSuchElementException")<{ message?: string | undefined }> {}

/**
 * Represents a checked exception which occurs when a timeout occurs.
 *
 * @since 3.4.4
 * @experimental
 * @category errors
 */
export class TimeoutException extends TaggedError("TimeoutException") {}

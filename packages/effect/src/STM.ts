/**
 * @since 2.0.0
 */
import * as Cause from "./Cause.js"
import * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as FiberId from "./FiberId.js"
import type { LazyArg } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import * as core from "./internal/stm/core.js"
import * as stm from "./internal/stm/stm.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type { Covariant, MergeRecord, NoInfer } from "./Types.js"
import type * as Unify from "./Unify.js"
import type { YieldWrap } from "./Utils.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const STMTypeId: unique symbol = core.STMTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type STMTypeId = typeof STMTypeId

/**
 * `STM<A, E, R>` represents an effect that can be performed transactionally,
 *  resulting in a failure `E` or a value `A` that may require an environment
 *  `R` to execute.
 *
 * Software Transactional Memory is a technique which allows composition of
 * arbitrary atomic operations.  It is the software analog of transactions in
 * database systems.
 *
 * The API is lifted directly from the Haskell package Control.Concurrent.STM
 * although the implementation does not resemble the Haskell one at all.
 *
 * See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html
 *
 * STM in Haskell was introduced in:
 *
 * Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
 * Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
 * Parallel Programming 2005.
 *
 * See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/
 *
 * See also:
 *  Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
 *  Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
 *  International Symposium on Functional and Logic Programming, Fuji Susono,
 *  JAPAN, April 2006
 *
 *  https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/
 *
 * The implemtation is based on the ZIO STM module, while JS environments have
 * no race conditions from multiple threads STM provides greater benefits for
 * synchronization of Fibers and transactional data-types can be quite useful.
 *
 * @since 2.0.0
 * @category models
 */
export interface STM<out A, out E = never, out R = never>
  extends Effect.Effect<A, E, R>, STM.Variance<A, E, R>, Pipeable
{
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: STMUnify<this>
  [Unify.ignoreSymbol]?: STMUnifyIgnore
  [Symbol.iterator](): Effect.EffectGenerator<STM<A, E, R>>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface STMUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  STM?: () => A[Unify.typeSymbol] extends STM<infer A0, infer E0, infer R0> | infer _ ? STM<R0, E0, A0> : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface STMUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface STMTypeLambda extends TypeLambda {
  readonly type: STM<this["Target"], this["Out1"], this["Out2"]>
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Context.js" {
  interface Tag<Id, Value> extends STM<Value, never, Id> {}
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Either.js" {
  interface Left<L, R> extends STM<R, L> {
    readonly _tag: "Left"
  }
  interface Right<L, R> extends STM<R, L> {
    readonly _tag: "Right"
  }
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Option.js" {
  interface None<A> extends STM<A, Cause.NoSuchElementException> {
    readonly _tag: "None"
  }
  interface Some<A> extends STM<A, Cause.NoSuchElementException> {
    readonly _tag: "Some"
  }
}

/**
 * @since 2.0.0
 */
export declare namespace STM {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out A, out E, out R> {
    readonly [STMTypeId]: {
      readonly _A: Covariant<A>
      readonly _E: Covariant<E>
      readonly _R: Covariant<R>
    }
  }
}

/**
 * Returns `true` if the provided value is an `STM`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isSTM: (u: unknown) => u is STM<unknown, unknown, unknown> = core.isSTM

/**
 * Treats the specified `acquire` transaction as the acquisition of a
 * resource. The `acquire` transaction will be executed interruptibly. If it
 * is a success and is committed the specified `release` workflow will be
 * executed uninterruptibly as soon as the `use` workflow completes execution.
 *
 * @since 2.0.0
 * @category constructors
 */
export const acquireUseRelease: {
  <A, A2, E2, R2, A3, E3, R3>(
    use: (resource: A) => STM<A2, E2, R2>,
    release: (resource: A) => STM<A3, E3, R3>
  ): <E, R>(acquire: STM<A, E, R>) => Effect.Effect<A2, E2 | E3 | E, R2 | R3 | R>
  <A, E, R, A2, E2, R2, A3, E3, R3>(
    acquire: STM<A, E, R>,
    use: (resource: A) => STM<A2, E2, R2>,
    release: (resource: A) => STM<A3, E3, R3>
  ): Effect.Effect<A2, E | E2 | E3, R | R2 | R3>
} = stm.acquireUseRelease

/**
 * @since 2.0.0
 * @category utils
 */
export declare namespace All {
  type STMAny = STM<any, any, any>

  type ReturnTuple<T extends ReadonlyArray<STM<any, any, any>>, Discard extends boolean> = STM<
    Discard extends true ? void
      : T[number] extends never ? []
      : { -readonly [K in keyof T]: [T[K]] extends [STM<infer A, infer _E, infer _R>] ? A : never },
    T[number] extends never ? never
      : [T[number]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    T[number] extends never ? never
      : [T[number]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never
  > extends infer X ? X : never

  type ReturnIterable<T extends Iterable<STMAny>, Discard extends boolean> = [T] extends
    [Iterable<STM.Variance<infer A, infer E, infer R>>] ? STM<Discard extends true ? void : Array<A>, E, R> : never

  type ReturnObject<T extends Record<string, STMAny>, Discard extends boolean> = STM<
    Discard extends true ? void
      : { -readonly [K in keyof T]: [T[K]] extends [STM.Variance<infer A, infer _E, infer _R>] ? A : never },
    keyof T extends never ? never
      : [T[keyof T]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    keyof T extends never ? never
      : [T[keyof T]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never
  >

  /**
   * @since 2.0.0
   * @category utils
   */
  export type Options = {
    readonly discard?: boolean | undefined
  }
  type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true
  type Narrow<A> = (A extends [] ? [] : never) | A

  /**
   * @since 2.0.0
   * @category utils
   */
  export interface Signature {
    <Arg extends ReadonlyArray<STMAny> | Iterable<STMAny> | Record<string, STMAny>, O extends Options>(
      arg: Narrow<Arg>,
      options?: O
    ): [Arg] extends [ReadonlyArray<STMAny>] ? ReturnTuple<Arg, IsDiscard<O>>
      : [Arg] extends [Iterable<STMAny>] ? ReturnIterable<Arg, IsDiscard<O>>
      : [Arg] extends [Record<string, STMAny>] ? ReturnObject<Arg, IsDiscard<O>>
      : never
  }
}

/**
 * Runs all the provided transactional effects in sequence respecting the
 * structure provided in input.
 *
 * Supports multiple arguments, a single argument tuple / array or record /
 * struct.
 *
 * @since 2.0.0
 * @category constructors
 */
export const all: All.Signature = stm.all

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <A2>(value: A2): <A, E, R>(self: STM<A, E, R>) => STM<A2, E, R>
  <A, E, R, A2>(self: STM<A, E, R>, value: A2): STM<A2, E, R>
} = stm.as

/**
 * Maps the success value of this effect to an optional value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asSome: <A, E, R>(self: STM<A, E, R>) => STM<Option.Option<A>, E, R> = stm.asSome

/**
 * Maps the error value of this effect to an optional value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asSomeError: <A, E, R>(self: STM<A, E, R>) => STM<A, Option.Option<E>, R> = stm.asSomeError

/**
 * This function maps the success value of an `STM` to `void`. If the original
 * `STM` succeeds, the returned `STM` will also succeed. If the original `STM`
 * fails, the returned `STM` will fail with the same error.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asVoid: <A, E, R>(self: STM<A, E, R>) => STM<void, E, R> = stm.asVoid

/**
 * Creates an `STM` value from a partial (but pure) function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const attempt: <A>(evaluate: LazyArg<A>) => STM<A, unknown> = stm.attempt

/**
 * Recovers from all errors.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAll: {
  <E, B, E1, R1>(f: (e: E) => STM<B, E1, R1>): <A, R>(self: STM<A, E, R>) => STM<B | A, E1, R1 | R>
  <A, E, R, B, E1, R1>(self: STM<A, E, R>, f: (e: E) => STM<B, E1, R1>): STM<A | B, E1, R | R1>
} = core.catchAll

/**
 * Recovers from some or all of the error cases.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSome: {
  <E, A2, E2, R2>(
    pf: (error: E) => Option.Option<STM<A2, E2, R2>>
  ): <A, R>(self: STM<A, E, R>) => STM<A2 | A, E | E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: STM<A, E, R>,
    pf: (error: E) => Option.Option<STM<A2, E2, R2>>
  ): STM<A | A2, E | E2, R | R2>
} = stm.catchSome

/**
 * Recovers from the specified tagged error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends E["_tag"] & string, E extends { _tag: string }, A1, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM<A1, E1, R1>
  ): <A, R>(self: STM<A, E, R>) => STM<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E extends { _tag: string }, R, K extends E["_tag"] & string, A1, E1, R1>(
    self: STM<A, E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM<A1, E1, R1>
  ): STM<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = stm.catchTag

/**
 * Recovers from multiple tagged errors.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => STM<any, any, any>) }
  >(
    cases: Cases
  ): <A, R>(
    self: STM<A, E, R>
  ) => STM<
    | A
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<infer A, any, any> ? A : never }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, infer E, any> ? E : never }[keyof Cases],
    | R
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, any, infer R> ? R : never }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => STM<any, any, any>) }
  >(
    self: STM<A, E, R>,
    cases: Cases
  ): STM<
    | A
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<infer A, any, any> ? A : never }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, infer E, any> ? E : never }[keyof Cases],
    | R
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, any, infer R> ? R : never }[keyof Cases]
  >
} = stm.catchTags

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 *
 * @since 2.0.0
 * @category constructors
 */
export const check: (predicate: LazyArg<boolean>) => STM<void> = stm.check

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @since 2.0.0
 * @category mutations
 */
export const collect: {
  <A, A2>(pf: (a: A) => Option.Option<A2>): <E, R>(self: STM<A, E, R>) => STM<A2, E, R>
  <A, E, R, A2>(self: STM<A, E, R>, pf: (a: A) => Option.Option<A2>): STM<A2, E, R>
} = stm.collect

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @since 2.0.0
 * @category mutations
 */
export const collectSTM: {
  <A, A2, E2, R2>(pf: (a: A) => Option.Option<STM<A2, E2, R2>>): <E, R>(self: STM<A, E, R>) => STM<A2, E2 | E, R2 | R>
  <A, E, R, A2, E2, R2>(self: STM<A, E, R>, pf: (a: A) => Option.Option<STM<A2, E2, R2>>): STM<A2, E | E2, R | R2>
} = stm.collectSTM

/**
 * Commits this transaction atomically.
 *
 * @since 2.0.0
 * @category destructors
 */
export const commit: <A, E, R>(self: STM<A, E, R>) => Effect.Effect<A, E, R> = core.commit

/**
 * Commits this transaction atomically, regardless of whether the transaction
 * is a success or a failure.
 *
 * @since 2.0.0
 * @category destructors
 */
export const commitEither: <A, E, R>(self: STM<A, E, R>) => Effect.Effect<A, E, R> = stm.commitEither

/**
 * Similar to Either.cond, evaluate the predicate, return the given A as
 * success if predicate returns true, and the given E as error otherwise
 *
 * @since 2.0.0
 * @category constructors
 */
export const cond: <A, E>(predicate: LazyArg<boolean>, error: LazyArg<E>, result: LazyArg<A>) => STM<A, E> = stm.cond

/**
 * Retrieves the environment inside an stm.
 *
 * @since 2.0.0
 * @category constructors
 */
export const context: <R>() => STM<Context.Context<R>, never, R> = core.context

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWith: <R0, R>(f: (environment: Context.Context<R0>) => R) => STM<R, never, R0> = core.contextWith

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWithSTM: <R0, A, E, R>(
  f: (environment: Context.Context<R0>) => STM<A, E, R>
) => STM<A, E, R0 | R> = core.contextWithSTM

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <A, E>(self: STM<A, E, R>) => STM<A, E, R0>
  <A, E, R0, R>(self: STM<A, E, R>, f: (context: Context.Context<R0>) => Context.Context<R>): STM<A, E, R0>
} = core.mapInputContext

/**
 * Fails the transactional effect with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => STM<never> = core.die

/**
 * Kills the fiber running the effect with a `Cause.RuntimeException` that
 * contains the specified message.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => STM<never> = core.dieMessage

/**
 * Fails the transactional effect with the specified lazily evaluated defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => STM<never> = core.dieSync

/**
 * Converts the failure channel into an `Either`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const either: <A, E, R>(self: STM<A, E, R>) => STM<Either.Either<A, E>, never, R> = stm.either

/**
 * Executes the specified finalization transaction whether or not this effect
 * succeeds. Note that as with all STM transactions, if the full transaction
 * fails, everything will be rolled back.
 *
 * @since 2.0.0
 * @category finalization
 */
export const ensuring: {
  <R1, B>(finalizer: STM<B, never, R1>): <A, E, R>(self: STM<A, E, R>) => STM<A, E, R1 | R>
  <A, E, R, R1, B>(self: STM<A, E, R>, finalizer: STM<B, never, R1>): STM<A, E, R | R1>
} = core.ensuring

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @since 2.0.0
 * @category mutations
 */
export const eventually: <A, E, R>(self: STM<A, E, R>) => STM<A, E, R> = stm.eventually

/**
 * Determines whether all elements of the `Iterable<A>` satisfy the effectual
 * predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const every: {
  <A, R, E>(predicate: (a: NoInfer<A>) => STM<boolean, E, R>): (iterable: Iterable<A>) => STM<boolean, E, R>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<boolean, E, R>): STM<boolean, E, R>
} = stm.every

/**
 * Determines whether any element of the `Iterable[A]` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const exists: {
  <A, R, E>(predicate: (a: NoInfer<A>) => STM<boolean, E, R>): (iterable: Iterable<A>) => STM<boolean, E, R>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<boolean, E, R>): STM<boolean, E, R>
} = stm.exists

/**
 * Fails the transactional effect with the specified error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => STM<never, E> = core.fail

/**
 * Fails the transactional effect with the specified lazily evaluated error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => STM<never, E> = core.failSync

/**
 * Returns the fiber id of the fiber committing the transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fiberId: STM<FiberId.FiberId> = stm.fiberId

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const filter: {
  <A, R, E>(predicate: (a: NoInfer<A>) => STM<boolean, E, R>): (iterable: Iterable<A>) => STM<Array<A>, E, R>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<boolean, E, R>): STM<Array<A>, E, R>
} = stm.filter

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const filterNot: {
  <A, R, E>(predicate: (a: NoInfer<A>) => STM<boolean, E, R>): (iterable: Iterable<A>) => STM<Array<A>, E, R>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<boolean, E, R>): STM<Array<A>, E, R>
} = stm.filterNot

/**
 * Dies with specified defect if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrDie: {
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>,
    defect: LazyArg<unknown>
  ): <E, R>(self: STM<A, E, R>) => STM<B, E, R>
  <A>(predicate: Predicate<NoInfer<A>>, defect: LazyArg<unknown>): <E, R>(self: STM<A, E, R>) => STM<A, E, R>
  <A, E, R, B extends A>(self: STM<A, E, R>, refinement: Refinement<A, B>, defect: LazyArg<unknown>): STM<B, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: Predicate<A>, defect: LazyArg<unknown>): STM<A, E, R>
} = stm.filterOrDie

/**
 * Dies with a `Cause.RuntimeException` having the specified  message if the
 * predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrDieMessage: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>, message: string): <E, R>(self: STM<A, E, R>) => STM<B, E, R>
  <A>(predicate: Predicate<NoInfer<A>>, message: string): <E, R>(self: STM<A, E, R>) => STM<A, E, R>
  <A, E, R, B extends A>(self: STM<A, E, R>, refinement: Refinement<A, B>, message: string): STM<B, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: Predicate<A>, message: string): STM<A, E, R>
} = stm.filterOrDieMessage

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrElse: {
  <A, B extends A, C, E2, R2>(
    refinement: Refinement<NoInfer<A>, B>,
    orElse: (a: NoInfer<A>) => STM<C, E2, R2>
  ): <E, R>(self: STM<A, E, R>) => STM<B | C, E2 | E, R2 | R>
  <A, B, E2, R2>(
    predicate: Predicate<NoInfer<A>>,
    orElse: (a: NoInfer<A>) => STM<B, E2, R2>
  ): <E, R>(self: STM<A, E, R>) => STM<A | B, E2 | E, R2 | R>
  <A, E, R, B extends A, C, E2, R2>(
    self: STM<A, E, R>,
    refinement: Refinement<A, B>,
    orElse: (a: A) => STM<C, E2, R2>
  ): STM<B | C, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: STM<A, E, R>,
    predicate: Predicate<A>,
    orElse: (a: A) => STM<B, E2, R2>
  ): STM<A | B, E | E2, R | R2>
} = stm.filterOrElse

/**
 * Fails with the specified error if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrFail: {
  <A, B extends A, E2>(
    refinement: Refinement<NoInfer<A>, B>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: STM<A, E, R>) => STM<B, E2 | E, R>
  <A, E2>(
    predicate: Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: STM<A, E, R>) => STM<A, E2 | E, R>
  <A, E, R, B extends A, E2>(
    self: STM<A, E, R>,
    refinement: Refinement<A, B>,
    orFailWith: (a: A) => E2
  ): STM<B, E | E2, R>
  <A, E, R, E2>(self: STM<A, E, R>, predicate: Predicate<A>, orFailWith: (a: A) => E2): STM<A, E | E2, R>
} = stm.filterOrFail

/**
 * Feeds the value produced by this effect to the specified function, and then
 * runs the returned effect as well to produce its results.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, A2, E1, R1>(f: (a: A) => STM<A2, E1, R1>): <E, R>(self: STM<A, E, R>) => STM<A2, E1 | E, R1 | R>
  <A, E, R, A2, E1, R1>(self: STM<A, E, R>, f: (a: A) => STM<A2, E1, R1>): STM<A2, E | E1, R | R1>
} = core.flatMap

/**
 * Flattens out a nested `STM` effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <A, E2, R2, E, R>(self: STM<STM<A, E2, R2>, E, R>) => STM<A, E2 | E, R2 | R> = stm.flatten

/**
 * Flips the success and failure channels of this transactional effect. This
 * allows you to use all methods on the error channel, possibly before
 * flipping back.
 *
 * @since 2.0.0
 * @category mutations
 */
export const flip: <A, E, R>(self: STM<A, E, R>) => STM<E, A, R> = stm.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @since 2.0.0
 * @category mutations
 */
export const flipWith: {
  <E, A, R, E2, A2, R2>(f: (stm: STM<E, A, R>) => STM<E2, A2, R2>): (self: STM<A, E, R>) => STM<A | A2, E | E2, R | R2>
  <A, E, R, E2, A2, R2>(self: STM<A, E, R>, f: (stm: STM<E, A, R>) => STM<E2, A2, R2>): STM<A | A2, E | E2, R | R2>
} = stm.flipWith

/**
 * Folds over the `STM` effect, handling both failure and success, but not
 * retry.
 *
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <E, A2, A, A3>(
    options: { readonly onFailure: (error: E) => A2; readonly onSuccess: (value: A) => A3 }
  ): <R>(self: STM<A, E, R>) => STM<A2 | A3, never, R>
  <A, E, R, A2, A3>(
    self: STM<A, E, R>,
    options: { readonly onFailure: (error: E) => A2; readonly onSuccess: (value: A) => A3 }
  ): STM<A2 | A3, never, R>
} = stm.match

/**
 * Effectfully folds over the `STM` effect, handling both failure and success.
 *
 * @since 2.0.0
 * @category folding
 */
export const matchSTM: {
  <E, A1, E1, R1, A, A2, E2, R2>(
    options: { readonly onFailure: (e: E) => STM<A1, E1, R1>; readonly onSuccess: (a: A) => STM<A2, E2, R2> }
  ): <R>(self: STM<A, E, R>) => STM<A1 | A2, E1 | E2, R1 | R2 | R>
  <A, E, R, A1, E1, R1, A2, E2, R2>(
    self: STM<A, E, R>,
    options: { readonly onFailure: (e: E) => STM<A1, E1, R1>; readonly onSuccess: (a: A) => STM<A2, E2, R2> }
  ): STM<A1 | A2, E1 | E2, R | R1 | R2>
} = core.matchSTM

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * a transactional effect that produces a new `Chunk<A2>`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <A, A2, E, R>(
    f: (a: A) => STM<A2, E, R>,
    options?: { readonly discard?: false | undefined } | undefined
  ): (elements: Iterable<A>) => STM<Array<A2>, E, R>
  <A, A2, E, R>(
    f: (a: A) => STM<A2, E, R>,
    options: { readonly discard: true }
  ): (elements: Iterable<A>) => STM<void, E, R>
  <A, A2, E, R>(
    elements: Iterable<A>,
    f: (a: A) => STM<A2, E, R>,
    options?: { readonly discard?: false | undefined } | undefined
  ): STM<Array<A2>, E, R>
  <A, A2, E, R>(elements: Iterable<A>, f: (a: A) => STM<A2, E, R>, options: { readonly discard: true }): STM<void, E, R>
} = stm.forEach

/**
 * Lifts an `Either` into a `STM`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEither: <A, E>(either: Either.Either<A, E>) => STM<A, E> = stm.fromEither

/**
 * Lifts an `Option` into a `STM`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromOption: <A>(option: Option.Option<A>) => STM<A, Option.Option<never>> = stm.fromOption

/**
 * @since 2.0.0
 * @category models
 */
export interface Adapter {
  <A, E, R>(self: STM<A, E, R>): STM<A, E, R>
  <A, _R, _E, _A>(a: A, ab: (a: A) => STM<_A, _E, _R>): STM<_A, _E, _R>
  <A, B, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => STM<_A, _E, _R>): STM<_A, _E, _R>
  <A, B, C, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => STM<_A, _E, _R>): STM<_A, _E, _R>
  <A, B, C, D, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: F) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => T,
    tu: (s: T) => STM<_A, _E, _R>
  ): STM<_A, _E, _R>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const gen: <Eff extends YieldWrap<STM<any, any, any>>, AEff>(
  f: (resume: Adapter) => Generator<Eff, AEff, never>
) => STM<
  AEff,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<STM<infer _A, infer E, infer _R>>] ? E : never,
  [Eff] extends [never] ? never : [Eff] extends [YieldWrap<STM<infer _A, infer _E, infer R>>] ? R : never
> = stm.gen

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 *
 * @since 2.0.0
 * @category getters
 */
export const head: <A, E, R>(self: STM<Iterable<A>, E, R>) => STM<A, Option.Option<E>, R> = stm.head

const if_: {
  <A, E1, R1, A2, E2, R2>(options: {
    readonly onTrue: STM<A, E1, R1>
    readonly onFalse: STM<A2, E2, R2> /**
     * Flattens out a nested `STM` effect.
     *
     * @since 2.0.0
     * @category sequencing
     */
  }): <E = never, R = never>(self: boolean | STM<boolean, E, R>) => STM<A | A2, E1 | E2 | E, R1 | R2 | R>
  <A, E1, R1, A2, E2, R2, E = never, R = never>(
    self: boolean,
    options: { readonly onTrue: STM<A, E1, R1>; readonly onFalse: STM<A2, E2, R2> }
  ): STM<A | A2, E1 | E2 | E, R1 | R2 | R>
  <E, R, A, E1, R1, A2, E2, R2>(
    self: STM<boolean, E, R>,
    options: { readonly onTrue: STM<A, E1, R1>; readonly onFalse: STM<A2, E2, R2> }
  ): STM<A | A2, E | E1 | E2, R | R1 | R2>
} = stm.if_

export {
  /**
   * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
   *
   * @since 2.0.0
   * @category mutations
   */
  if_ as if
}

/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @since 2.0.0
 * @category mutations
 */
export const ignore: <A, E, R>(self: STM<A, E, R>) => STM<void, never, R> = stm.ignore

/**
 * Interrupts the fiber running the effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interrupt: STM<never> = core.interrupt

/**
 * Interrupts the fiber running the effect with the specified `FiberId`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interruptAs: (fiberId: FiberId.FiberId) => STM<never> = core.interruptAs

/**
 * Returns whether this transactional effect is a failure.
 *
 * @since 2.0.0
 * @category getters
 */
export const isFailure: <A, E, R>(self: STM<A, E, R>) => STM<boolean, never, R> = stm.isFailure

/**
 * Returns whether this transactional effect is a success.
 *
 * @since 2.0.0
 * @category getters
 */
export const isSuccess: <A, E, R>(self: STM<A, E, R>) => STM<boolean, never, R> = stm.isSuccess

/**
 * Iterates with the specified transactional function. The moral equivalent
 * of:
 *
 * ```ts
 * const s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const iterate: <Z, E, R>(
  initial: Z,
  options: {
    readonly while: Predicate<Z>
    readonly body: (z: Z) => STM<Z, E, R>
  }
) => STM<Z, E, R> = stm.iterate

/**
 * Loops with the specified transactional function, collecting the results
 * into a list. The moral equivalent of:
 *
 * ```ts
 * const as = []
 * let s  = initial
 *
 * while (cont(s)) {
 *   as.push(body(s))
 *   s  = inc(s)
 * }
 *
 * return as
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const loop: {
  <Z, A, E, R>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM<A, E, R>
      readonly discard?: false | undefined
    }
  ): STM<Array<A>, E, R>
  <Z, A, E, R>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM<A, E, R>
      readonly discard: true
    }
  ): STM<void, E, R>
} = stm.loop

/**
 * Maps the value produced by the effect.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: STM<A, E, R>) => STM<B, E, R>
  <A, E, R, B>(self: STM<A, E, R>, f: (a: A) => B): STM<B, E, R>
} = core.map

/**
 * Maps the value produced by the effect with the specified function that may
 * throw exceptions but is otherwise pure, translating any thrown exceptions
 * into typed failed effects.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapAttempt: {
  <A, B>(f: (a: A) => B): <E, R>(self: STM<A, E, R>) => STM<B, unknown, R>
  <A, E, R, B>(self: STM<A, E, R>, f: (a: A) => B): STM<B, unknown, R>
} = stm.mapAttempt

/**
 * Returns an `STM` effect whose failure and success channels have been mapped
 * by the specified pair of functions, `f` and `g`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBoth: {
  <E, E2, A, A2>(
    options: { readonly onFailure: (error: E) => E2; readonly onSuccess: (value: A) => A2 }
  ): <R>(self: STM<A, E, R>) => STM<A2, E2, R>
  <A, E, R, E2, A2>(
    self: STM<A, E, R>,
    options: { readonly onFailure: (error: E) => E2; readonly onSuccess: (value: A) => A2 }
  ): STM<A2, E2, R>
} = stm.mapBoth

/**
 * Maps from one error type to another.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (error: E) => E2): <A, R>(self: STM<A, E, R>) => STM<A, E2, R>
  <A, E, R, E2>(self: STM<A, E, R>, f: (error: E) => E2): STM<A, E2, R>
} = stm.mapError

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @since 2.0.0
 * @category mutations
 */
export const merge: <A, E, R>(self: STM<A, E, R>) => STM<E | A, never, R> = stm.merge

/**
 * Merges an `Iterable<STM>` to a single `STM`, working sequentially.
 *
 * @since 2.0.0
 * @category constructors
 */
export const mergeAll: {
  <A2, A>(zero: A2, f: (a2: A2, a: A) => A2): <E, R>(iterable: Iterable<STM<A, E, R>>) => STM<A2, E, R>
  <A, E, R, A2>(iterable: Iterable<STM<A, E, R>>, zero: A2, f: (a2: A2, a: A) => A2): STM<A2, E, R>
} = stm.mergeAll

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @since 2.0.0
 * @category mutations
 */
export const negate: <E, R>(self: STM<boolean, E, R>) => STM<boolean, E, R> = stm.negate

/**
 * Requires the option produced by this value to be `None`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const none: <A, E, R>(self: STM<Option.Option<A>, E, R>) => STM<void, Option.Option<E>, R> = stm.none

/**
 * Converts the failure channel into an `Option`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const option: <A, E, R>(self: STM<A, E, R>) => STM<Option.Option<A>, never, R> = stm.option

/**
 * Translates `STM` effect failure into death of the fiber, making all
 * failures unchecked and not a part of the type of the effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDie: <A, E, R>(self: STM<A, E, R>) => STM<A, never, R> = stm.orDie

/**
 * Keeps none of the errors, and terminates the fiber running the `STM` effect
 * with them, using the specified function to convert the `E` into a defect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <A, R>(self: STM<A, E, R>) => STM<A, never, R>
  <A, E, R>(self: STM<A, E, R>, f: (error: E) => unknown): STM<A, never, R>
} = stm.orDieWith

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElse: {
  <A2, E2, R2>(that: LazyArg<STM<A2, E2, R2>>): <A, E, R>(self: STM<A, E, R>) => STM<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: STM<A, E, R>, that: LazyArg<STM<A2, E2, R2>>): STM<A | A2, E2, R | R2>
} = stm.orElse

/**
 * Returns a transactional effect that will produce the value of this effect
 * in left side, unless it fails or retries, in which case, it will produce
 * the value of the specified effect in right side.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseEither: {
  <A2, E2, R2>(that: LazyArg<STM<A2, E2, R2>>): <A, E, R>(self: STM<A, E, R>) => STM<Either.Either<A2, A>, E2, R2 | R>
  <A, E, R, A2, E2, R2>(self: STM<A, E, R>, that: LazyArg<STM<A2, E2, R2>>): STM<Either.Either<A2, A>, E2, R | R2>
} = stm.orElseEither

/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseFail: {
  <E2>(error: LazyArg<E2>): <A, E, R>(self: STM<A, E, R>) => STM<A, E2, R>
  <A, E, R, E2>(self: STM<A, E, R>, error: LazyArg<E2>): STM<A, E2, R>
} = stm.orElseFail

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseOptional: {
  <A2, E2, R2>(
    that: LazyArg<STM<A2, Option.Option<E2>, R2>>
  ): <A, E, R>(self: STM<A, Option.Option<E>, R>) => STM<A2 | A, Option.Option<E2 | E>, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: STM<A, Option.Option<E>, R>,
    that: LazyArg<STM<A2, Option.Option<E2>, R2>>
  ): STM<A | A2, Option.Option<E | E2>, R | R2>
} = stm.orElseOptional

/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseSucceed: {
  <A2>(value: LazyArg<A2>): <A, E, R>(self: STM<A, E, R>) => STM<A2 | A, never, R>
  <A, E, R, A2>(self: STM<A, E, R>, value: LazyArg<A2>): STM<A | A2, never, R>
} = stm.orElseSucceed

/**
 * Tries this effect first, and if it enters retry, then it tries the other
 * effect. This is an equivalent of Haskell's orElse.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orTry: {
  <A1, E1, R1>(that: LazyArg<STM<A1, E1, R1>>): <A, E, R>(self: STM<A, E, R>) => STM<A1 | A, E1 | E, R1 | R>
  <A, E, R, A1, E1, R1>(self: STM<A, E, R>, that: LazyArg<STM<A1, E1, R1>>): STM<A | A1, E | E1, R | R1>
} = core.orTry

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @since 2.0.0
 * @category traversing
 */
export const partition: {
  <A, A2, E, R>(
    f: (a: A) => STM<A2, E, R>
  ): (elements: Iterable<A>) => STM<[excluded: Array<E>, satisfying: Array<A2>], never, R>
  <A, A2, E, R>(
    elements: Iterable<A>,
    f: (a: A) => STM<A2, E, R>
  ): STM<[excluded: Array<E>, satisfying: Array<A2>], never, R>
} = stm.partition

/**
 * Provides the transaction its required environment, which eliminates its
 * dependency on `R`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(env: Context.Context<R>): <A, E>(self: STM<A, E, R>) => STM<A, E>
  <A, E, R>(self: STM<A, E, R>, env: Context.Context<R>): STM<A, E>
} = stm.provideContext

/**
 * Splits the context into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideSomeContext: {
  <R>(context: Context.Context<R>): <R1, E, A>(self: STM<A, E, R1>) => STM<A, E, Exclude<R1, R>>
  <R, R1, E, A>(self: STM<A, E, R1>, context: Context.Context<R>): STM<A, E, Exclude<R1, R>>
} = stm.provideSomeContext

/**
 * Provides the effect with the single service it requires. If the transactional
 * effect requires more than one service use `provideEnvironment` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ): <A, E, R>(self: STM<A, E, R>) => STM<A, E, Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>>(
    self: STM<A, E, R>,
    tag: T,
    resource: Context.Tag.Service<T>
  ): STM<A, E, Exclude<R, Context.Tag.Identifier<T>>>
} = stm.provideService

/**
 * Provides the effect with the single service it requires. If the transactional
 * effect requires more than one service use `provideEnvironment` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceSTM: {
  <T extends Context.Tag<any, any>, E1, R1>(
    tag: T,
    stm: STM<Context.Tag.Service<T>, E1, R1>
  ): <A, E, R>(self: STM<A, E, R>) => STM<A, E1 | E, R1 | Exclude<R, Context.Tag.Identifier<T>>>
  <A, E, R, T extends Context.Tag<any, any>, E1, R1>(
    self: STM<A, E, R>,
    tag: T,
    stm: STM<Context.Tag.Service<T>, E1, R1>
  ): STM<A, E | E1, R1 | Exclude<R, Context.Tag.Identifier<T>>>
} = stm.provideServiceSTM

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reduce: {
  <S, A, E, R>(zero: S, f: (s: S, a: A) => STM<S, E, R>): (iterable: Iterable<A>) => STM<S, E, R>
  <S, A, E, R>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM<S, E, R>): STM<S, E, R>
} = stm.reduce

/**
 * Reduces an `Iterable<STM>` to a single `STM`, working sequentially.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reduceAll: {
  <A, E2, R2>(
    initial: STM<A, E2, R2>,
    f: (x: A, y: A) => A
  ): <E, R>(iterable: Iterable<STM<A, E, R>>) => STM<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    iterable: Iterable<STM<A, E, R>>,
    initial: STM<A, E2, R2>,
    f: (x: A, y: A) => A
  ): STM<A, E | E2, R | R2>
} = stm.reduceAll

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from right to left.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reduceRight: {
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM<S, E, R>): (iterable: Iterable<A>) => STM<S, E, R>
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM<S, E, R>): STM<S, E, R>
} = stm.reduceRight

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @since 2.0.0
 * @category mutations
 */
export const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <A, R>(self: STM<A, E, R>) => STM<A, E2, R>
  <A, E, R, E2>(self: STM<A, E, R>, pf: (error: E) => Option.Option<E2>): STM<A, E2, R>
} = stm.refineOrDie

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const refineOrDieWith: {
  <E, E2>(pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): <A, R>(self: STM<A, E, R>) => STM<A, E2, R>
  <A, E, R, E2>(self: STM<A, E, R>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): STM<A, E2, R>
} = stm.refineOrDieWith

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const reject: {
  <A, E2>(pf: (a: A) => Option.Option<E2>): <E, R>(self: STM<A, E, R>) => STM<A, E2 | E, R>
  <A, E, R, E2>(self: STM<A, E, R>, pf: (a: A) => Option.Option<E2>): STM<A, E | E2, R>
} = stm.reject

/**
 * Continue with the returned computation if the specified partial function
 * matches, translating the successful match into a failure, otherwise continue
 * with our held value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const rejectSTM: {
  <A, E2, R2>(pf: (a: A) => Option.Option<STM<E2, E2, R2>>): <E, R>(self: STM<A, E, R>) => STM<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: STM<A, E, R>, pf: (a: A) => Option.Option<STM<E2, E2, R2>>): STM<A, E | E2, R | R2>
} = stm.rejectSTM

/**
 * Repeats this `STM` effect until its result satisfies the specified
 * predicate.
 *
 * **WARNING**: `repeatUntil` uses a busy loop to repeat the effect and will
 * consume a thread until it completes (it cannot yield). This is because STM
 * describes a single atomic transaction which must either complete, retry or
 * fail a transaction before yielding back to the Effect runtime.
 *   - Use `retryUntil` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually satisfy the predicate.
 *
 * @since 2.0.0
 * @category mutations
 */
export const repeatUntil: {
  <A>(predicate: Predicate<A>): <E, R>(self: STM<A, E, R>) => STM<A, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: Predicate<A>): STM<A, E, R>
} = stm.repeatUntil

/**
 * Repeats this `STM` effect while its result satisfies the specified
 * predicate.
 *
 * **WARNING**: `repeatWhile` uses a busy loop to repeat the effect and will
 * consume a thread until it completes (it cannot yield). This is because STM
 * describes a single atomic transaction which must either complete, retry or
 * fail a transaction before yielding back to the Effect runtime.
 *   - Use `retryWhile` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually not satisfy the
 *     predicate.
 *
 * @since 2.0.0
 * @category mutations
 */
export const repeatWhile: {
  <A>(predicate: Predicate<A>): <E, R>(self: STM<A, E, R>) => STM<A, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: Predicate<A>): STM<A, E, R>
} = stm.repeatWhile

/**
 * Replicates the given effect n times. If 0 or negative numbers are given, an
 * empty `Chunk` will be returned.
 *
 * @since 2.0.0
 * @category constructors
 */
export const replicate: {
  (n: number): <A, E, R>(self: STM<A, E, R>) => Array<STM<A, E, R>>
  <A, E, R>(self: STM<A, E, R>, n: number): Array<STM<A, E, R>>
} = stm.replicate

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @since 2.0.0
 * @category constructors
 */
export const replicateSTM: {
  (n: number): <A, E, R>(self: STM<A, E, R>) => STM<Array<A>, E, R>
  <A, E, R>(self: STM<A, E, R>, n: number): STM<Array<A>, E, R>
} = stm.replicateSTM

/**
 * Performs this transaction the specified number of times, discarding the
 * results.
 *
 * @since 2.0.0
 * @category constructors
 */
export const replicateSTMDiscard: {
  (n: number): <A, E, R>(self: STM<A, E, R>) => STM<void, E, R>
  <A, E, R>(self: STM<A, E, R>, n: number): STM<void, E, R>
} = stm.replicateSTMDiscard

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retry: STM<never> = core.retry

/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns `true` for the value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const retryUntil: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): <E, R>(self: STM<A, E, R>) => STM<B, E, R>
  <A>(predicate: Predicate<A>): <E, R>(self: STM<A, E, R>) => STM<A, E, R>
  <A, E, R, B extends A>(self: STM<A, E, R>, refinement: Refinement<A, B>): STM<B, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: Predicate<A>): STM<A, E, R>
} = stm.retryUntil

/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns `true` for the value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const retryWhile: {
  <A>(predicate: Predicate<A>): <E, R>(self: STM<A, E, R>) => STM<A, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: Predicate<A>): STM<A, E, R>
} = stm.retryWhile

/**
 * Converts an option on values into an option on errors.
 *
 * @since 2.0.0
 * @category getters
 */
export const some: <A, E, R>(self: STM<Option.Option<A>, E, R>) => STM<A, Option.Option<E>, R> = stm.some

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => STM<A> = core.succeed

/**
 * Returns an effect with the empty value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedNone: STM<Option.Option<never>> = stm.succeedNone

/**
 * Returns an effect with the optional value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => STM<Option.Option<A>> = stm.succeedSome

/**
 * Summarizes a `STM` effect by computing a provided value before and after
 * execution, and then combining the values to produce a summary, together
 * with the result of execution.
 *
 * @since 2.0.0
 * @category mutations
 */
export const summarized: {
  <A2, E2, R2, A3>(
    summary: STM<A2, E2, R2>,
    f: (before: A2, after: A2) => A3
  ): <A, E, R>(self: STM<A, E, R>) => STM<[A3, A], E2 | E, R2 | R>
  <A, E, R, A2, E2, R2, A3>(
    self: STM<A, E, R>,
    summary: STM<A2, E2, R2>,
    f: (before: A2, after: A2) => A3
  ): STM<[A3, A], E | E2, R | R2>
} = stm.summarized

/**
 * Suspends creation of the specified transaction lazily.
 *
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <A, E, R>(evaluate: LazyArg<STM<A, E, R>>) => STM<A, E, R> = stm.suspend

/**
 * Returns an `STM` effect that succeeds with the specified lazily evaluated
 * value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: () => A) => STM<A> = core.sync

/**
 * "Peeks" at the success of transactional effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, X, E2, R2>(f: (a: A) => STM<X, E2, R2>): <E, R>(self: STM<A, E, R>) => STM<A, E2 | E, R2 | R>
  <A, E, R, X, E2, R2>(self: STM<A, E, R>, f: (a: A) => STM<X, E2, R2>): STM<A, E | E2, R | R2>
} = stm.tap

/**
 * "Peeks" at both sides of an transactional effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapBoth: {
  <XE extends E, A2, E2, R2, XA extends A, A3, E3, R3, A, E>(
    options: { readonly onFailure: (error: XE) => STM<A2, E2, R2>; readonly onSuccess: (value: XA) => STM<A3, E3, R3> }
  ): <R>(self: STM<A, E, R>) => STM<A, E | E2 | E3, R2 | R3 | R>
  <A, E, R, XE extends E, A2, E2, R2, XA extends A, A3, E3, R3>(
    self: STM<A, E, R>,
    options: { readonly onFailure: (error: XE) => STM<A2, E2, R2>; readonly onSuccess: (value: XA) => STM<A3, E3, R3> }
  ): STM<A, E | E2 | E3, R | R2 | R3>
} = stm.tapBoth

/**
 * "Peeks" at the error of the transactional effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapError: {
  <E, X, E2, R2>(f: (error: NoInfer<E>) => STM<X, E2, R2>): <A, R>(self: STM<A, E, R>) => STM<A, E | E2, R2 | R>
  <A, E, R, X, E2, R2>(self: STM<A, E, R>, f: (error: E) => STM<X, E2, R2>): STM<A, E | E2, R | R2>
} = stm.tapError

const try_: {
  <A, E>(options: {
    readonly try: LazyArg<A>
    readonly catch: (u: unknown) => E
  }): STM<A, E>
  <A>(try_: LazyArg<A>): STM<A, unknown>
} = stm.try_

export {
  /**
   * Imports a synchronous side-effect into a pure value, translating any thrown
   * exceptions into typed failed effects.
   *
   * @since 2.0.0
   * @category constructors
   */
  try_ as try
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @since 2.0.0
 * @category mutations
 */
export const unless: {
  (predicate: LazyArg<boolean>): <A, E, R>(self: STM<A, E, R>) => STM<Option.Option<A>, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: LazyArg<boolean>): STM<Option.Option<A>, E, R>
} = stm.unless

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 *
 * @since 2.0.0
 * @category mutations
 */
export const unlessSTM: {
  <E2, R2>(predicate: STM<boolean, E2, R2>): <A, E, R>(self: STM<A, E, R>) => STM<Option.Option<A>, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: STM<A, E, R>, predicate: STM<boolean, E2, R2>): STM<Option.Option<A>, E | E2, R | R2>
} = stm.unlessSTM

/**
 * Converts an option on errors into an option on values.
 *
 * @since 2.0.0
 * @category getters
 */
export const unsome: <A, E, R>(self: STM<A, Option.Option<E>, R>) => STM<Option.Option<A>, E, R> = stm.unsome

const void_: STM<void> = stm.void
export {
  /**
   * Returns an `STM` effect that succeeds with `void`.
   *
   * @since 2.0.0
   * @category constructors
   */
  void_ as void
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `STM.partition`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const validateAll: {
  <A, B, E, R>(f: (a: A) => STM<B, E, R>): (elements: Iterable<A>) => STM<Array<B>, [E, ...Array<E>], R>
  <A, B, E, R>(elements: Iterable<A>, f: (a: A) => STM<B, E, R>): STM<Array<B>, [E, ...Array<E>], R>
} = stm.validateAll

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @since 2.0.0
 * @category mutations
 */
export const validateFirst: {
  <A, B, E, R>(f: (a: A) => STM<B, E, R>): (elements: Iterable<A>) => STM<B, Array<E>, R>
  <A, B, E, R>(elements: Iterable<A>, f: (a: A) => STM<B, E, R>): STM<B, Array<E>, R>
} = stm.validateFirst

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const when: {
  (predicate: LazyArg<boolean>): <A, E, R>(self: STM<A, E, R>) => STM<Option.Option<A>, E, R>
  <A, E, R>(self: STM<A, E, R>, predicate: LazyArg<boolean>): STM<Option.Option<A>, E, R>
} = stm.when

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @since 2.0.0
 * @category mutations
 */
export const whenSTM: {
  <E2, R2>(predicate: STM<boolean, E2, R2>): <A, E, R>(self: STM<A, E, R>) => STM<Option.Option<A>, E2 | E, R2 | R>
  <A, E, R, E2, R2>(self: STM<A, E, R>, predicate: STM<boolean, E2, R2>): STM<Option.Option<A>, E | E2, R | R2>
} = stm.whenSTM

/**
 * Sequentially zips this value with the specified one.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <A1, E1, R1>(that: STM<A1, E1, R1>): <A, E, R>(self: STM<A, E, R>) => STM<[A, A1], E1 | E, R1 | R>
  <A, E, R, A1, E1, R1>(self: STM<A, E, R>, that: STM<A1, E1, R1>): STM<[A, A1], E | E1, R | R1>
} = core.zip

/**
 * Sequentially zips this value with the specified one, discarding the second
 * element of the tuple.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <A1, E1, R1>(that: STM<A1, E1, R1>): <A, E, R>(self: STM<A, E, R>) => STM<A, E1 | E, R1 | R>
  <A, E, R, A1, E1, R1>(self: STM<A, E, R>, that: STM<A1, E1, R1>): STM<A, E | E1, R | R1>
} = core.zipLeft

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <A1, E1, R1>(that: STM<A1, E1, R1>): <A, E, R>(self: STM<A, E, R>) => STM<A1, E1 | E, R1 | R>
  <A, E, R, A1, E1, R1>(self: STM<A, E, R>, that: STM<A1, E1, R1>): STM<A1, E | E1, R | R1>
} = core.zipRight

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <A1, E1, R1, A, A2>(
    that: STM<A1, E1, R1>,
    f: (a: A, b: A1) => A2
  ): <E, R>(self: STM<A, E, R>) => STM<A2, E1 | E, R1 | R>
  <A, E, R, A1, E1, R1, A2>(self: STM<A, E, R>, that: STM<A1, E1, R1>, f: (a: A, b: A1) => A2): STM<A2, E | E1, R | R1>
} = core.zipWith

/**
 * This function takes an iterable of `STM` values and returns a new
 * `STM` value that represents the first `STM` value in the iterable
 * that succeeds. If all of the `Effect` values in the iterable fail, then
 * the resulting `STM` value will fail as well.
 *
 * This function is sequential, meaning that the `STM` values in the
 * iterable will be executed in sequence, and the first one that succeeds
 * will determine the outcome of the resulting `STM` value.
 *
 * @param effects - The iterable of `STM` values to evaluate.
 *
 * @returns A new `STM` value that represents the first successful
 * `STM` value in the iterable, or a failed `STM` value if all of the
 * `STM` values in the iterable fail.
 *
 * @since 2.0.0
 * @category elements
 */
export const firstSuccessOf = <A, E, R>(effects: Iterable<STM<A, E, R>>): STM<A, E, R> =>
  suspend<A, E, R>(() => {
    const list = Chunk.fromIterable(effects)
    if (!Chunk.isNonEmpty(list)) {
      return dieSync(() => new Cause.IllegalArgumentException(`Received an empty collection of effects`))
    }
    return Chunk.reduce(
      Chunk.tailNonEmpty(list),
      Chunk.headNonEmpty(list),
      (left, right) => orElse(left, () => right)
    )
  })

/**
 * @category do notation
 * @since 2.0.0
 */
export const Do: STM<{}> = succeed({})

/**
 * @category do notation
 * @since 2.0.0
 */
export const bind: {
  <N extends string, K, A, E2, R2>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM<A, E2, R2>
  ): <E, R>(self: STM<K, E, R>) => STM<MergeRecord<K, { [k in N]: A }>, E2 | E, R2 | R>
  <K, E, R, N extends string, A, E2, R2>(
    self: STM<K, E, R>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM<A, E2, R2>
  ): STM<MergeRecord<K, { [k in N]: A }>, E | E2, R | R2>
} = stm.bind

const let_: {
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): <E, R>(self: STM<K, E, R>) => STM<MergeRecord<K, { [k in N]: A }>, E, R>
  <K, E, R, N extends string, A>(
    self: STM<K, E, R>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): STM<MergeRecord<K, { [k in N]: A }>, E, R>
} = stm.let_

export {
  /**
   * @category do notation
   * @since 2.0.0
   */
  let_ as let
}

/**
 * @category do notation
 * @since 2.0.0
 */
export const bindTo: {
  <N extends string>(tag: N): <A, E, R>(self: STM<A, E, R>) => STM<Record<N, A>, E, R>
  <A, E, R, N extends string>(self: STM<A, E, R>, tag: N): STM<Record<N, A>, E, R>
} = stm.bindTo

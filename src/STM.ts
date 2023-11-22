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
import type * as Types from "./Types.js"
import type * as Unify from "./Unify.js"

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
 * `STM<R, E, A>` represents an effect that can be performed transactionally,
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
export interface STM<out R, out E, out A> extends Effect.Effect<R, E, A>, STM.Variance<R, E, A>, Pipeable {
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: STMUnify<this>
  [Unify.ignoreSymbol]?: STMUnifyIgnore
}

/**
 * @since 2.0.0
 * @category models
 */
export interface STMUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  STM?: () => A[Unify.typeSymbol] extends STM<infer R0, infer E0, infer A0> | infer _ ? STM<R0, E0, A0> : never
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
  readonly type: STM<this["Out2"], this["Out1"], this["Target"]>
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Context.js" {
  interface Tag<Identifier, Service> extends STM<Identifier, never, Service> {}
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Either.js" {
  interface Left<E, A> extends STM<never, E, A> {
    readonly _tag: "Left"
  }
  interface Right<E, A> extends STM<never, E, A> {
    readonly _tag: "Right"
  }
}

/**
 * @since 2.0.0
 * @category models
 */
declare module "./Option.js" {
  interface None<A> extends STM<never, Cause.NoSuchElementException, A> {
    readonly _tag: "None"
  }
  interface Some<A> extends STM<never, Cause.NoSuchElementException, A> {
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
  export interface Variance<out R, out E, out A> {
    readonly [STMTypeId]: {
      readonly _R: Types.Covariant<R>
      readonly _E: Types.Covariant<E>
      readonly _A: Types.Covariant<A>
    }
  }
}

/**
 * @category models
 * @since 2.0.0
 */
export interface STMGen<out R, out E, out A> {
  readonly _R: () => R
  readonly _E: () => E
  readonly _A: () => A
  readonly value: STM<R, E, A>
  [Symbol.iterator](): Generator<STMGen<R, E, A>, A>
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
  <A, R2, E2, A2, R3, E3, A3>(
    use: (resource: A) => STM<R2, E2, A2>,
    release: (resource: A) => STM<R3, E3, A3>
  ): <R, E>(
    acquire: STM<R, E, A>
  ) => Effect.Effect<R2 | R3 | R, E2 | E3 | E, A2>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    acquire: STM<R, E, A>,
    use: (resource: A) => STM<R2, E2, A2>,
    release: (resource: A) => STM<R3, E3, A3>
  ): Effect.Effect<R | R2 | R3, E | E2 | E3, A2>
} = stm.acquireUseRelease

/**
 * @since 2.0.0
 * @category utils
 */
export declare namespace All {
  type STMAny = STM<any, any, any>

  type ReturnTuple<T extends ReadonlyArray<STM<any, any, any>>, Discard extends boolean> = STM<
    T[number] extends never ? never
      : [T[number]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never,
    T[number] extends never ? never
      : [T[number]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    Discard extends true ? void
      : T[number] extends never ? []
      : { -readonly [K in keyof T]: [T[K]] extends [STM<infer _R, infer _E, infer A>] ? A : never }
  > extends infer X ? X : never

  type ReturnIterable<T extends Iterable<STMAny>, Discard extends boolean> = [T] extends
    [Iterable<STM.Variance<infer R, infer E, infer A>>] ? STM<R, E, Discard extends true ? void : Array<A>> : never

  type ReturnObject<T extends Record<string, STMAny>, Discard extends boolean> = STM<
    keyof T extends never ? never
      : [T[keyof T]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never,
    keyof T extends never ? never
      : [T[keyof T]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    Discard extends true ? void
      : { -readonly [K in keyof T]: [T[K]] extends [STM.Variance<infer _R, infer _E, infer A>] ? A : never }
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
  <A2>(value: A2): <R, E, A>(self: STM<R, E, A>) => STM<R, E, A2>
  <R, E, A, A2>(self: STM<R, E, A>, value: A2): STM<R, E, A2>
} = stm.as

/**
 * Maps the success value of this effect to an optional value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asSome: <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>> = stm.asSome

/**
 * Maps the error value of this effect to an optional value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asSomeError: <R, E, A>(self: STM<R, E, A>) => STM<R, Option.Option<E>, A> = stm.asSomeError

/**
 * This function maps the success value of an `STM` to `void`. If the original
 * `STM` succeeds, the returned `STM` will also succeed. If the original `STM`
 * fails, the returned `STM` will fail with the same error.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asUnit: <R, E, A>(self: STM<R, E, A>) => STM<R, E, void> = stm.asUnit

/**
 * Creates an `STM` value from a partial (but pure) function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const attempt: <A>(evaluate: LazyArg<A>) => STM<never, unknown, A> = stm.attempt

/**
 * Recovers from all errors.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchAll: {
  <E, R1, E1, B>(f: (e: E) => STM<R1, E1, B>): <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1, B | A>
  <R, A, E, R1, E1, B>(self: STM<R, E, A>, f: (e: E) => STM<R1, E1, B>): STM<R | R1, E1, A | B>
} = core.catchAll

/**
 * Recovers from some or all of the error cases.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchSome: {
  <E, R2, E2, A2>(
    pf: (error: E) => Option.Option<STM<R2, E2, A2>>
  ): <R, A>(
    self: STM<R, E, A>
  ) => STM<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: STM<R, E, A>,
    pf: (error: E) => Option.Option<STM<R2, E2, A2>>
  ): STM<R | R2, E | E2, A | A2>
} = stm.catchSome

/**
 * Recovers from the specified tagged error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
  ): <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, R1, E1, A1>(
    self: STM<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
  ): STM<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
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
  ): <R, A>(
    self: STM<R, E, A>
  ) => STM<
    | R
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<infer R, any, any> ? R : never }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, infer E, any> ? E : never }[keyof Cases],
    | A
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, any, infer A> ? A : never }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => STM<any, any, any>) }
  >(
    self: STM<R, E, A>,
    cases: Cases
  ): STM<
    | R
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<infer R, any, any> ? R : never }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, infer E, any> ? E : never }[keyof Cases],
    | A
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, any, infer A> ? A : never }[keyof Cases]
  >
} = stm.catchTags

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 *
 * @since 2.0.0
 * @category constructors
 */
export const check: (predicate: LazyArg<boolean>) => STM<never, never, void> = stm.check

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @since 2.0.0
 * @category mutations
 */
export const collect: {
  <A, A2>(pf: (a: A) => Option.Option<A2>): <R, E>(self: STM<R, E, A>) => STM<R, E, A2>
  <R, E, A, A2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<A2>): STM<R, E, A2>
} = stm.collect

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @since 2.0.0
 * @category mutations
 */
export const collectSTM: {
  <A, R2, E2, A2>(pf: (a: A) => Option.Option<STM<R2, E2, A2>>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<STM<R2, E2, A2>>): STM<R | R2, E | E2, A2>
} = stm.collectSTM

/**
 * Commits this transaction atomically.
 *
 * @since 2.0.0
 * @category destructors
 */
export const commit: <R, E, A>(self: STM<R, E, A>) => Effect.Effect<R, E, A> = core.commit

/**
 * Commits this transaction atomically, regardless of whether the transaction
 * is a success or a failure.
 *
 * @since 2.0.0
 * @category destructors
 */
export const commitEither: <R, E, A>(self: STM<R, E, A>) => Effect.Effect<R, E, A> = stm.commitEither

/**
 * Similar to Either.cond, evaluate the predicate, return the given A as
 * success if predicate returns true, and the given E as error otherwise
 *
 * @since 2.0.0
 * @category constructors
 */
export const cond: <E, A>(predicate: LazyArg<boolean>, error: LazyArg<E>, result: LazyArg<A>) => STM<never, E, A> =
  stm.cond

/**
 * Retrieves the environment inside an stm.
 *
 * @since 2.0.0
 * @category constructors
 */
export const context: <R>() => STM<R, never, Context.Context<R>> = core.context

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWith: <R0, R>(f: (environment: Context.Context<R0>) => R) => STM<R0, never, R> = core.contextWith

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const contextWithSTM: <R0, R, E, A>(
  f: (environment: Context.Context<R0>) => STM<R, E, A>
) => STM<R0 | R, E, A> = core.contextWithSTM

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <E, A>(self: STM<R, E, A>) => STM<R0, E, A>
  <E, A, R0, R>(self: STM<R, E, A>, f: (context: Context.Context<R0>) => Context.Context<R>): STM<R0, E, A>
} = core.mapInputContext

/**
 * Fails the transactional effect with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => STM<never, never, never> = core.die

/**
 * Kills the fiber running the effect with a `Cause.RuntimeException` that
 * contains the specified message.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => STM<never, never, never> = core.dieMessage

/**
 * Fails the transactional effect with the specified lazily evaluated defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => STM<never, never, never> = core.dieSync

/**
 * Converts the failure channel into an `Either`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const either: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Either.Either<E, A>> = stm.either

/**
 * Executes the specified finalization transaction whether or not this effect
 * succeeds. Note that as with all STM transactions, if the full transaction
 * fails, everything will be rolled back.
 *
 * @since 2.0.0
 * @category finalization
 */
export const ensuring: {
  <R1, B>(finalizer: STM<R1, never, B>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E, A>
  <R, E, A, R1, B>(self: STM<R, E, A>, finalizer: STM<R1, never, B>): STM<R | R1, E, A>
} = core.ensuring

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @since 2.0.0
 * @category mutations
 */
export const eventually: <R, E, A>(self: STM<R, E, A>) => STM<R, E, A> = stm.eventually

/**
 * Determines whether all elements of the `Iterable<A>` satisfy the effectual
 * predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const every: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, boolean>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, boolean>
} = stm.every

/**
 * Determines whether any element of the `Iterable[A]` satisfies the effectual
 * predicate `f`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const exists: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, boolean>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, boolean>
} = stm.exists

/**
 * Fails the transactional effect with the specified error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => STM<never, E, never> = core.fail

/**
 * Fails the transactional effect with the specified lazily evaluated error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => STM<never, E, never> = core.failSync

/**
 * Returns the fiber id of the fiber committing the transaction.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fiberId: STM<never, never, FiberId.FiberId> = stm.fiberId

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const filter: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, Array<A>>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, Array<A>>
} = stm.filter

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @since 2.0.0
 * @category constructors
 */
export const filterNot: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, Array<A>>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, Array<A>>
} = stm.filterNot

/**
 * Dies with specified defect if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrDie: {
  <A, B extends A>(refinement: Refinement<A, B>, defect: LazyArg<unknown>): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
  <A, X extends A>(predicate: Predicate<X>, defect: LazyArg<unknown>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A, B extends A>(self: STM<R, E, A>, refinement: Refinement<A, B>, defect: LazyArg<unknown>): STM<R, E, B>
  <R, E, A, X extends A>(self: STM<R, E, A>, predicate: Predicate<X>, defect: LazyArg<unknown>): STM<R, E, A>
} = stm.filterOrDie

/**
 * Dies with a `Cause.RuntimeException` having the specified  message if the
 * predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrDieMessage: {
  <A, B extends A>(refinement: Refinement<A, B>, message: string): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
  <A, X extends A>(predicate: Predicate<X>, message: string): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A, B extends A>(self: STM<R, E, A>, refinement: Refinement<A, B>, message: string): STM<R, E, B>
  <R, E, A, X extends A>(self: STM<R, E, A>, predicate: Predicate<X>, message: string): STM<R, E, A>
} = stm.filterOrDieMessage

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrElse: {
  <A, B extends A, X extends A, R2, E2, A2>(
    refinement: Refinement<A, B>,
    orElse: (a: X) => STM<R2, E2, A2>
  ): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, B | A2>
  <A, X extends A, Y extends A, R2, E2, A2>(
    predicate: Predicate<X>,
    orElse: (a: Y) => STM<R2, E2, A2>
  ): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A | A2>
  <R, E, A, B extends A, X extends A, R2, E2, A2>(
    self: STM<R, E, A>,
    refinement: Refinement<A, B>,
    orElse: (a: X) => STM<R2, E2, A2>
  ): STM<R | R2, E | E2, B | A2>
  <R, E, A, X extends A, Y extends A, R2, E2, A2>(
    self: STM<R, E, A>,
    predicate: Predicate<X>,
    orElse: (a: Y) => STM<R2, E2, A2>
  ): STM<R | R2, E | E2, A | A2>
} = stm.filterOrElse

/**
 * Fails with the specified error if the predicate fails.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterOrFail: {
  <A, B extends A, X extends A, E2>(
    refinement: Refinement<A, B>,
    orFailWith: (a: X) => E2
  ): <R, E>(self: STM<R, E, A>) => STM<R, E2 | E, B>
  <A, X extends A, Y extends A, E2>(
    predicate: Predicate<X>,
    orFailWith: (a: Y) => E2
  ): <R, E>(self: STM<R, E, A>) => STM<R, E2 | E, A>
  <R, E, A, B extends A, X extends A, E2>(
    self: STM<R, E, A>,
    refinement: Refinement<A, B>,
    orFailWith: (a: X) => E2
  ): STM<R, E | E2, B>
  <R, E, A, X extends A, Y extends A, E2>(
    self: STM<R, E, A>,
    predicate: Predicate<X>,
    orFailWith: (a: Y) => E2
  ): STM<R, E | E2, A>
} = stm.filterOrFail

/**
 * Feeds the value produced by this effect to the specified function, and then
 * runs the returned effect as well to produce its results.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, R1, E1, A2>(f: (a: A) => STM<R1, E1, A2>): <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A2>
  <R, E, A, R1, E1, A2>(self: STM<R, E, A>, f: (a: A) => STM<R1, E1, A2>): STM<R | R1, E | E1, A2>
} = core.flatMap

/**
 * Flattens out a nested `STM` effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <R, E, R2, E2, A>(self: STM<R, E, STM<R2, E2, A>>) => STM<R | R2, E | E2, A> = stm.flatten

/**
 * Flips the success and failure channels of this transactional effect. This
 * allows you to use all methods on the error channel, possibly before
 * flipping back.
 *
 * @since 2.0.0
 * @category mutations
 */
export const flip: <R, E, A>(self: STM<R, E, A>) => STM<R, A, E> = stm.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @since 2.0.0
 * @category mutations
 */
export const flipWith: {
  <R, A, E, R2, A2, E2>(f: (stm: STM<R, A, E>) => STM<R2, A2, E2>): (self: STM<R, E, A>) => STM<R | R2, E | E2, A | A2>
  <R, A, E, R2, A2, E2>(self: STM<R, E, A>, f: (stm: STM<R, A, E>) => STM<R2, A2, E2>): STM<R | R2, E | E2, A | A2>
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
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): <R>(self: STM<R, E, A>) => STM<R, never, A2 | A3>
  <R, E, A2, A, A3>(
    self: STM<R, E, A>,
    options: {
      readonly onFailure: (error: E) => A2
      readonly onSuccess: (value: A) => A3
    }
  ): STM<R, never, A2 | A3>
} = stm.match

/**
 * Effectfully folds over the `STM` effect, handling both failure and success.
 *
 * @since 2.0.0
 * @category folding
 */
export const matchSTM: {
  <E, R1, E1, A1, A, R2, E2, A2>(
    options: {
      readonly onFailure: (e: E) => STM<R1, E1, A1>
      readonly onSuccess: (a: A) => STM<R2, E2, A2>
    }
  ): <R>(self: STM<R, E, A>) => STM<R1 | R2 | R, E1 | E2, A1 | A2>
  <R, E, R1, E1, A1, A, R2, E2, A2>(
    self: STM<R, E, A>,
    options: {
      readonly onFailure: (e: E) => STM<R1, E1, A1>
      readonly onSuccess: (a: A) => STM<R2, E2, A2>
    }
  ): STM<R | R1 | R2, E1 | E2, A1 | A2>
} = core.matchSTM

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * a transactional effect that produces a new `Chunk<A2>`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <A, R, E, A2>(
    f: (a: A) => STM<R, E, A2>,
    options?: {
      readonly discard?: false | undefined
    }
  ): (elements: Iterable<A>) => STM<R, E, Array<A2>>
  <A, R, E, A2>(
    f: (a: A) => STM<R, E, A2>,
    options: {
      readonly discard: true
    }
  ): (elements: Iterable<A>) => STM<R, E, void>
  <A, R, E, A2>(
    elements: Iterable<A>,
    f: (a: A) => STM<R, E, A2>,
    options?: {
      readonly discard?: false | undefined
    }
  ): STM<R, E, Array<A2>>
  <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM<R, E, A2>, options: {
    readonly discard: true
  }): STM<R, E, void>
} = stm.forEach

/**
 * Lifts an `Either` into a `STM`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => STM<never, E, A> = stm.fromEither

/**
 * Lifts an `Option` into a `STM`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromOption: <A>(option: Option.Option<A>) => STM<never, Option.Option<never>, A> = stm.fromOption

/**
 * @since 2.0.0
 * @category models
 */
export interface Adapter {
  <R, E, A>(self: STM<R, E, A>): STMGen<R, E, A>
  <A, _R, _E, _A>(a: A, ab: (a: A) => STM<_R, _E, _A>): STMGen<_R, _E, _A>
  <A, B, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => STM<_R, _E, _A>): STMGen<_R, _E, _A>
  <A, B, C, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => STM<_R, _E, _A>): STMGen<_R, _E, _A>
  <A, B, C, D, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: F) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    ij: (i: I) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    jk: (j: J) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    kl: (k: K) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    lm: (l: L) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    mn: (m: M) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    no: (n: N) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    op: (o: O) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    pq: (p: P) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    qr: (q: Q) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    rs: (r: R) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    st: (s: S) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
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
    tu: (s: T) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const gen: <Eff extends STMGen<any, any, any>, AEff>(
  f: (resume: Adapter) => Generator<Eff, AEff, any>
) => STM<
  [Eff] extends [never] ? never : [Eff] extends [STMGen<infer R, any, any>] ? R : never,
  [Eff] extends [never] ? never : [Eff] extends [STMGen<any, infer E, any>] ? E : never,
  AEff
> = stm.gen

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 *
 * @since 2.0.0
 * @category getters
 */
export const head: <R, E, A>(self: STM<R, E, Iterable<A>>) => STM<R, Option.Option<E>, A> = stm.head

const if_: {
  <R1, R2, E1, E2, A, A1>(
    options: {
      readonly onTrue: STM<R1, E1, A>
      readonly onFalse: STM<R2, E2, A1>
    }
  ): <R = never, E = never>(self: boolean | STM<R, E, boolean>) => STM<R1 | R2 | R, E1 | E2 | E, A | A1>
  <R, E, R1, R2, E1, E2, A, A1>(
    self: boolean,
    options: {
      readonly onTrue: STM<R1, E1, A>
      readonly onFalse: STM<R2, E2, A1>
    }
  ): STM<R | R1 | R2, E | E1 | E2, A | A1>
  <R, E, R1, R2, E1, E2, A, A1>(
    self: STM<R, E, boolean>,
    options: {
      readonly onTrue: STM<R1, E1, A>
      readonly onFalse: STM<R2, E2, A1>
    }
  ): STM<R | R1 | R2, E | E1 | E2, A | A1>
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
export const ignore: <R, E, A>(self: STM<R, E, A>) => STM<R, never, void> = stm.ignore

/**
 * Interrupts the fiber running the effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interrupt: STM<never, never, never> = core.interrupt

/**
 * Interrupts the fiber running the effect with the specified `FiberId`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interruptAs: (fiberId: FiberId.FiberId) => STM<never, never, never> = core.interruptAs

/**
 * Returns whether this transactional effect is a failure.
 *
 * @since 2.0.0
 * @category getters
 */
export const isFailure: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean> = stm.isFailure

/**
 * Returns whether this transactional effect is a success.
 *
 * @since 2.0.0
 * @category getters
 */
export const isSuccess: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean> = stm.isSuccess

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
export const iterate: <R, E, Z>(
  initial: Z,
  options: {
    readonly while: Predicate<Z>
    readonly body: (z: Z) => STM<R, E, Z>
  }
) => STM<R, E, Z> = stm.iterate

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
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: Predicate<Z>
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM<R, E, A>
      readonly discard?: false | undefined
    }
  ): STM<R, E, Array<A>>
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: Predicate<Z>
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM<R, E, A>
      readonly discard: true
    }
  ): STM<R, E, void>
} = stm.loop

/**
 * Maps the value produced by the effect.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
  <R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, E, B>
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
  <A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, unknown, B>
  <R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, unknown, B>
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
    options: {
      readonly onFailure: (error: E) => E2
      readonly onSuccess: (value: A) => A2
    }
  ): <R>(self: STM<R, E, A>) => STM<R, E2, A2>
  <R, E, E2, A, A2>(
    self: STM<R, E, A>,
    options: {
      readonly onFailure: (error: E) => E2
      readonly onSuccess: (value: A) => A2
    }
  ): STM<R, E2, A2>
} = stm.mapBoth

/**
 * Maps from one error type to another.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (error: E) => E2): <R, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, A, E, E2>(self: STM<R, E, A>, f: (error: E) => E2): STM<R, E2, A>
} = stm.mapError

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @since 2.0.0
 * @category mutations
 */
export const merge: <R, E, A>(self: STM<R, E, A>) => STM<R, never, E | A> = stm.merge

/**
 * Merges an `Iterable<STM>` to a single `STM`, working sequentially.
 *
 * @since 2.0.0
 * @category constructors
 */
export const mergeAll: {
  <A2, A>(zero: A2, f: (a2: A2, a: A) => A2): <R, E>(iterable: Iterable<STM<R, E, A>>) => STM<R, E, A2>
  <R, E, A2, A>(iterable: Iterable<STM<R, E, A>>, zero: A2, f: (a2: A2, a: A) => A2): STM<R, E, A2>
} = stm.mergeAll

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @since 2.0.0
 * @category mutations
 */
export const negate: <R, E>(self: STM<R, E, boolean>) => STM<R, E, boolean> = stm.negate

/**
 * Requires the option produced by this value to be `None`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const none: <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, Option.Option<E>, void> = stm.none

/**
 * Converts the failure channel into an `Option`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const option: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Option.Option<A>> = stm.option

/**
 * Translates `STM` effect failure into death of the fiber, making all
 * failures unchecked and not a part of the type of the effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDie: <R, E, A>(self: STM<R, E, A>) => STM<R, never, A> = stm.orDie

/**
 * Keeps none of the errors, and terminates the fiber running the `STM` effect
 * with them, using the specified function to convert the `E` into a defect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <R, A>(self: STM<R, E, A>) => STM<R, never, A>
  <R, A, E>(self: STM<R, E, A>, f: (error: E) => unknown): STM<R, never, A>
} = stm.orDieWith

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElse: {
  <R2, E2, A2>(that: LazyArg<STM<R2, E2, A2>>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: STM<R, E, A>, that: LazyArg<STM<R2, E2, A2>>): STM<R | R2, E2, A | A2>
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
  <R2, E2, A2>(that: LazyArg<STM<R2, E2, A2>>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2, Either.Either<A, A2>>
  <R, E, A, R2, E2, A2>(self: STM<R, E, A>, that: LazyArg<STM<R2, E2, A2>>): STM<R | R2, E2, Either.Either<A, A2>>
} = stm.orElseEither

/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, E, A, E2>(self: STM<R, E, A>, error: LazyArg<E2>): STM<R, E2, A>
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
  <R2, E2, A2>(
    that: LazyArg<STM<R2, Option.Option<E2>, A2>>
  ): <R, E, A>(
    self: STM<R, Option.Option<E>, A>
  ) => STM<R2 | R, Option.Option<E2 | E>, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: STM<R, Option.Option<E>, A>,
    that: LazyArg<STM<R2, Option.Option<E2>, A2>>
  ): STM<R | R2, Option.Option<E | E2>, A | A2>
} = stm.orElseOptional

/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orElseSucceed: {
  <A2>(value: LazyArg<A2>): <R, E, A>(self: STM<R, E, A>) => STM<R, never, A2 | A>
  <R, E, A, A2>(self: STM<R, E, A>, value: LazyArg<A2>): STM<R, never, A | A2>
} = stm.orElseSucceed

/**
 * Tries this effect first, and if it enters retry, then it tries the other
 * effect. This is an equivalent of Haskell's orElse.
 *
 * @since 2.0.0
 * @category error handling
 */
export const orTry: {
  <R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1 | A>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: LazyArg<STM<R1, E1, A1>>): STM<R | R1, E | E1, A | A1>
} = core.orTry

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @since 2.0.0
 * @category traversing
 */
export const partition: {
  <R, E, A, A2>(
    f: (a: A) => STM<R, E, A2>
  ): (elements: Iterable<A>) => STM<R, never, [excluded: Array<E>, satisfying: Array<A2>]>
  <R, E, A, A2>(
    elements: Iterable<A>,
    f: (a: A) => STM<R, E, A2>
  ): STM<R, never, [excluded: Array<E>, satisfying: Array<A2>]>
} = stm.partition

/**
 * Provides the transaction its required environment, which eliminates its
 * dependency on `R`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(env: Context.Context<R>): <E, A>(self: STM<R, E, A>) => STM<never, E, A>
  <E, A, R>(self: STM<R, E, A>, env: Context.Context<R>): STM<never, E, A>
} = stm.provideContext

/**
 * Splits the context into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @since 2.0.0
 * @category context
 */
export const provideSomeContext: {
  <R>(context: Context.Context<R>): <R1, E, A>(self: STM<R1, E, A>) => STM<Exclude<R1, R>, E, A>
  <R, R1, E, A>(self: STM<R1, E, A>, context: Context.Context<R>): STM<Exclude<R1, R>, E, A>
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
  ): <R, E, A>(self: STM<R, E, A>) => STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(
    self: STM<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ): STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>
} = stm.provideService

/**
 * Provides the effect with the single service it requires. If the transactional
 * effect requires more than one service use `provideEnvironment` instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideServiceSTM: {
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    stm: STM<R1, E1, Context.Tag.Service<T>>
  ): <R, E, A>(self: STM<R, E, A>) => STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: STM<R, E, A>,
    tag: T,
    stm: STM<R1, E1, Context.Tag.Service<T>>
  ): STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>
} = stm.provideServiceSTM

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reduce: {
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM<R, E, S>): (iterable: Iterable<A>) => STM<R, E, S>
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM<R, E, S>): STM<R, E, S>
} = stm.reduce

/**
 * Reduces an `Iterable<STM>` to a single `STM`, working sequentially.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reduceAll: {
  <R2, E2, A>(
    initial: STM<R2, E2, A>,
    f: (x: A, y: A) => A
  ): <R, E>(
    iterable: Iterable<STM<R, E, A>>
  ) => STM<R2 | R, E2 | E, A>
  <R, E, R2, E2, A>(
    iterable: Iterable<STM<R, E, A>>,
    initial: STM<R2, E2, A>,
    f: (x: A, y: A) => A
  ): STM<R | R2, E | E2, A>
} = stm.reduceAll

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from right to left.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reduceRight: {
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM<R, E, S>): (iterable: Iterable<A>) => STM<R, E, S>
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM<R, E, S>): STM<R, E, S>
} = stm.reduceRight

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @since 2.0.0
 * @category mutations
 */
export const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, A, E, E2>(self: STM<R, E, A>, pf: (error: E) => Option.Option<E2>): STM<R, E2, A>
} = stm.refineOrDie

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const refineOrDieWith: {
  <E, E2>(pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): <R, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, A, E, E2>(self: STM<R, E, A>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): STM<R, E2, A>
} = stm.refineOrDieWith

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const reject: {
  <A, E2>(pf: (a: A) => Option.Option<E2>): <R, E>(self: STM<R, E, A>) => STM<R, E2 | E, A>
  <R, E, A, E2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<E2>): STM<R, E | E2, A>
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
  <A, R2, E2>(pf: (a: A) => Option.Option<STM<R2, E2, E2>>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<STM<R2, E2, E2>>): STM<R | R2, E | E2, A>
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
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
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
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
} = stm.repeatWhile

/**
 * Replicates the given effect n times. If 0 or negative numbers are given, an
 * empty `Chunk` will be returned.
 *
 * @since 2.0.0
 * @category constructors
 */
export const replicate: {
  (n: number): <R, E, A>(self: STM<R, E, A>) => Array<STM<R, E, A>>
  <R, E, A>(self: STM<R, E, A>, n: number): Array<STM<R, E, A>>
} = stm.replicate

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @since 2.0.0
 * @category constructors
 */
export const replicateSTM: {
  (n: number): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Array<A>>
  <R, E, A>(self: STM<R, E, A>, n: number): STM<R, E, Array<A>>
} = stm.replicateSTM

/**
 * Performs this transaction the specified number of times, discarding the
 * results.
 *
 * @since 2.0.0
 * @category constructors
 */
export const replicateSTMDiscard: {
  (n: number): <R, E, A>(self: STM<R, E, A>) => STM<R, E, void>
  <R, E, A>(self: STM<R, E, A>, n: number): STM<R, E, void>
} = stm.replicateSTMDiscard

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 *
 * @since 2.0.0
 * @category error handling
 */
export const retry: STM<never, never, never> = core.retry

/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns `true` for the value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const retryUntil: {
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
} = stm.retryUntil

/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns `true` for the value.
 *
 * @since 2.0.0
 * @category mutations
 */
export const retryWhile: {
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
} = stm.retryWhile

/**
 * Converts an option on values into an option on errors.
 *
 * @since 2.0.0
 * @category getters
 */
export const some: <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, Option.Option<E>, A> = stm.some

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => STM<never, never, A> = core.succeed

/**
 * Returns an effect with the empty value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedNone: STM<never, never, Option.Option<never>> = stm.succeedNone

/**
 * Returns an effect with the optional value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => STM<never, never, Option.Option<A>> = stm.succeedSome

/**
 * Summarizes a `STM` effect by computing a provided value before and after
 * execution, and then combining the values to produce a summary, together
 * with the result of execution.
 *
 * @since 2.0.0
 * @category mutations
 */
export const summarized: {
  <R2, E2, A2, A3>(
    summary: STM<R2, E2, A2>,
    f: (before: A2, after: A2) => A3
  ): <R, E, A>(
    self: STM<R, E, A>
  ) => STM<R2 | R, E2 | E, [A3, A]>
  <R, E, A, R2, E2, A2, A3>(
    self: STM<R, E, A>,
    summary: STM<R2, E2, A2>,
    f: (before: A2, after: A2) => A3
  ): STM<R | R2, E | E2, [A3, A]>
} = stm.summarized

/**
 * Suspends creation of the specified transaction lazily.
 *
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <R, E, A>(evaluate: LazyArg<STM<R, E, A>>) => STM<R, E, A> = stm.suspend

/**
 * Returns an `STM` effect that succeeds with the specified lazily evaluated
 * value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: () => A) => STM<never, never, A> = core.sync

/**
 * "Peeks" at the success of transactional effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, X extends A, R2, E2, _>(f: (a: X) => STM<R2, E2, _>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2, _>(self: STM<R, E, A>, f: (a: X) => STM<R2, E2, _>): STM<R | R2, E | E2, A>
} = stm.tap

/**
 * "Peeks" at both sides of an transactional effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapBoth: {
  <E, XE extends E, R2, E2, A2, A, XA extends A, R3, E3, A3>(
    options: {
      readonly onFailure: (error: XE) => STM<R2, E2, A2>
      readonly onSuccess: (value: XA) => STM<R3, E3, A3>
    }
  ): <R>(self: STM<R, E, A>) => STM<R2 | R3 | R, E | E2 | E3, A>
  <R, E, XE extends E, R2, E2, A2, A, XA extends A, R3, E3, A3>(
    self: STM<R, E, A>,
    options: {
      readonly onFailure: (error: XE) => STM<R2, E2, A2>
      readonly onSuccess: (value: XA) => STM<R3, E3, A3>
    }
  ): STM<R | R2 | R3, E | E2 | E3, A>
} = stm.tapBoth

/**
 * "Peeks" at the error of the transactional effect.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapError: {
  <E, X extends E, R2, E2, _>(f: (error: X) => STM<R2, E2, _>): <R, A>(self: STM<R, E, A>) => STM<R2 | R, E | E2, A>
  <R, A, E, X extends E, R2, E2, _>(self: STM<R, E, A>, f: (error: X) => STM<R2, E2, _>): STM<R | R2, E | E2, A>
} = stm.tapError

const try_: {
  <A, E>(options: {
    readonly try: LazyArg<A>
    readonly catch: (u: unknown) => E
  }): STM<never, E, A>
  <A>(try_: LazyArg<A>): STM<never, unknown, A>
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
  (predicate: LazyArg<boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>>
  <R, E, A>(self: STM<R, E, A>, predicate: LazyArg<boolean>): STM<R, E, Option.Option<A>>
} = stm.unless

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 *
 * @since 2.0.0
 * @category mutations
 */
export const unlessSTM: {
  <R2, E2>(predicate: STM<R2, E2, boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A>>
  <R, E, A, R2, E2>(self: STM<R, E, A>, predicate: STM<R2, E2, boolean>): STM<R | R2, E | E2, Option.Option<A>>
} = stm.unlessSTM

/**
 * Converts an option on errors into an option on values.
 *
 * @since 2.0.0
 * @category getters
 */
export const unsome: <R, E, A>(self: STM<R, Option.Option<E>, A>) => STM<R, E, Option.Option<A>> = stm.unsome

/**
 * Returns an `STM` effect that succeeds with `Unit`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unit: STM<never, never, void> = stm.unit

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
  <R, E, A, B>(f: (a: A) => STM<R, E, B>): (elements: Iterable<A>) => STM<R, [E, ...Array<E>], Array<B>>
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => STM<R, E, B>): STM<R, [E, ...Array<E>], Array<B>>
} = stm.validateAll

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @since 2.0.0
 * @category mutations
 */
export const validateFirst: {
  <R, E, A, B>(f: (a: A) => STM<R, E, B>): (elements: Iterable<A>) => STM<R, Array<E>, B>
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => STM<R, E, B>): STM<R, Array<E>, B>
} = stm.validateFirst

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const when: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>>
  <R, E, A>(self: STM<R, E, A>, predicate: LazyArg<boolean>): STM<R, E, Option.Option<A>>
} = stm.when

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @since 2.0.0
 * @category mutations
 */
export const whenSTM: {
  <R2, E2>(predicate: STM<R2, E2, boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A>>
  <R, E, A, R2, E2>(self: STM<R, E, A>, predicate: STM<R2, E2, boolean>): STM<R | R2, E | E2, Option.Option<A>>
} = stm.whenSTM

/**
 * Sequentially zips this value with the specified one.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <R1, E1, A1>(that: STM<R1, E1, A1>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, [A, A1]>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: STM<R1, E1, A1>): STM<R | R1, E | E1, [A, A1]>
} = core.zip

/**
 * Sequentially zips this value with the specified one, discarding the second
 * element of the tuple.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <R1, E1, A1>(that: STM<R1, E1, A1>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: STM<R1, E1, A1>): STM<R | R1, E | E1, A>
} = core.zipLeft

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <R1, E1, A1>(that: STM<R1, E1, A1>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: STM<R1, E1, A1>): STM<R | R1, E | E1, A1>
} = core.zipRight

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <R1, E1, A1, A, A2>(
    that: STM<R1, E1, A1>,
    f: (a: A, b: A1) => A2
  ): <R, E>(
    self: STM<R, E, A>
  ) => STM<R1 | R, E1 | E, A2>
  <R, E, R1, E1, A1, A, A2>(
    self: STM<R, E, A>,
    that: STM<R1, E1, A1>,
    f: (a: A, b: A1) => A2
  ): STM<R | R1, E | E1, A2>
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
export const firstSuccessOf = <R, E, A>(effects: Iterable<STM<R, E, A>>): STM<R, E, A> =>
  suspend<R, E, A>(() => {
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
export const Do: STM<never, never, {}> = succeed({})

/**
 * @category do notation
 * @since 2.0.0
 */
export const bind: {
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM<R2, E2, A>
  ): <R, E>(self: STM<R, E, K>) => STM<R2 | R, E2 | E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM<R2, E2, A>
  ): STM<R | R2, E | E2, Effect.MergeRecord<K, { [k in N]: A }>>
} = stm.bind

const let_: {
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): <R, E>(self: STM<R, E, K>) => STM<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, K, N extends string, A>(
    self: STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): STM<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
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
  <N extends string>(tag: N): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Record<N, A>>
  <R, E, A, N extends string>(self: STM<R, E, A>, tag: N): STM<R, E, Record<N, A>>
} = stm.bindTo

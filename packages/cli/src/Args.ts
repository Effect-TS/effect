/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { CliConfig } from "./CliConfig.js"
import type { HelpDoc } from "./HelpDoc.js"
import * as InternalArgs from "./internal/args.js"
import type { Parameter } from "./Parameter.js"
import type { Usage } from "./Usage.js"
import type { ValidationError } from "./ValidationError.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ArgsTypeId: unique symbol = InternalArgs.ArgsTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ArgsTypeId = typeof ArgsTypeId

/**
 * Represents arguments that can be passed to a command-line application.
 *
 * @since 1.0.0
 * @category models
 */
export interface Args<A> extends Args.Variance<A>, Parameter, Pipeable {
  get maxSize(): number
  get minSize(): number
  get identifier(): Option<string>
  get usage(): Usage
  validate(
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<never, ValidationError, readonly [ReadonlyArray<string>, A]>
  addDescription(description: string): Args<A>
}

/**
 * @since 1.0.0
 */
export declare namespace Args {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [ArgsTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ArgsConfig {
    readonly name?: string
  }
}

/**
 * @since 1.0.0
 */
export declare namespace All {
  /**
   * @since 1.0.0
   */
  export type ArgsAny = Args<any>

  /**
   * @since 1.0.0
   */
  export type ReturnIterable<T extends Iterable<ArgsAny>> = [T] extends
    [Iterable<Args.Variance<infer A>>] ? Args<Array<A>>
    : never

  /**
   * @since 1.0.0
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>> = Args<
    T[number] extends never ? []
      : {
        -readonly [K in keyof T]: [T[K]] extends [Args.Variance<infer _A>] ? _A : never
      }
  > extends infer X ? X : never

  /**
   * @since 1.0.0
   */
  export type ReturnObject<T> = [T] extends [{ [K: string]: ArgsAny }] ? Args<
      {
        -readonly [K in keyof T]: [T[K]] extends [Args.Variance<infer _A>] ? _A : never
      }
    >
    : never

  /**
   * @since 1.0.0
   */
  export type Return<
    Arg extends Iterable<ArgsAny> | Record<string, ArgsAny>
  > = [Arg] extends [ReadonlyArray<ArgsAny>] ? ReturnTuple<Arg>
    : [Arg] extends [Iterable<ArgsAny>] ? ReturnIterable<Arg>
    : [Arg] extends [Record<string, ArgsAny>] ? ReturnObject<Arg>
    : never
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isArgs: (u: unknown) => u is Args<unknown> = InternalArgs.isArgs

/**
 * @since 1.0.0
 * @category constructors
 */
export const all: <const Arg extends Iterable<Args<any>> | Record<string, Args<any>>>(
  arg: Arg
) => All.Return<Arg> = InternalArgs.all

/**
 * @since 1.0.0
 * @category combinators
 */
export const atLeast: {
  (times: 0): <A>(self: Args<A>) => Args<ReadonlyArray<A>>
  (times: number): <A>(self: Args<A>) => Args<NonEmptyReadonlyArray<A>>
  <A>(self: Args<A>, times: 0): Args<ReadonlyArray<A>>
  <A>(self: Args<A>, times: number): Args<NonEmptyReadonlyArray<A>>
} = InternalArgs.atLeast

/**
 * @since 1.0.0
 * @category combinators
 */
export const atMost: {
  (times: number): <A>(self: Args<A>) => Args<ReadonlyArray<A>>
  <A>(self: Args<A>, times: number): Args<ReadonlyArray<A>>
} = InternalArgs.atMost

/**
 * @since 1.0.0
 * @category combinators
 */
export const between: {
  (min: 0, max: number): <A>(self: Args<A>) => Args<ReadonlyArray<A>>
  (min: number, max: number): <A>(self: Args<A>) => Args<NonEmptyReadonlyArray<A>>
  <A>(self: Args<A>, min: 0, max: number): Args<ReadonlyArray<A>>
  <A>(self: Args<A>, min: number, max: number): Args<NonEmptyReadonlyArray<A>>
} = InternalArgs.between

/**
 * Creates a boolean argument.
 *
 * Can optionally provide a custom argument name (defaults to `"boolean"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (options?: Args.ArgsConfig) => Args<boolean> = InternalArgs.boolean

/**
 * Creates a choice argument.
 *
 * Can optionally provide a custom argument name (defaults to `"choice"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A>(
  choices: NonEmptyReadonlyArray<[string, A]>,
  config?: Args.ArgsConfig
) => Args<A> = InternalArgs.choice

/**
 * Creates a date argument.
 *
 * Can optionally provide a custom argument name (defaults to `"date"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const date: (config?: Args.ArgsConfig) => Args<globalThis.Date> = InternalArgs.date

/**
 * Creates a floating point number argument.
 *
 * Can optionally provide a custom argument name (defaults to `"float"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const float: (config?: Args.ArgsConfig) => Args<number> = InternalArgs.float

/**
 * Creates an integer argument.
 *
 * Can optionally provide a custom argument name (defaults to `"integer"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const integer: (config?: Args.ArgsConfig) => Args<number> = InternalArgs.integer

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Args<A>) => Args<B>
  <A, B>(self: Args<A>, f: (a: A) => B): Args<B>
} = InternalArgs.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapOrFail: {
  <A, B>(f: (a: A) => Either<HelpDoc, B>): (self: Args<A>) => Args<B>
  <A, B>(self: Args<A>, f: (a: A) => Either<HelpDoc, B>): Args<B>
} = InternalArgs.mapOrFail

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapTryCatch: {
  <A, B>(f: (a: A) => B, onError: (e: unknown) => HelpDoc): (self: Args<A>) => Args<B>
  <A, B>(self: Args<A>, f: (a: A) => B, onError: (e: unknown) => HelpDoc): Args<B>
} = InternalArgs.mapTryCatch

/**
 *  Creates an empty argument.
 *
 * @since 1.0.0
 * @category constructors
 */
export const none: Args<void> = InternalArgs.none

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeated: <A>(self: Args<A>) => Args<ReadonlyArray<A>> = InternalArgs.repeated

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeatedAtLeastOnce: <A>(self: Args<A>) => Args<NonEmptyReadonlyArray<A>> =
  InternalArgs.repeatedAtLeastOnce

/**
 * Creates a text argument.
 *
 * Can optionally provide a custom argument name (defaults to `"text"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: (config?: Args.ArgsConfig) => Args<string> = InternalArgs.text

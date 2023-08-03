/**
 * @since 1.0.0
 */
import type { HelpDoc } from "@effect/cli/HelpDoc"
import * as internal from "@effect/cli/internal/args"
import type { Usage } from "@effect/cli/Usage"
import type { ValidationError } from "@effect/cli/ValidationError"
import type { Chunk, NonEmptyChunk } from "@effect/data/Chunk"
import type { Either } from "@effect/data/Either"
import type { Option } from "@effect/data/Option"
import type { Pipeable } from "@effect/data/Pipeable"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import type { Effect } from "@effect/io/Effect"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ArgsTypeId: unique symbol = internal.ArgsTypeId

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
export interface Args<A> extends Args.Variance<A>, Pipeable {}

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
 * @category combinators
 */
export const addDescription: {
  (description: string): <A>(self: Args<A>) => Args<A>
  <A>(self: Args<A>, description: string): Args<A>
} = internal.addDescription

/**
 * @since 1.0.0
 * @category combinators
 */
export const atLeast: {
  (times: 0): <A>(self: Args<A>) => Args<Chunk<A>>
  (times: number): <A>(self: Args<A>) => Args<NonEmptyChunk<A>>
  <A>(self: Args<A>, times: 0): Args<Chunk<A>>
  <A>(self: Args<A>, times: number): Args<NonEmptyChunk<A>>
} = internal.atLeast

/**
 * @since 1.0.0
 * @category combinators
 */
export const atMost: {
  (times: number): <A>(self: Args<A>) => Args<Chunk<A>>
  <A>(self: Args<A>, times: number): Args<Chunk<A>>
} = internal.atMost

/**
 * @since 1.0.0
 * @category combinators
 */
export const between: {
  (min: 0, max: number): <A>(self: Args<A>) => Args<Chunk<A>>
  (min: number, max: number): <A>(self: Args<A>) => Args<NonEmptyChunk<A>>
  <A>(self: Args<A>, min: 0, max: number): Args<Chunk<A>>
  <A>(self: Args<A>, min: number, max: number): Args<NonEmptyChunk<A>>
} = internal.between

/**
 * Creates a boolean argument.
 *
 * Can optionally provide a custom argument name (defaults to `"boolean"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (options?: Args.ArgsConfig) => Args<boolean> = internal.boolean

/**
 * Creates a choice argument.
 *
 * Can optionally provide a custom argument name (defaults to `"choice"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A>(choices: NonEmptyReadonlyArray<[string, A]>, config?: Args.ArgsConfig) => Args<A> =
  internal.choice

/**
 * Creates a date argument.
 *
 * Can optionally provide a custom argument name (defaults to `"date"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const date: (config?: Args.ArgsConfig) => Args<globalThis.Date> = internal.date

/**
 * Creates a floating point number argument.
 *
 * Can optionally provide a custom argument name (defaults to `"float"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const float: (config?: Args.ArgsConfig) => Args<number> = internal.float

/**
 * @since 1.0.0
 * @category getters
 */
export const helpDoc: <A>(self: Args<A>) => HelpDoc = internal.helpDoc

/**
 * Creates an integer argument.
 *
 * Can optionally provide a custom argument name (defaults to `"integer"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const integer: (config?: Args.ArgsConfig) => Args<number> = internal.integer

/**
 * @since 1.0.0
 * @category refinements
 */
export const isArgs: (u: unknown) => u is Args<unknown> = internal.isArgs

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Args<A>) => Args<B>
  <A, B>(self: Args<A>, f: (a: A) => B): Args<B>
} = internal.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapOrFail: {
  <A, B>(f: (a: A) => Either<HelpDoc, B>): (self: Args<A>) => Args<B>
  <A, B>(self: Args<A>, f: (a: A) => Either<HelpDoc, B>): Args<B>
} = internal.mapOrFail

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapTryCatch: {
  <A, B>(f: (a: A) => B, onError: (e: unknown) => HelpDoc): (self: Args<A>) => Args<B>
  <A, B>(self: Args<A>, f: (a: A) => B, onError: (e: unknown) => HelpDoc): Args<B>
} = internal.mapTryCatch

/**
 * @since 1.0.0
 * @category getters
 */
export const maxSize: <A>(self: Args<A>) => number = internal.maxSize

/**
 * @since 1.0.0
 * @category getters
 */
export const minSize: <A>(self: Args<A>) => number = internal.minSize

/**
 *  Creates an empty argument.
 *
 * @since 1.0.0
 * @category constructors
 */
export const none: Args<void> = internal.none

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeat: <A>(self: Args<A>) => Args<Chunk<A>> = internal.repeat

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeat1: <A>(self: Args<A>) => Args<NonEmptyChunk<A>> = internal.repeat1

/**
 * Creates a text argument.
 *
 * Can optionally provide a custom argument name (defaults to `"text"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: (config?: Args.ArgsConfig) => Args<string> = internal.text

/**
 * @since 1.0.0
 * @category getters
 */
export const uid: <A>(self: Args<A>) => Option<string> = internal.uid

/**
 * @since 1.0.0
 * @category getters
 */
export const usage: <A>(self: Args<A>) => Usage = internal.usage

/**
 * @since 1.0.0
 * @category validation
 */
export const validate: {
  (
    args: ReadonlyArray<string>
  ): <A>(self: Args<A>) => Effect<never, ValidationError, readonly [ReadonlyArray<string>, A]>
  <A>(self: Args<A>, args: ReadonlyArray<string>): Effect<never, ValidationError, readonly [ReadonlyArray<string>, A]>
} = internal.validate

/**
 * @since 1.0.0
 * @category zipping
 */
export const zip: {
  <B>(that: Args<B>): <A>(self: Args<A>) => Args<readonly [A, B]>
  <A, B>(self: Args<A>, that: Args<B>): Args<readonly [A, B]>
} = internal.zip

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipFlatten: {
  <B>(that: Args<B>): <A extends ReadonlyArray<any>>(self: Args<A>) => Args<[...A, B]>
  <A extends ReadonlyArray<any>, B>(self: Args<A>, that: Args<B>): Args<[...A, B]>
} = internal.zipFlatten

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipWith: {
  <B, A, C>(that: Args<B>, f: (a: A, b: B) => C): (self: Args<A>) => Args<C>
  <A, B, C>(self: Args<A>, that: Args<B>, f: (a: A, b: B) => C): Args<C>
} = internal.zipWith

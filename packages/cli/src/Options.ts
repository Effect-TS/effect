/**
 * @since 1.0.0
 */
import type { CliConfig } from "@effect/cli/CliConfig"
import type { HelpDoc } from "@effect/cli/HelpDoc"
import * as internal from "@effect/cli/internal/options"
import type { Usage } from "@effect/cli/Usage"
import type { ValidationError } from "@effect/cli/ValidationError"
import type { Chunk, NonEmptyChunk } from "@effect/data/Chunk"
import type { Either } from "@effect/data/Either"
import type { HashMap } from "@effect/data/HashMap"
import type { Option } from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import type { Effect } from "@effect/io/Effect"

/**
 * @since 1.0.0
 * @category symbols
 */
export const OptionsTypeId: unique symbol = internal.OptionsTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type OptionsTypeId = typeof OptionsTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Options<A> extends Options.Variance<A> {}

/**
 * @since 1.0.0
 */
export declare namespace Options {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [OptionsTypeId]: {
      _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface BooleanOptionConfig {
    readonly ifPresent?: boolean
    readonly negationNames?: NonEmptyReadonlyArray<string>
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const alias: {
  (alias: string): <A>(self: Options<A>) => Options<A>
  <A>(self: Options<A>, alias: string): Options<A>
} = internal.alias

/**
 * @since 1.0.0
 * @category constructors
 */
export const all: {
  <A, T extends ReadonlyArray<Options<any>>>(
    self: Options<A>,
    ...args: T
  ): Options<
    readonly [
      A,
      ...(T["length"] extends 0 ? []
        : Readonly<{ [K in keyof T]: [T[K]] extends [Options<infer A>] ? A : never }>)
    ]
  >
  <T extends ReadonlyArray<Options<any>>>(
    args: [...T]
  ): Options<
    T[number] extends never ? []
      : Readonly<{ [K in keyof T]: [T[K]] extends [Options<infer A>] ? A : never }>
  >
  <T extends Readonly<{ [K: string]: Options<any> }>>(
    args: T
  ): Options<Readonly<{ [K in keyof T]: [T[K]] extends [Options<infer A>] ? A : never }>>
} = internal.all

/**
 * @since 1.0.0
 * @category combinators
 */
export const atLeast: {
  (times: 0): <A>(self: Options<A>) => Options<Chunk<A>>
  (times: number): <A>(self: Options<A>) => Options<NonEmptyChunk<A>>
  <A>(self: Options<A>, times: 0): Options<Chunk<A>>
  <A>(self: Options<A>, times: number): Options<NonEmptyChunk<A>>
} = internal.atLeast

/**
 * @since 1.0.0
 * @category combinators
 */
export const atMost: {
  (times: number): <A>(self: Options<A>) => Options<Chunk<A>>
  <A>(self: Options<A>, times: number): Options<Chunk<A>>
} = internal.atMost

/**
 * @since 1.0.0
 * @category combinators
 */
export const between: {
  (min: 0, max: number): <A>(self: Options<A>) => Options<Chunk<A>>
  (min: number, max: number): <A>(self: Options<A>) => Options<NonEmptyChunk<A>>
  <A>(self: Options<A>, min: 0, max: number): Options<Chunk<A>>
  <A>(self: Options<A>, min: number, max: number): Options<NonEmptyChunk<A>>
} = internal.between

/**
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (name: string, options?: Options.BooleanOptionConfig) => Options<boolean> = internal.boolean

/**
 * Constructs command-line `Options` that represent a choice between several
 * inputs. The input will be mapped to it's associated value during parsing.
 *
 * @example
 * import * as Options from "@effect/cli/Options"
 *
 * export const animal: Options.Options<"dog" | "cat"> = Options.choice(
 *   "animal",
 *   ["dog", "cat"]
 * )
 *
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A extends string, C extends NonEmptyReadonlyArray<A>>(
  name: string,
  choices: C
) => Options<C[number]> = internal.choice

/**
 * Constructs command-line `Options` that represent a choice between several
 * inputs. The input will be mapped to it's associated value during parsing.
 *
 * @example
 * import * as Options from "@effect/cli/Options"
 * import * as Data from "@effect/data/Data"
 *
 * export type Animal = Dog | Cat
 *
 * export interface Dog extends Data.Case {
 *   readonly _tag: "Dog"
 * }
 *
 * export const Dog = Data.tagged<Dog>("Dog")
 *
 * export interface Cat extends Data.Case {
 *   readonly _tag: "Cat"
 * }
 *
 * export const Cat = Data.tagged<Cat>("Cat")
 *
 * export const animal: Options.Options<Animal> = Options.choiceWithValue("animal", [
 *   ["dog", Dog()],
 *   ["cat", Cat()],
 * ])
 *
 * @since 1.0.0
 * @category constructors
 */
export const choiceWithValue: <C extends NonEmptyReadonlyArray<readonly [string, any]>>(
  name: string,
  choices: C
) => Options<C[number][1]> = internal.choiceWithValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: (name: string) => Options<globalThis.Date> = internal.date

/**
 * @since 1.0.0
 * @category combinators
 */
export const filterMap: {
  <A, B>(f: (a: A) => Option<B>, message: string): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => Option<B>, message: string): Options<B>
} = internal.filterMap

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: (name: string) => Options<number> = internal.float

/**
 * @since 1.0.0
 * @category getters
 */
export const helpDoc: <A>(self: Options<A>) => HelpDoc = internal.helpDoc

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: (name: string) => Options<number> = internal.integer

/**
 * Returns `true` if the specified `Options` is a boolean flag, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category predicates
 */
export const isBool: <A>(self: Options<A>) => boolean = internal.isBool

/**
 * @since 1.0.0
 * @category refinements
 */
export const isOptions: (u: unknown) => u is Options<unknown> = internal.isOptions

/**
 * @since 1.0.0
 * @category constructors
 */
export const keyValueMap: (name: string) => Options<HashMap<string, string>> = internal.keyValueMap

/**
 * @since 1.0.0
 * @category constructors
 */
export const keyValueMapFromOption: (argumentOption: Options<string>) => Options<HashMap<string, string>> =
  internal.keyValueMapFromOption

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => B): Options<B>
} = internal.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapOrFail: {
  <A, B>(f: (a: A) => Either<ValidationError, B>): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => Either<ValidationError, B>): Options<B>
} = internal.mapOrFail

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapTryCatch: {
  <A, B>(f: (a: A) => B, onError: (e: unknown) => HelpDoc): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => B, onError: (e: unknown) => HelpDoc): Options<B>
} = internal.mapTryCatch

/**
 * @since 1.0.0
 * @category constructors
 */
export const none: Options<void> = internal.none

/**
 * @since 1.0.0
 * @category combinators
 */
export const optional: <A>(self: Options<A>) => Options<Option<A>> = internal.optional

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  <A>(that: Options<A>): <B>(self: Options<B>) => Options<A | B>
  <A, B>(self: Options<A>, that: Options<B>): Options<A | B>
} = internal.orElse

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElseEither: {
  <A>(that: Options<A>): <B>(self: Options<B>) => Options<Either<B, A>>
  <A, B>(self: Options<A>, that: Options<B>): Options<Either<B, A>>
} = internal.orElseEither

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeat: <A>(self: Options<A>) => Options<Chunk<A>> = internal.repeat

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeat1: <A>(self: Options<A>) => Options<NonEmptyChunk<A>> = internal.repeat1

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (name: string) => Options<string> = internal.text

/**
 * @since 1.0.0
 * @category getters
 */
export const uid: <A>(self: Options<A>) => Option<string> = internal.uid

/**
 * @since 1.0.0
 * @category getters
 */
export const usage: <A>(self: Options<A>) => Usage = internal.usage

/**
 * @since 1.0.0
 * @category validation
 */
export const validate: {
  (
    args: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(self: Options<A>) => Effect<never, ValidationError, readonly [ReadonlyArray<string>, A]>
  <A>(
    self: Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<never, ValidationError, readonly [ReadonlyArray<string>, A]>
} = internal.validate

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDefault: {
  <A>(value: A): (self: Options<A>) => Options<A>
  <A>(self: Options<A>, value: A): Options<A>
} = internal.withDefault

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDescription: {
  (description: string): <A>(self: Options<A>) => Options<A>
  <A>(self: Options<A>, description: string): Options<A>
} = internal.withDescription

/**
 * @since 1.0.0
 * @category zipping
 */
export const zip: {
  <B>(that: Options<B>): <A>(self: Options<A>) => Options<readonly [A, B]>
  <A, B>(self: Options<A>, that: Options<B>): Options<readonly [A, B]>
} = internal.zip

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipFlatten: {
  <B>(that: Options<B>): <A extends ReadonlyArray<any>>(self: Options<A>) => Options<[...A, B]>
  <A extends ReadonlyArray<any>, B>(self: Options<A>, that: Options<B>): Options<[...A, B]>
} = internal.zipFlatten

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipWith: {
  <B, A, C>(that: Options<B>, f: (a: A, b: B) => C): (self: Options<A>) => Options<C>
  <A, B, C>(self: Options<A>, that: Options<B>, f: (a: A, b: B) => C): Options<C>
} = internal.zipWith

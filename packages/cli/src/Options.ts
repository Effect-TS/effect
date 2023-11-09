/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { HashMap } from "effect/HashMap"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { CliConfig } from "./CliConfig"
import type { HelpDoc } from "./HelpDoc"
import * as InternalOptions from "./internal/options"
import type { Input, Parameter } from "./Parameter"
import type { Usage } from "./Usage"
import type { ValidationError } from "./ValidationError"

/**
 * @since 1.0.0
 * @category symbols
 */
export const OptionsTypeId: unique symbol = InternalOptions.OptionsTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type OptionsTypeId = typeof OptionsTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Options<A> extends Options.Variance<A>, Parameter, Pipeable {
  get identifier(): Option<string>
  get usage(): Usage
  get flattened(): ReadonlyArray<Input>
  validate(args: HashMap<string, ReadonlyArray<string>>, config: CliConfig): Effect<never, ValidationError, A>
  /** @internal */
  modifySingle(f: <_>(single: InternalOptions.Single<_>) => InternalOptions.Single<_>): Options<A>
}

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
    readonly aliases?: NonEmptyReadonlyArray<string>
  }
}

/**
 * @since 1.0.0
 */
export declare namespace All {
  /**
   * @since 1.0.0
   */
  export type OptionsAny = Options<any>

  /**
   * @since 1.0.0
   */
  export type ReturnIterable<T extends Iterable<OptionsAny>> = [T] extends [Iterable<Options.Variance<infer A>>]
    ? Options<Array<A>>
    : never

  /**
   * @since 1.0.0
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>> = Options<
    T[number] extends never ? []
      : {
        -readonly [K in keyof T]: [T[K]] extends [Options.Variance<infer _A>] ? _A : never
      }
  > extends infer X ? X : never

  /**
   * @since 1.0.0
   */
  export type ReturnObject<T> = [T] extends [{ [K: string]: OptionsAny }] ? Options<
      {
        -readonly [K in keyof T]: [T[K]] extends [Options.Variance<infer _A>] ? _A : never
      }
    >
    : never

  /**
   * @since 1.0.0
   */
  export type Return<
    Arg extends Iterable<OptionsAny> | Record<string, OptionsAny>
  > = [Arg] extends [ReadonlyArray<OptionsAny>] ? ReturnTuple<Arg>
    : [Arg] extends [Iterable<OptionsAny>] ? ReturnIterable<Arg>
    : [Arg] extends [Record<string, OptionsAny>] ? ReturnObject<Arg>
    : never
}

// =============================================================================
// Refinements
// =============================================================================

/**
 * @since 1.0.0
 * @category refinements
 */
export const isOptions: (u: unknown) => u is Options<unknown> = InternalOptions.isOptions

// =============================================================================
// Constructors
// =============================================================================

/**
 * @since 1.0.0
 * @category constructors
 */
export const all: <
  const Arg extends Iterable<Options<any>> | Record<string, Options<any>>
>(arg: Arg) => All.Return<Arg> = InternalOptions.all

/**
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (name: string, options?: Options.BooleanOptionConfig) => Options<boolean> =
  InternalOptions.boolean

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
) => Options<C[number]> = InternalOptions.choice

/**
 * Constructs command-line `Options` that represent a choice between several
 * inputs. The input will be mapped to it's associated value during parsing.
 *
 * @example
 * import * as Options from "@effect/cli/Options"
 * import * as Data from "effect/Data"
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
export const choiceWithValue: <C extends NonEmptyReadonlyArray<[string, any]>>(
  name: string,
  choices: C
) => Options<C[number][1]> = InternalOptions.choiceWithValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: (name: string) => Options<globalThis.Date> = InternalOptions.date

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: (name: string) => Options<number> = InternalOptions.float

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: (name: string) => Options<number> = InternalOptions.integer

/**
 * @since 1.0.0
 * @category constructors
 */
export const keyValueMap: (name: string) => Options<HashMap<string, string>> = InternalOptions.keyValueMap

/**
 * @since 1.0.0
 * @category constructors
 */
export const none: Options<void> = InternalOptions.none

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (name: string) => Options<string> = InternalOptions.text

// =============================================================================
// Combinators
// =============================================================================

/**
 * @since 1.0.0
 * @category combinators
 */
export const filterMap: {
  <A, B>(f: (a: A) => Option<B>, message: string): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => Option<B>, message: string): Options<B>
} = InternalOptions.filterMap

/**
 * Returns `true` if the specified `Options` is a boolean flag, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category combinators
 */
export const isBool: <A>(self: Options<A>) => boolean = InternalOptions.isBool

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => B): Options<B>
} = InternalOptions.map

/**
 * @since 1.0.0
 * @category combinators
 */
export const mapOrFail: {
  <A, B>(f: (a: A) => Either<ValidationError, B>): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => Either<ValidationError, B>): Options<B>
} = InternalOptions.mapOrFail

/**
 * @since 1.0.0
 * @category combinators
 */
export const mapTryCatch: {
  <A, B>(f: (a: A) => B, onError: (e: unknown) => HelpDoc): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => B, onError: (e: unknown) => HelpDoc): Options<B>
} = InternalOptions.mapTryCatch

/**
 * @since 1.0.0
 * @category combinators
 */
export const optional: <A>(self: Options<A>) => Options<Option<A>> = InternalOptions.optional

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  <A>(that: Options<A>): <B>(self: Options<B>) => Options<A | B>
  <A, B>(self: Options<A>, that: Options<B>): Options<A | B>
} = InternalOptions.orElse

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElseEither: {
  <A>(that: Options<A>): <B>(self: Options<B>) => Options<Either<B, A>>
  <A, B>(self: Options<A>, that: Options<B>): Options<Either<B, A>>
} = InternalOptions.orElseEither

/**
 * @since 1.0.0
 * @category combinators
 */
export const validate: {
  (
    args: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(
    self: Options<A>
  ) => Effect<never, ValidationError, readonly [Option<ValidationError>, ReadonlyArray<string>, A]>
  <A>(
    self: Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<never, ValidationError, readonly [Option<ValidationError>, ReadonlyArray<string>, A]>
} = InternalOptions.validate

/**
 * @since 1.0.0
 * @category combinators
 */
export const withAlias: {
  (alias: string): <A>(self: Options<A>) => Options<A>
  <A>(self: Options<A>, alias: string): Options<A>
} = InternalOptions.withAlias

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDefault: {
  <A>(fallback: A): (self: Options<A>) => Options<A>
  <A>(self: Options<A>, fallback: A): Options<A>
} = InternalOptions.withDefault

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDescription: {
  (description: string): <A>(self: Options<A>) => Options<A>
  <A>(self: Options<A>, description: string): Options<A>
} = InternalOptions.withDescription

/**
 * @since 1.0.0
 * @category combinators
 */
export const withPseudoName: {
  (pseudoName: string): <A>(self: Options<A>) => Options<A>
  <A>(self: Options<A>, pseudoName: string): Options<A>
} = InternalOptions.withPseudoName

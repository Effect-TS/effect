/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { QuitException, Terminal } from "@effect/platform/Terminal"
import type { NonEmptyArray } from "effect/Array"
import type { Config } from "effect/Config"
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { HashMap } from "effect/HashMap"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { Redacted } from "effect/Redacted"
import type { Schema } from "effect/Schema"
import type { Secret } from "effect/Secret"
import type { CliConfig } from "./CliConfig.js"
import type { HelpDoc } from "./HelpDoc.js"
import * as InternalOptions from "./internal/options.js"
import type { Primitive } from "./Primitive.js"
import type { Prompt } from "./Prompt.js"
import type { Usage } from "./Usage.js"
import type { ValidationError } from "./ValidationError.js"

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
export interface Options<A> extends Options.Variance<A>, Pipeable {}

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
  export interface BooleanOptionsConfig {
    readonly ifPresent?: boolean
    readonly negationNames?: ReadonlyArray<string>
    readonly aliases?: ReadonlyArray<string>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PathOptionsConfig {
    readonly exists?: Primitive.PathExists
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
  export type ReturnIterable<T extends Iterable<OptionsAny>> = [T] extends [Iterable<Options.Variance<infer A>>] ?
    Options<Array<A>>
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
export const boolean: (name: string, options?: Options.BooleanOptionsConfig) => Options<boolean> =
  InternalOptions.boolean

/**
 * Constructs command-line `Options` that represent a choice between several
 * inputs. The input will be mapped to it's associated value during parsing.
 *
 * **Example**
 *
 * ```ts
 * import * as Options from "@effect/cli/Options"
 *
 * export const animal: Options.Options<"dog" | "cat"> = Options.choice(
 *   "animal",
 *   ["dog", "cat"]
 * )
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A extends string, C extends ReadonlyArray<A>>(
  name: string,
  choices: C
) => Options<C[number]> = InternalOptions.choice

/**
 * Constructs command-line `Options` that represent a choice between several
 * inputs. The input will be mapped to it's associated value during parsing.
 *
 * **Example**
 *
 * ```ts
 * import * as Options from "@effect/cli/Options"
 * import * as Data from "effect/Data"
 *
 * export type Animal = Dog | Cat
 *
 * export interface Dog {
 *   readonly _tag: "Dog"
 * }
 *
 * export const Dog = Data.tagged<Dog>("Dog")
 *
 * export interface Cat {
 *   readonly _tag: "Cat"
 * }
 *
 * export const Cat = Data.tagged<Cat>("Cat")
 *
 * export const animal: Options.Options<Animal> = Options.choiceWithValue("animal", [
 *   ["dog", Dog()],
 *   ["cat", Cat()],
 * ])
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const choiceWithValue: <C extends ReadonlyArray<[string, any]>>(
  name: string,
  choices: C
) => Options<C[number][1]> = InternalOptions.choiceWithValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: (name: string) => Options<globalThis.Date> = InternalOptions.date

/**
 * Creates a parameter expecting path to a directory.
 *
 * @since 1.0.0
 * @category constructors
 */
export const directory: (name: string, config?: Options.PathOptionsConfig) => Options<string> =
  InternalOptions.directory

/**
 * Creates a parameter expecting path to a file.
 *
 * @since 1.0.0
 * @category constructors
 */
export const file: (name: string, config?: Options.PathOptionsConfig) => Options<string> = InternalOptions.file

/**
 * Creates a parameter expecting path to a file and reads its contents.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fileContent: (name: string) => Options<readonly [path: string, content: Uint8Array]> =
  InternalOptions.fileContent

/**
 * Creates a parameter expecting path to a file and parse its contents.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fileParse: (name: string, format?: "json" | "yaml" | "ini" | "toml" | undefined) => Options<unknown> =
  InternalOptions.fileParse

/**
 * Creates a parameter expecting path to a file, parse its contents and validate
 * it with a Schema.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fileSchema: <I, A>(
  name: string,
  schema: Schema<A, I, FileSystem | Path | Terminal>,
  format?: "json" | "yaml" | "ini" | "toml" | undefined
) => Options<A> = InternalOptions.fileSchema

/**
 * Creates a parameter expecting path to a file and reads its contents.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fileText: (name: string) => Options<readonly [path: string, content: string]> = InternalOptions.fileText

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: (name: string) => Options<number> = InternalOptions.float

/**
 * @since 1.0.0
 * @category combinators
 */
export const getHelp: <A>(self: Options<A>) => HelpDoc = InternalOptions.getHelp

/**
 * @since 1.0.0
 * @category combinators
 */
export const getIdentifier: <A>(self: Options<A>) => Option<string> = InternalOptions.getIdentifier

/**
 * @since 1.0.0
 * @category combinators
 */
export const getUsage: <A>(self: Options<A>) => Usage = InternalOptions.getUsage

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: (name: string) => Options<number> = InternalOptions.integer

/**
 * @since 1.0.0
 * @category constructors
 */
export const keyValueMap: (option: string | Options<string>) => Options<HashMap<string, string>> =
  InternalOptions.keyValueMap

/**
 * @since 1.0.0
 * @category constructors
 */
export const none: Options<void> = InternalOptions.none

/**
 * @since 1.0.0
 * @category constructors
 */
export const redacted: (name: string) => Options<Redacted> = InternalOptions.redacted

/**
 * @since 1.0.0
 * @category constructors
 * @deprecated
 */
export const secret: (name: string) => Options<Secret> = InternalOptions.secret

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
export const atMost: {
  (times: number): <A>(self: Options<A>) => Options<Array<A>>
  <A>(self: Options<A>, times: number): Options<Array<A>>
} = InternalOptions.atMost

/**
 * @since 1.0.0
 * @category combinators
 */
export const atLeast: {
  (times: 0): <A>(self: Options<A>) => Options<Array<A>>
  (times: number): <A>(self: Options<A>) => Options<NonEmptyArray<A>>
  <A>(self: Options<A>, times: 0): Options<Array<A>>
  <A>(self: Options<A>, times: number): Options<NonEmptyArray<A>>
} = InternalOptions.atLeast

/**
 * @since 1.0.0
 * @category combinators
 */
export const between: {
  (min: 0, max: number): <A>(self: Options<A>) => Options<Array<A>>
  (min: number, max: number): <A>(self: Options<A>) => Options<NonEmptyArray<A>>
  <A>(self: Options<A>, min: 0, max: number): Options<Array<A>>
  <A>(self: Options<A>, min: number, max: number): Options<NonEmptyArray<A>>
} = InternalOptions.between

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
export const mapEffect: {
  <A, B>(f: (a: A) => Effect<B, ValidationError, FileSystem | Path | Terminal>): (self: Options<A>) => Options<B>
  <A, B>(self: Options<A>, f: (a: A) => Effect<B, ValidationError, FileSystem | Path | Terminal>): Options<B>
} = InternalOptions.mapEffect

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
  <A>(that: Options<A>): <B>(self: Options<B>) => Options<Either<A, B>>
  <A, B>(self: Options<A>, that: Options<B>): Options<Either<A, B>>
} = InternalOptions.orElseEither

/**
 * @since 1.0.0
 * @category combinators
 */
export const parse: {
  (
    args: HashMap<string, ReadonlyArray<string>>,
    config: CliConfig
  ): <A>(self: Options<A>) => Effect<A, ValidationError, FileSystem>
  <A>(
    self: Options<A>,
    args: HashMap<string, ReadonlyArray<string>>,
    config: CliConfig
  ): Effect<A, ValidationError, FileSystem>
} = InternalOptions.parse

/**
 * Indicates that the specified command-line option can be repeated `0` or more
 * times.
 *
 * **NOTE**: if the command-line option is not provided, and empty array will be
 * returned as the value for said option.
 *
 * @since 1.0.0
 * @category combinators
 */
export const repeated: <A>(self: Options<A>) => Options<Array<A>> = InternalOptions.repeated

/**
 * Processes the provided command-line arguments, searching for the specified
 * `Options`.
 *
 * Returns an `Option<ValidationError>`, any leftover arguments, and the
 * constructed value of type `A`. The possible error inside
 * `Option<ValidationError>` would only be triggered if there is an error when
 * parsing the command-line arguments. This is because `ValidationError`s are
 * also used internally to control the end of the command-line arguments (i.e.
 * the command-line symbol `--`) corresponding to options.
 *
 * @since 1.0.0
 * @category combinators
 */
export const processCommandLine: {
  (
    args: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(
    self: Options<A>
  ) => Effect<
    [Option<ValidationError>, Array<string>, A],
    ValidationError,
    FileSystem | Path | Terminal
  >
  <A>(
    self: Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<
    [Option<ValidationError>, Array<string>, A],
    ValidationError,
    FileSystem | Path | Terminal
  >
} = InternalOptions.processCommandLine

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
  <const B>(fallback: B): <A>(self: Options<A>) => Options<B | A>
  <A, const B>(self: Options<A>, fallback: B): Options<A | B>
} = InternalOptions.withDefault

/**
 * @since 1.0.0
 * @category combinators
 */
export const withFallbackConfig: {
  <B>(config: Config<B>): <A>(self: Options<A>) => Options<B | A>
  <A, B>(self: Options<A>, config: Config<B>): Options<A | B>
} = InternalOptions.withFallbackConfig

/**
 * @since 1.0.0
 * @category combinators
 */
export const withFallbackPrompt: {
  <B>(prompt: Prompt<B>): <A>(self: Options<A>) => Options<B | A>
  <A, B>(self: Options<A>, prompt: Prompt<B>): Options<A | B>
} = InternalOptions.withFallbackPrompt

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

/**
 * @since 1.0.0
 * @category combinators
 */
export const withSchema: {
  <A, I extends A, B>(schema: Schema<B, I, FileSystem | Path | Terminal>): (self: Options<A>) => Options<B>
  <A, I extends A, B>(self: Options<A>, schema: Schema<B, I, FileSystem | Path | Terminal>): Options<B>
} = InternalOptions.withSchema

/**
 * @since 1.0.0
 * @category combinators
 */
export const wizard: {
  (
    config: CliConfig
  ): <A>(
    self: Options<A>
  ) => Effect<
    Array<string>,
    QuitException | ValidationError,
    FileSystem | Path | Terminal
  >
  <A>(
    self: Options<A>,
    config: CliConfig
  ): Effect<
    Array<string>,
    QuitException | ValidationError,
    FileSystem | Path | Terminal
  >
} = InternalOptions.wizard

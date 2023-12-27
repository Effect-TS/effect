/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { QuitException, Terminal } from "@effect/platform/Terminal"
import type { Config } from "effect/Config"
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { Secret } from "effect/Secret"
import type { CliConfig } from "./CliConfig.js"
import type { HelpDoc } from "./HelpDoc.js"
import * as InternalArgs from "./internal/args.js"
import type { Primitive } from "./Primitive.js"
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
  export interface BaseArgsConfig {
    readonly name?: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PathArgsConfig extends BaseArgsConfig {
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
  export type ArgsAny = Args<any>

  /**
   * @since 1.0.0
   */
  export type ReturnIterable<T extends Iterable<ArgsAny>> = [T] extends [Iterable<Args.Variance<infer A>>] ?
    Args<Array<A>>
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
export const boolean: (options?: Args.BaseArgsConfig) => Args<boolean> = InternalArgs.boolean

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
  config?: Args.BaseArgsConfig
) => Args<A> = InternalArgs.choice

/**
 * Creates a date argument.
 *
 * Can optionally provide a custom argument name (defaults to `"date"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const date: (config?: Args.BaseArgsConfig) => Args<globalThis.Date> = InternalArgs.date

/**
 * Creates a directory argument.
 *
 * Can optionally provide a custom argument name (defaults to `"directory"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const directory: (config?: Args.PathArgsConfig) => Args<string> = InternalArgs.directory

/**
 * Creates a file argument.
 *
 * Can optionally provide a custom argument name (defaults to `"file"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const file: (config?: Args.PathArgsConfig) => Args<string> = InternalArgs.file

/**
 * Creates a floating point number argument.
 *
 * Can optionally provide a custom argument name (defaults to `"float"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const float: (config?: Args.BaseArgsConfig) => Args<number> = InternalArgs.float

/**
 * @since 1.0.0
 * @category combinators
 */
export const getHelp: <A>(self: Args<A>) => HelpDoc = InternalArgs.getHelp

/**
 * @since 1.0.0
 * @category combinators
 */
export const getIdentifier: <A>(self: Args<A>) => Option<string> = InternalArgs.getIdentifier

/**
 * @since 1.0.0
 * @category combinators
 */
export const getMinSize: <A>(self: Args<A>) => number = InternalArgs.getMinSize

/**
 * @since 1.0.0
 * @category combinators
 */
export const getMaxSize: <A>(self: Args<A>) => number = InternalArgs.getMaxSize

/**
 * @since 1.0.0
 * @category combinators
 */
export const getUsage: <A>(self: Args<A>) => Usage = InternalArgs.getUsage

/**
 * Creates an integer argument.
 *
 * Can optionally provide a custom argument name (defaults to `"integer"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const integer: (config?: Args.BaseArgsConfig) => Args<number> = InternalArgs.integer

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
 * @since 1.0.0
 * @category combinators
 */
export const optional: <A>(self: Args<A>) => Args<Option<A>> = InternalArgs.optional

/**
 *  Creates an empty argument.
 *
 * @since 1.0.0
 * @category constructors
 */
export const none: Args<void> = InternalArgs.none

/**
 * Creates a path argument.
 *
 * Can optionally provide a custom argument name (defaults to `"path"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const path: (config?: Args.PathArgsConfig) => Args<string> = InternalArgs.path

/**
 * @since 1.0.0
 * @category combinators
 */
export const repeated: <A>(self: Args<A>) => Args<ReadonlyArray<A>> = InternalArgs.repeated

/**
 * Creates a text argument.
 *
 * Can optionally provide a custom argument name (defaults to `"secret"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const secret: (config?: Args.BaseArgsConfig) => Args<Secret> = InternalArgs.secret

/**
 * Creates a text argument.
 *
 * Can optionally provide a custom argument name (defaults to `"text"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: (config?: Args.BaseArgsConfig) => Args<string> = InternalArgs.text

/**
 * @since 1.0.0
 * @category combinators
 */
export const validate: {
  (
    args: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(self: Args<A>) => Effect<FileSystem, ValidationError, [ReadonlyArray<string>, A]>
  <A>(
    self: Args<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<FileSystem, ValidationError, [ReadonlyArray<string>, A]>
} = InternalArgs.validate

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDefault: {
  <const B>(fallback: B): <A>(self: Args<A>) => Args<B | A>
  <A, const B>(self: Args<A>, fallback: B): Args<A | B>
} = InternalArgs.withDefault

/**
 * @since 1.0.0
 * @category combinators
 */
export const withFallbackConfig: {
  <B>(config: Config<B>): <A>(self: Args<A>) => Args<B | A>
  <A, B>(self: Args<A>, config: Config<B>): Args<A | B>
} = InternalArgs.withFallbackConfig

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDescription: {
  (description: string): <A>(self: Args<A>) => Args<A>
  <A>(self: Args<A>, description: string): Args<A>
} = InternalArgs.withDescription

/**
 * @since 1.0.0
 * @category combinators
 */
export const wizard: {
  (
    config: CliConfig
  ): <A>(
    self: Args<A>
  ) => Effect<FileSystem | Terminal, ValidationError | QuitException, ReadonlyArray<string>>
  <A>(
    self: Args<A>,
    config: CliConfig
  ): Effect<FileSystem | Terminal, ValidationError | QuitException, ReadonlyArray<string>>
} = InternalArgs.wizard

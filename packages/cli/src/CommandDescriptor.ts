/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { QuitException, Terminal } from "@effect/platform/Terminal"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Effect } from "effect/Effect"
import type { HashMap } from "effect/HashMap"
import type { HashSet } from "effect/HashSet"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { Args } from "./Args.js"
import type { CliConfig } from "./CliConfig.js"
import type { CommandDirective } from "./CommandDirective.js"
import type { HelpDoc } from "./HelpDoc.js"
import * as Internal from "./internal/commandDescriptor.js"
import type { Options } from "./Options.js"
import type { Prompt } from "./Prompt.js"
import type { Usage } from "./Usage.js"
import type { ValidationError } from "./ValidationError.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId: unique symbol = Internal.TypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type TypeId = typeof TypeId

/**
 * A `Command` represents a command in a command-line application.
 *
 * Every command-line application will have at least one command: the
 * application itself. Other command-line applications may support multiple
 * commands.
 *
 * @since 1.0.0
 * @category models
 */
export interface Command<A> extends Command.Variance<A>, Pipeable {}

/**
 * @since 1.0.0
 */
export declare namespace Command {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [TypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type ParsedStandardCommand<Name extends string, OptionsType, ArgsType> = Command.ComputeParsedType<{
    readonly name: Name
    readonly options: OptionsType
    readonly args: ArgsType
  }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ParsedUserInputCommand<Name extends string, ValueType> = Command.ComputeParsedType<{
    readonly name: Name
    readonly value: ValueType
  }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type GetParsedType<C> = C extends Command<infer P> ? P : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ComputeParsedType<A> = { [K in keyof A]: A[K] } extends infer X ? X : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Subcommands<
    A extends NonEmptyReadonlyArray<readonly [id: unknown, command: Command<any>]>
  > = {
    [I in keyof A]: A[I] extends readonly [infer Id, Command<infer Value>] ? readonly [id: Id, value: Value]
      : never
  }[number]
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const getHelp: <A>(self: Command<A>, config: CliConfig) => HelpDoc = Internal.getHelp

/**
 * @since 1.0.0
 * @category combinators
 */
export const getBashCompletions: <A>(
  self: Command<A>,
  programName: string
) => Effect<Array<string>> = Internal.getBashCompletions

/**
 * @since 1.0.0
 * @category combinators
 */
export const getFishCompletions: <A>(
  self: Command<A>,
  programName: string
) => Effect<Array<string>> = Internal.getFishCompletions

/**
 * @since 1.0.0
 * @category combinators
 */
export const getZshCompletions: <A>(
  self: Command<A>,
  programName: string
) => Effect<Array<string>> = Internal.getZshCompletions

/**
 * @since 1.0.0
 * @category combinators
 */
export const getNames: <A>(self: Command<A>) => HashSet<string> = Internal.getNames

/**
 * @since 1.0.0
 * @category combinators
 */
export const getSubcommands: <A>(self: Command<A>) => HashMap<string, Command<unknown>> = Internal.getSubcommands

/**
 * @since 1.0.0
 * @category combinators
 */
export const getUsage: <A>(self: Command<A>) => Usage = Internal.getUsage

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Command<A>) => Command<B>
  <A, B>(self: Command<A>, f: (a: A) => B): Command<B>
} = Internal.map

/**
 * @since 1.0.0
 * @category combinators
 */
export const mapEffect: {
  <A, B>(f: (a: A) => Effect<B, ValidationError, FileSystem | Path | Terminal>): (self: Command<A>) => Command<B>
  <A, B>(self: Command<A>, f: (a: A) => Effect<B, ValidationError, FileSystem | Path | Terminal>): Command<B>
} = Internal.mapEffect

/**
 * @since 1.0.0
 * @category combinators
 */
export const parse: {
  (
    args: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(
    self: Command<A>
  ) => Effect<CommandDirective<A>, ValidationError, FileSystem | Path | Terminal>
  <A>(
    self: Command<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<CommandDirective<A>, ValidationError, FileSystem | Path | Terminal>
} = Internal.parse

/**
 * @since 1.0.0
 * @category constructors
 */
export const prompt: <Name extends string, A>(
  name: Name,
  prompt: Prompt<A>
) => Command<{ readonly name: Name; readonly value: A }> = Internal.prompt

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <Name extends string, OptionsType = void, ArgsType = void>(
  name: Name,
  options?: Options<OptionsType>,
  args?: Args<ArgsType>
) => Command<{ readonly name: Name; readonly options: OptionsType; readonly args: ArgsType }> = Internal.make

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDescription: {
  (description: string | HelpDoc): <A>(self: Command<A>) => Command<A>
  <A>(self: Command<A>, description: string | HelpDoc): Command<A>
} = Internal.withDescription

/**
 * @since 1.0.0
 * @category combinators
 */
export const withSubcommands: {
  <
    const Subcommands extends readonly [
      readonly [id: unknown, command: Command<any>],
      ...Array<readonly [id: unknown, command: Command<any>]>
    ]
  >(
    subcommands: [...Subcommands]
  ): <A>(
    self: Command<A>
  ) => Command<
    Command.ComputeParsedType<
      A & Readonly<{ subcommand: Option<Command.Subcommands<Subcommands>> }>
    >
  >
  <
    A,
    const Subcommands extends readonly [
      readonly [id: unknown, command: Command<any>],
      ...Array<readonly [id: unknown, command: Command<any>]>
    ]
  >(
    self: Command<A>,
    subcommands: [...Subcommands]
  ): Command<
    Command.ComputeParsedType<
      A & Readonly<{ subcommand: Option<Command.Subcommands<Subcommands>> }>
    >
  >
} = Internal.withSubcommands

/**
 * @since 1.0.0
 * @category combinators
 */
export const wizard: {
  (
    prefix: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(
    self: Command<A>
  ) => Effect<
    Array<string>,
    ValidationError | QuitException,
    FileSystem | Path | Terminal
  >
  <A>(
    self: Command<A>,
    prefix: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<
    Array<string>,
    ValidationError | QuitException,
    FileSystem | Path | Terminal
  >
} = Internal.wizard

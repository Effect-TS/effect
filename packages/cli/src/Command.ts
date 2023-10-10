/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { HashMap } from "effect/HashMap"
import type { HashSet } from "effect/HashSet"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { Args } from "./Args"
import type { CliConfig } from "./CliConfig"
import type { CommandDirective } from "./CommandDirective"
import type { HelpDoc } from "./HelpDoc"
import * as internal from "./internal/command"
import type { Options } from "./Options"
import type { Prompt } from "./Prompt"
import type { Terminal } from "./Terminal"
import type { Usage } from "./Usage"
import type { ValidationError } from "./ValidationError"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CommandTypeId: unique symbol = internal.CommandTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CommandTypeId = typeof CommandTypeId

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
    readonly [CommandTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ConstructorConfig<OptionsType = void, ArgsType = void> {
    readonly options?: Options<OptionsType>
    readonly args?: Args<ArgsType>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Parsed<Name extends string, OptionsType, ArgsType> = Command.ComputeParsedType<{
    readonly name: Name
    readonly options: OptionsType
    readonly args: ArgsType
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
  export type Subcommands<A extends NonEmptyReadonlyArray<Command<any>>> = GetParsedType<A[number]>
}

/**
 * @since 1.0.0
 * @category getters
 */
export const getSubcommands: <A>(self: Command<A>) => HashMap<string, Command<unknown>> = internal.getSubcommands

/**
 * @since 1.0.0
 * @category getters
 */
export const helpDoc: <A>(self: Command<A>) => HelpDoc = internal.helpDoc

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <Name extends string, OptionsType = void, ArgsType = void>(
  name: Name,
  config?: Command.ConstructorConfig<OptionsType, ArgsType>
) => Command<{ readonly name: Name; readonly options: OptionsType; readonly args: ArgsType }> = internal.make

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Command<A>) => Command<B>
  <A, B>(self: Command<A>, f: (a: A) => B): Command<B>
} = internal.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapOrFail: {
  <A, B>(f: (a: A) => Either<ValidationError, B>): (self: Command<A>) => Command<B>
  <A, B>(self: Command<A>, f: (a: A) => Either<ValidationError, B>): Command<B>
} = internal.mapOrFail

/**
 * @since 1.0.0
 * @category getters
 */
export const names: <A>(self: Command<A>) => HashSet<string> = internal.names

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  <B>(that: Command<B>): <A>(self: Command<A>) => Command<A | B>
  <A, B>(self: Command<A>, that: Command<B>): Command<A | B>
} = internal.orElse

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElseEither: {
  <B>(that: Command<B>): <A>(self: Command<A>) => Command<Either<A, B>>
  <A, B>(self: Command<A>, that: Command<B>): Command<Either<A, B>>
} = internal.orElseEither

/**
 * @since 1.0.0
 * @category parsing
 */
export const parse: {
  (
    args: ReadonlyArray<string>,
    config: CliConfig
  ): <A>(self: Command<A>) => Effect<Terminal, ValidationError, CommandDirective<A>>
  <A>(
    self: Command<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<Terminal, ValidationError, CommandDirective<A>>
} = internal.parse

/**
 * @since 1.0.0
 * @category constructors
 */
export const prompt: <Name extends string, A>(
  name: Name,
  prompt: Prompt<A>
) => Command<{ readonly name: Name; readonly value: A }> = internal.prompt

/**
 * @since 1.0.0
 * @category combinators
 */
export const subcommands: {
  <Subcommands extends NonEmptyReadonlyArray<Command<any>>>(
    subcommands: [...Subcommands]
  ): <A>(
    self: Command<A>
  ) => Command<
    Command.ComputeParsedType<A & Readonly<{ subcommand: Option<Command.GetParsedType<Subcommands[number]>> }>>
  >
  <A, Subcommands extends NonEmptyReadonlyArray<Command<any>>>(
    self: Command<A>,
    subcommands: [...Subcommands]
  ): Command<
    Command.ComputeParsedType<A & Readonly<{ subcommand: Option<Command.GetParsedType<Subcommands[number]>> }>>
  >
} = internal.subcommands

/**
 * @since 1.0.0
 * @category getters
 */
export const usage: <A>(self: Command<A>) => Usage = internal.usage

/**
 * @since 1.0.0
 * @category combinators
 */
export const withHelp: {
  (help: string | HelpDoc): <A>(self: Command<A>) => Command<A>
  <A>(self: Command<A>, help: string | HelpDoc): Command<A>
} = internal.withHelp

/**
 * @since 1.0.0
 */
import type { Args } from "@effect/cli/Args"
import type { CliConfig } from "@effect/cli/CliConfig"
import type { CommandDirective } from "@effect/cli/CommandDirective"
import type { HelpDoc } from "@effect/cli/HelpDoc"
import * as internal from "@effect/cli/internal/command"
import type { Options } from "@effect/cli/Options"
import type { Usage } from "@effect/cli/Usage"
import type { ValidationError } from "@effect/cli/ValidationError"
import type { Either } from "@effect/data/Either"
import type { HashMap } from "@effect/data/HashMap"
import type { HashSet } from "@effect/data/HashSet"
import type { Option } from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import type { Effect } from "@effect/io/Effect"

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
export interface Command<A> extends Command.Variance<A> {}

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
  ): <A>(self: Command<A>) => Effect<never, ValidationError, CommandDirective<A>>
  <A>(
    self: Command<A>,
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<never, ValidationError, CommandDirective<A>>
} = internal.parse

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

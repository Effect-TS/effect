/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { HashMap } from "effect/HashMap"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { Args } from "./Args"
import type { CliConfig } from "./CliConfig"
import type { CommandDirective } from "./CommandDirective"
import type { HelpDoc } from "./HelpDoc"
import * as InternalCommand from "./internal/command"
import type { Options } from "./Options"
import type { Named } from "./Parameter"
import type { Prompt } from "./Prompt"
import type { Terminal } from "./Terminal"
import type { Usage } from "./Usage"
import type { ValidationError } from "./ValidationError"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CommandTypeId: unique symbol = InternalCommand.CommandTypeId

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
export interface Command<A> extends Command.Variance<A>, Named, Pipeable {
  get usage(): Usage
  get subcommands(): HashMap<string, Command<unknown>>
  parse(args: ReadonlyArray<string>, config: CliConfig): Effect<Terminal, ValidationError, CommandDirective<A>>
}

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
  export type ParsedSubcommand<A extends NonEmptyReadonlyArray<any>> = A[number] extends Command<any>
    ? GetParsedType<A[number]>
    : never

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
 * @category constructors
 */
export const standard: <Name extends string, OptionsType = void, ArgsType = void>(
  name: Name,
  config?: Command.ConstructorConfig<OptionsType, ArgsType>
) => Command<{ readonly name: Name; readonly options: OptionsType; readonly args: ArgsType }> = InternalCommand.standard

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Command<A>) => Command<B>
  <A, B>(self: Command<A>, f: (a: A) => B): Command<B>
} = InternalCommand.map

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  <B>(that: Command<B>): <A>(self: Command<A>) => Command<A | B>
  <A, B>(self: Command<A>, that: Command<B>): Command<A | B>
} = InternalCommand.orElse

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElseEither: {
  <B>(that: Command<B>): <A>(self: Command<A>) => Command<Either<A, B>>
  <A, B>(self: Command<A>, that: Command<B>): Command<Either<A, B>>
} = InternalCommand.orElseEither

/**
 * @since 1.0.0
 * @category constructors
 */
export const prompt: <Name extends string, A>(
  name: Name,
  prompt: Prompt<A>
) => Command<{ readonly name: Name; readonly value: A }> = InternalCommand.prompt

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
} = InternalCommand.subcommands

/**
 * @since 1.0.0
 * @category combinators
 */
export const withHelp: {
  (help: string | HelpDoc): <A>(self: Command<A>) => Command<A>
  <A>(self: Command<A>, help: string | HelpDoc): Command<A>
} = InternalCommand.withHelp

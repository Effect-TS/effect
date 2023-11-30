/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { QuitException, Terminal } from "@effect/platform/Terminal"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { HashMap } from "effect/HashMap"
import type { HashSet } from "effect/HashSet"
import type { Option } from "effect/Option"
import { type Pipeable } from "effect/Pipeable"
import type * as Types from "effect/Types"
import type { Args } from "./Args.js"
import type { CliApp } from "./CliApp.js"
import type { CliConfig } from "./CliConfig.js"
import type * as Descriptor from "./CommandDescriptor.js"
import type { HelpDoc } from "./HelpDoc.js"
import type { Span } from "./HelpDoc/Span.js"
import * as Internal from "./internal/command.js"
import type { Options } from "./Options.js"
import type { Prompt } from "./Prompt.js"
import type { Usage } from "./Usage.js"
import type { ValidationError } from "./ValidationError.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Command<Name extends string, R, E, A>
  extends Pipeable, Effect<Command.Context<Name>, never, A>
{
  readonly [TypeId]: TypeId
  readonly descriptor: Descriptor.Command<A>
  readonly handler: (_: A) => Effect<R, E, void>
  readonly tag: Tag<Command.Context<Name>, A>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Command {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Context<Name extends string> {
    readonly _: unique symbol
    readonly name: Name
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ConfigBase {
    readonly [key: string]:
      | Args<any>
      | Options<any>
      | ReadonlyArray<Args<any> | Options<any> | ConfigBase>
      | ConfigBase
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type ParseConfig<A extends ConfigBase> = Types.Simplify<
    { readonly [Key in keyof A]: ParseConfigValue<A[Key]> }
  >

  type ParseConfigValue<A> = A extends ReadonlyArray<infer _> ?
    { readonly [Key in keyof A]: ParseConfigValue<A[Key]> } :
    A extends Args<infer Value> ? Value
    : A extends Options<infer Value> ? Value
    : A extends ConfigBase ? ParseConfig<A>
    : never

  interface ParsedConfigTree {
    [key: string]: ParsedConfigNode
  }

  type ParsedConfigNode = {
    readonly _tag: "Args"
    readonly index: number
  } | {
    readonly _tag: "Options"
    readonly index: number
  } | {
    readonly _tag: "Array"
    readonly children: ReadonlyArray<ParsedConfigNode>
  } | {
    readonly _tag: "ParsedConfig"
    readonly tree: ParsedConfigTree
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ParsedConfig {
    readonly args: ReadonlyArray<Args<any>>
    readonly options: ReadonlyArray<Options<any>>
    readonly tree: ParsedConfigTree
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromDescriptor: {
  (): <A extends { readonly name: string }>(
    command: Descriptor.Command<A>
  ) => Command<A["name"], never, never, A>

  <A extends { readonly name: string }, R, E>(
    handler: (_: A) => Effect<R, E, void>
  ): (command: Descriptor.Command<A>) => Command<A["name"], R, E, A>

  <A extends { readonly name: string }>(
    descriptor: Descriptor.Command<A>
  ): Command<A["name"], never, never, A>

  <A extends { readonly name: string }, R, E>(
    descriptor: Descriptor.Command<A>,
    handler: (_: A) => Effect<R, E, void>
  ): Command<A["name"], R, E, A>
} = Internal.fromDescriptor

/**
 * @since 1.0.0
 * @category accessors
 */
export const getHelp: <Name extends string, R, E, A>(self: Command<Name, R, E, A>) => HelpDoc =
  Internal.getHelp

/**
 * @since 1.0.0
 * @category accessors
 */
export const getNames: <Name extends string, R, E, A>(
  self: Command<Name, R, E, A>
) => HashSet<string> = Internal.getNames

/**
 * @since 1.0.0
 * @category accessors
 */
export const getBashCompletions: <Name extends string, R, E, A>(
  self: Command<Name, R, E, A>,
  programName: string
) => Effect<never, never, ReadonlyArray<string>> = Internal.getBashCompletions

/**
 * @since 1.0.0
 * @category accessors
 */
export const getFishCompletions: <Name extends string, R, E, A>(
  self: Command<Name, R, E, A>,
  programName: string
) => Effect<never, never, ReadonlyArray<string>> = Internal.getFishCompletions

/**
 * @since 1.0.0
 * @category accessors
 */
export const getZshCompletions: <Name extends string, R, E, A>(
  self: Command<Name, R, E, A>,
  programName: string
) => Effect<never, never, ReadonlyArray<string>> = Internal.getZshCompletions

/**
 * @since 1.0.0
 * @category accessors
 */
export const getSubcommands: <Name extends string, R, E, A>(
  self: Command<Name, R, E, A>
) => HashMap<string, Descriptor.Command<unknown>> = Internal.getSubcommands

/**
 * @since 1.0.0
 * @category accessors
 */
export const getUsage: <Name extends string, R, E, A>(self: Command<Name, R, E, A>) => Usage =
  Internal.getUsage

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  <Name extends string>(name: Name): Command<
    Name,
    never,
    never,
    {}
  >

  <Name extends string, const Config extends Command.ConfigBase>(
    name: Name,
    config: Config
  ): Command<
    Name,
    never,
    never,
    Types.Simplify<Command.ParseConfig<Config>>
  >

  <Name extends string, const Config extends Command.ConfigBase, R, E>(
    name: Name,
    config: Config,
    handler: (_: Types.Simplify<Command.ParseConfig<Config>>) => Effect<R, E, void>
  ): Command<
    Name,
    R,
    E,
    Types.Simplify<Command.ParseConfig<Config>>
  >
} = Internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const prompt: <Name extends string, A, R, E>(
  name: Name,
  prompt: Prompt<A>,
  handler: (_: A) => Effect<R, E, void>
) => Command<string, R, E, A> = Internal.prompt

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDescription: {
  (
    help: string | HelpDoc
  ): <Name extends string, R, E, A>(self: Command<Name, R, E, A>) => Command<Name, R, E, A>
  <Name extends string, R, E, A>(
    self: Command<Name, R, E, A>,
    help: string | HelpDoc
  ): Command<Name, R, E, A>
} = Internal.withDescription

/**
 * @since 1.0.0
 * @category combinators
 */
export const withSubcommands: {
  <
    Subcommand extends readonly [Command<any, any, any, any>, ...Array<Command<any, any, any, any>>]
  >(
    subcommands: Subcommand
  ): <Name extends string, R, E, A>(
    self: Command<Name, R, E, A>
  ) => Command<
    Name,
    | R
    | Exclude<Effect.Context<ReturnType<Subcommand[number]["handler"]>>, Command.Context<Name>>,
    E | Effect.Error<ReturnType<Subcommand[number]["handler"]>>,
    Descriptor.Command.ComputeParsedType<
      & A
      & Readonly<
        { subcommand: Option<Descriptor.Command.GetParsedType<Subcommand[number]["descriptor"]>> }
      >
    >
  >
  <
    Name extends string,
    R,
    E,
    A,
    Subcommand extends readonly [Command<any, any, any, any>, ...Array<Command<any, any, any, any>>]
  >(
    self: Command<Name, R, E, A>,
    subcommands: Subcommand
  ): Command<
    Name,
    | R
    | Exclude<Effect.Context<ReturnType<Subcommand[number]["handler"]>>, Command.Context<Name>>,
    E | Effect.Error<ReturnType<Subcommand[number]["handler"]>>,
    Descriptor.Command.ComputeParsedType<
      & A
      & Readonly<
        { subcommand: Option<Descriptor.Command.GetParsedType<Subcommand[number]["descriptor"]>> }
      >
    >
  >
} = Internal.withSubcommands

/**
 * @since 1.0.0
 * @category accessors
 */
export const wizard: {
  (
    prefix: ReadonlyArray<string>,
    config: CliConfig
  ): <Name extends string, R, E, A>(
    self: Command<Name, R, E, A>
  ) => Effect<Terminal | FileSystem, QuitException | ValidationError, ReadonlyArray<string>>
  <Name extends string, R, E, A>(
    self: Command<Name, R, E, A>,
    prefix: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<Terminal | FileSystem, QuitException | ValidationError, ReadonlyArray<string>>
} = Internal.wizard

/**
 * @since 1.0.0
 * @category conversions
 */
export const run: {
  (
    config: {
      readonly name: string
      readonly version: string
      readonly summary?: Span | undefined
      readonly footer?: HelpDoc | undefined
    }
  ): <Name extends string, R, E, A>(
    self: Command<Name, R, E, A>
  ) => (args: ReadonlyArray<string>) => Effect<R | CliApp.Environment, E | ValidationError, void>
  <Name extends string, R, E, A>(
    self: Command<Name, R, E, A>,
    config: {
      readonly name: string
      readonly version: string
      readonly summary?: Span | undefined
      readonly footer?: HelpDoc | undefined
    }
  ): (args: ReadonlyArray<string>) => Effect<CliApp.Environment | R, ValidationError | E, void>
} = Internal.run

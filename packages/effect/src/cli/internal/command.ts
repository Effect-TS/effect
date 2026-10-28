/**
 * Command Implementation
 * ======================
 *
 * Internal implementation details for CLI commands.
 * Public API is in ../Command.ts
 */
import * as Arr from "../../Array.ts"
import * as Context from "../../Context.ts"
import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Effectable from "../../Effectable.ts"
import * as Fiber from "../../Fiber.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import type * as Scope from "../../Scope.ts"
import * as CliError from "../CliError.ts"
import type * as GlobalFlag from "../GlobalFlag.ts"
import type { ArgDoc, ExampleDoc, FlagDoc, HelpDoc, SubcommandGroupDoc } from "../HelpDoc.ts"
import * as Param from "../Param.ts"
import * as Primitive from "../Primitive.ts"
import { type ConfigInternal, emptyConfig, reconstructTree } from "./config.ts"
import { PromptDeferral } from "./fallbackPrompt.ts"

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

import type { Command, CommandContext, Environment, ParsedTokens } from "../Command.ts"

/**
 * Parses tokens without showing fallback prompts. Succeeds with an effect
 * that shows the deferred prompts in declaration order and returns the input.
 */
export type Prepare<A> = (
  input: ParsedTokens
) => Effect.Effect<Effect.Effect<A, CliError.CliError, Environment>, CliError.CliError, Environment | Scope.Scope>

interface SubcommandGroup {
  readonly group: string | undefined
  readonly commands: Arr.NonEmptyReadonlyArray<Command<any, unknown, any, unknown, unknown>>
}

/**
 * Internal implementation interface with all the machinery.
 * Use toImpl() to access from internal code.
 */
export interface CommandInternal<Name extends string, Input, E, R, ContextInput>
  extends Command<Name, Input, ContextInput, E, R>
{
  readonly config: ConfigInternal
  readonly contextConfig: ConfigInternal
  readonly service: Context.Key<CommandContext<Name>, ContextInput>
  readonly annotations: Context.Context<never>
  readonly globalFlags: ReadonlyArray<GlobalFlag.GlobalFlag<any>>
  readonly beforePrompts: ReadonlyArray<Effect.Effect<unknown, unknown, unknown>>
  readonly prepare: Prepare<Input>
  readonly prepareContext: Prepare<ContextInput>
  readonly parse: (input: ParsedTokens) => Effect.Effect<Input, CliError.CliError, Environment>
  readonly handle: (
    input: Input,
    commandPath: ReadonlyArray<string>
  ) => Effect.Effect<void, E | CliError.CliError, R | Environment>
  readonly buildHelpDoc: (commandPath: ReadonlyArray<string>) => HelpDoc
  readonly resolveExamples: (commandPath: ReadonlyArray<string>) => ReadonlyArray<Command.Example>
}

/* ========================================================================== */
/* Type ID                                                                    */
/* ========================================================================== */

export const TypeId = "~effect/cli/Command" as const

/* ========================================================================== */
/* Casting                                                                    */
/* ========================================================================== */

/**
 * Casts a Command to its internal implementation.
 * For use by internal modules that need access to config, parse, handle, etc.
 */
export const toImpl = <Name extends string, Input, E, R, ContextInput = {}>(
  self: Command<Name, Input, ContextInput, E, R>
): CommandInternal<Name, Input, E, R, ContextInput> => self as CommandInternal<Name, Input, E, R, ContextInput>

/* ========================================================================== */
/* Proto                                                                      */
/* ========================================================================== */

export const Proto: Effect.Effect<any, never, any> = {
  ...Effectable.Prototype<Command.Any>({
    label: "Command",
    evaluate() {
      return toImpl(this).service
    }
  })
}

/* ========================================================================== */
/* Constructor                                                                */
/* ========================================================================== */

/**
 * Internal command constructor. Only accepts already-parsed ConfigInternal.
 */
export const makeCommand = <const Name extends string, Input, E, R, ContextInput = {}>(options: {
  readonly name: Name
  readonly config: ConfigInternal
  readonly contextConfig?: ConfigInternal | undefined
  readonly service?: Context.Key<CommandContext<Name>, ContextInput> | undefined
  readonly annotations?: Context.Context<never> | undefined
  readonly globalFlags?: ReadonlyArray<GlobalFlag.GlobalFlag<any>> | undefined
  readonly beforePrompts?: ReadonlyArray<Effect.Effect<unknown, unknown, unknown>> | undefined
  readonly description?: string | undefined
  readonly shortDescription?: string | undefined
  readonly alias?: string | undefined
  readonly unlisted?: boolean | undefined
  readonly resolveExamples?: ((commandPath: ReadonlyArray<string>) => ReadonlyArray<Command.Example>) | undefined
  readonly subcommands?: ReadonlyArray<SubcommandGroup> | undefined
  readonly prepare?: Prepare<Input> | undefined
  readonly prepareContext?: Prepare<ContextInput> | undefined
  readonly handle?:
    | ((input: Input, commandPath: ReadonlyArray<string>) => Effect.Effect<void, E, R | Environment>)
    | undefined
}): Command<Name, Input, ContextInput, E, R> => {
  const config = options.config
  const contextConfig = options.contextConfig ?? emptyConfig
  const service = options.service ?? Context.Service<CommandContext<Name>, ContextInput>(`${TypeId}/${options.name}`)
  const annotations = options.annotations ?? Context.empty()
  const globalFlags = options.globalFlags ?? []
  const beforePrompts = options.beforePrompts ?? []
  const subcommands = options.subcommands ?? []
  const resolveExamples = options.resolveExamples ?? noExamples

  const handle = (
    input: Input,
    commandPath: ReadonlyArray<string>
  ): Effect.Effect<void, CliError.CliError | E, R | Environment> =>
    Predicate.isNotUndefined(options.handle)
      ? options.handle(input, commandPath)
      : Effect.fail(new CliError.ShowHelp({ commandPath, errors: [] }))

  const prepare: Prepare<Input> = options.prepare ?? makeParser(config) as Prepare<Input>
  const prepareContext: Prepare<ContextInput> = options.prepareContext ??
    makeParser(contextConfig, { allowLeftovers: true }) as Prepare<ContextInput>
  const parse = (input: ParsedTokens) => Effect.scoped(Effect.flatten(prepare(input)))

  const buildHelpDoc = (commandPath: ReadonlyArray<string>): HelpDoc => {
    const args: Array<ArgDoc> = []
    const flags: Array<FlagDoc> = []

    for (const arg of config.arguments) {
      const singles = Param.extractSingleParams(arg)
      const metadata = Param.getParamMetadata(arg)
      for (const single of singles) {
        args.push({
          name: single.name,
          type: single.typeName ?? Primitive.getTypeName(single.primitiveType),
          description: single.description,
          required: !metadata.isOptional &&
            (!metadata.isVariadic || Option.exists(metadata.variadicMin, (min) => min > 0)),
          variadic: metadata.isVariadic
        })
      }
    }

    let usage = commandPath.length > 0 ? commandPath.join(" ") : options.name
    // Only render `<subcommand>` in usage when at least one visible subcommand
    // exists; an all-unlisted subcommand tree should look like a leaf command.
    if (subcommands.some((group) => group.commands.some((c) => !c.unlisted))) {
      usage += " <subcommand>"
    }
    usage += " [flags]"
    for (const arg of args) {
      const argName = arg.variadic ? `<${arg.name}...>` : `<${arg.name}>`
      usage += ` ${arg.required ? argName : `[${argName}]`}`
    }

    for (const option of config.flags) {
      const singles = Param.extractSingleParams(option)
      const metadata = Param.getParamMetadata(option)
      for (const single of singles) {
        // Hidden flags still parse on the command line but are omitted from
        // generated --help output.
        if (single.hidden) continue
        flags.push(toFlagDoc(single, metadata))
      }
    }

    const subcommandDocs: Array<SubcommandGroupDoc> = []

    for (const group of subcommands) {
      // Unlisted subcommands still parse on the command line but are omitted
      // from --help. Drop the whole group when nothing visible remains so we
      // don't render an empty heading.
      const visible = group.commands.filter((c) => !c.unlisted)
      if (visible.length === 0) continue
      subcommandDocs.push({
        group: group.group,
        commands: Arr.map(visible as unknown as Arr.NonEmptyReadonlyArray<Command.Any>, (subcommand) => ({
          name: subcommand.name,
          alias: subcommand.alias,
          shortDescription: subcommand.shortDescription,
          description: subcommand.description ?? ""
        }))
      })
    }

    const examples: ReadonlyArray<ExampleDoc> = resolveExamples(commandPath)

    return {
      description: options.description ?? "",
      usage,
      flags,
      annotations,
      ...(args.length > 0 && { args }),
      ...(subcommandDocs.length > 0 && { subcommands: subcommandDocs }),
      ...(examples.length > 0 && { examples })
    }
  }

  return Object.assign(Object.create(Proto), {
    [TypeId]: TypeId,
    name: options.name,
    examples: resolveExamples([options.name]),
    resolveExamples,
    annotations,
    globalFlags,
    beforePrompts,
    subcommands,
    unlisted: options.unlisted ?? false,
    config,
    contextConfig,
    service,
    prepare,
    prepareContext,
    parse,
    handle,
    buildHelpDoc,
    ...(Predicate.isNotUndefined(options.description)
      ? { description: options.description }
      : {}),
    ...(Predicate.isNotUndefined(options.shortDescription)
      ? { shortDescription: options.shortDescription }
      : {}),
    ...(Predicate.isNotUndefined(options.alias)
      ? { alias: options.alias }
      : {})
  })
}

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

const noExamples = (): ReadonlyArray<Command.Example> => []

/**
 * Converts a single flag param into a FlagDoc for help display.
 *
 * @internal
 */
export const toFlagDoc = (
  single: Param.Single<typeof Param.flagKind, unknown>,
  metadata: ReturnType<typeof Param.getParamMetadata>
): FlagDoc => {
  const formattedAliases = single.aliases.map((alias) => alias.length === 1 ? `-${alias}` : `--${alias}`)
  const type = single.typeName ?? Primitive.getTypeName(single.primitiveType)
  return {
    name: single.name,
    aliases: formattedAliases,
    type: single.optionalValue === undefined ? type : `[=${type}]`,
    description: appendChoiceKeys(single.description, Primitive.getChoiceKeys(single.primitiveType)),
    required: single.primitiveType._tag !== "Boolean" && !metadata.isOptional
  }
}

const appendChoiceKeys = (
  description: Option.Option<string>,
  choiceKeys: ReadonlyArray<string> | undefined
): Option.Option<string> => {
  if (choiceKeys === undefined || choiceKeys.length === 0) {
    return description
  }
  const choiceSuffix = `(choices: ${choiceKeys.join(", ")})`
  return Option.match(description, {
    onNone: () => Option.some(choiceSuffix),
    onSome: (value) => Option.some(`${value} ${choiceSuffix}`)
  })
}

/**
 * Creates the `Prepare` function for a given config. Used as the default for
 * both `prepare` and `prepareContext`, and also by `withSharedFlags` to avoid
 * constructing a full throwaway command.
 */
export const makeParser = (
  cfg: ConfigInternal,
  options?: {
    readonly allowLeftovers?: boolean | undefined
  } | undefined
) =>
  Effect.fnUntraced(function*(input: ParsedTokens) {
    const resolvers: Array<Effect.Effect<unknown, CliError.CliError, Environment>> = []
    let currentArguments = input.arguments
    for (const param of cfg.orderedParams) {
      const prepared = yield* prepareParam(param, { flags: input.flags, arguments: currentArguments })
      resolvers.push(prepared.resolve)
      currentArguments = prepared.remainingArguments
    }
    if (options?.allowLeftovers !== true && currentArguments.length > 0) {
      return yield* new CliError.UnexpectedArgument({ arguments: currentArguments })
    }
    return Effect.map(Effect.all(resolvers), (values) => reconstructTree(cfg.tree, values))
  })

/**
 * A param parsed up to its fallback prompt.
 */
export interface PreparedParam<A> {
  readonly remainingArguments: ReadonlyArray<string>
  /**
   * Whether parsing paused at a fallback prompt.
   */
  readonly deferred: boolean
  /**
   * Shows the deferred fallback prompt, if any, and returns the value.
   */
  readonly resolve: Effect.Effect<A, CliError.CliError, Environment>
}

/**
 * Parses a param with its fallback prompt deferred.
 *
 * The parse runs in a fiber tied to the current scope. When it reaches a
 * fallback prompt it pauses there, so outer combinators such as
 * `withDefault` or `orElse` only see the prompt's outcome, and work done
 * before the prompt is not repeated. A paused param leaves the positional
 * arguments untouched, because a fallback prompt only runs when the value is
 * missing.
 */
export const prepareParam = <A>(
  param: Param.Param<Param.ParamKind, A>,
  args: Param.ParsedArgs
): Effect.Effect<PreparedParam<A>, CliError.CliError, Environment | Scope.Scope> =>
  Effect.gen(function*() {
    // Completed with `true` when the parse pauses at a prompt, `false` when it ends
    const paused = Deferred.makeUnsafe<boolean>()
    const resume = Deferred.makeUnsafe<void>()
    const deferral: PromptDeferral = {
      wait: Effect.andThen(Deferred.succeed(paused, true), Deferred.await(resume))
    }
    const fiber = yield* param.parse(args).pipe(
      Effect.provideService(PromptDeferral, deferral),
      Effect.ensuring(Deferred.succeed(paused, false)),
      Effect.forkScoped
    )
    if (yield* Deferred.await(paused)) {
      return {
        remainingArguments: args.arguments,
        deferred: true,
        resolve: Effect.andThen(
          Deferred.succeed(resume, undefined),
          Effect.map(Fiber.join(fiber), ([, value]) => value)
        )
      }
    }
    const [remainingArguments, value] = yield* Fiber.join(fiber)
    return { remainingArguments, deferred: false, resolve: Effect.succeed(value) }
  })

/**
 * Checks that inherited parent context flags do not reuse names declared by
 * child command flags.
 *
 * When `contextConfig` is supplied, it is used as the inherited flag set;
 * otherwise the parent's current context config is checked.
 */
export const checkForDuplicateFlags = <Name extends string, Input, ContextInput, E, R>(
  parent: Command<Name, Input, ContextInput, E, R>,
  subcommands: ReadonlyArray<Command.Any>,
  options?: {
    readonly contextConfig?: ConfigInternal | undefined
  } | undefined
): void => {
  const parentImpl = toImpl(parent)
  const parentOptionNames = new Set<string>()

  const extractNames = (flags: ReadonlyArray<Param.Any>): void => {
    for (const option of flags) {
      const singles = Param.extractSingleParams(option)
      for (const single of singles) {
        parentOptionNames.add(single.name)
      }
    }
  }

  extractNames((options?.contextConfig ?? parentImpl.contextConfig).flags)

  for (const subcommand of subcommands) {
    const subImpl = toImpl(subcommand as any)
    for (const option of subImpl.config.flags) {
      const singles = Param.extractSingleParams(option)
      for (const single of singles) {
        if (parentOptionNames.has(single.name)) {
          throw new CliError.DuplicateOption({
            option: single.name,
            parentCommand: parent.name,
            childCommand: subcommand.name
          })
        }
      }
    }
  }
}

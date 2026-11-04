/**
 * The `CommandSpec` module projects one command path of an Effect CLI command
 * tree into plain data for documentation tooling: reference pages, JSON
 * schemas, or any generator that needs more than `--help` prints.
 *
 * It is lossless where `Completions.fromCommand` is deliberately not. Hidden
 * flags and unlisted subcommands are included and marked, every effective flag
 * says where it comes from, primitive types are not collapsed, and defaults
 * and fallbacks are reported structurally. Nothing is executed: handlers,
 * prompts, `Config` lookups and effectful defaults are only described.
 *
 * @stability unstable
 * @since 4.1.3
 */
import type * as Context from "../Context.ts"
import * as Option from "../Option.ts"
import type { Command } from "./Command.ts"
import * as GlobalFlag from "./GlobalFlag.ts"
import { toImpl } from "./internal/command.ts"
import * as Param from "./Param.ts"
import * as Primitive from "./Primitive.ts"

/**
 * Everything known about one command path.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Spec {
  /** The resolved path, root name first. */
  readonly path: ReadonlyArray<string>
  readonly name: string
  readonly alias: string | undefined
  readonly description: string | undefined
  readonly shortDescription: string | undefined
  readonly unlisted: boolean
  /** Examples resolved for `path`, not for the bare command name. */
  readonly examples: ReadonlyArray<Command.Example>
  readonly annotations: Context.Context<never>
  /**
   * The flags this path accepts, in the order help lists them: local flags,
   * then flags inherited through `withSharedFlags` from the root down, then
   * global flags with built-ins ahead of declarations.
   */
  readonly flags: ReadonlyArray<Flag>
  readonly arguments: ReadonlyArray<Argument>
  /** Direct subcommands, including unlisted ones. Aliases are data, not extra entries. */
  readonly subcommands: ReadonlyArray<Subcommand>
}

/**
 * The input surface of one flag as the user types it. Transformations applied
 * to the parsed value (`map`, `withSchema`, `filter`) are transparent.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Flag {
  readonly name: string
  /** Raw alias names without dashes. */
  readonly aliases: ReadonlyArray<string>
  readonly description: string | undefined
  /** Still parsed, but absent from `--help` and completions. */
  readonly hidden: boolean
  readonly type: Type
  /** Generic type name, e.g. `"integer"`, as `Primitive.getTypeName` reports it. */
  readonly typeName: string
  /** Display name given with `withMetavar`, if any. */
  readonly metavar: string | undefined
  /**
   * Whether parsing fails when the flag is absent and no fallback supplies a
   * value. Boolean flags are never required. A `Config` or `Prompt` fallback
   * does not clear this; pair it with `fallbacks` to render "required unless
   * `$VAR` is set".
   */
  readonly required: boolean
  /** Fallbacks in the order the parser consults them, innermost combinator first. */
  readonly fallbacks: ReadonlyArray<Fallback>
  /** Repeat bounds for a variadic flag, `undefined` when the flag is not variadic. */
  readonly variadic: VariadicBounds | undefined
  /** Raw value used when the flag is given without a value, see `withOptionalValue`. */
  readonly optionalValue: string | undefined
  /** Effective long name that sets a boolean flag to `false`, `undefined` when none. */
  readonly negation: string | undefined
  readonly scope: Scope
  /** Annotations attached with `annotate`. */
  readonly annotations: Context.Context<never>
}

/**
 * The input surface of one positional argument.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Argument {
  readonly name: string
  readonly description: string | undefined
  readonly type: Type
  readonly typeName: string
  readonly metavar: string | undefined
  /** Whether parsing fails when the argument is absent and no fallback supplies a value. */
  readonly required: boolean
  readonly fallbacks: ReadonlyArray<Fallback>
  readonly variadic: VariadicBounds | undefined
  readonly annotations: Context.Context<never>
}

/**
 * A direct subcommand of the resolved command.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Subcommand {
  readonly name: string
  readonly alias: string | undefined
  readonly group: string | undefined
  /** Still parsed, but absent from `--help` and completions. */
  readonly unlisted: boolean
  readonly shortDescription: string | undefined
  readonly description: string | undefined
}

/**
 * Where an effective flag is declared.
 *
 * - `Local`: declared on the resolved command itself.
 * - `Inherited`: declared with `withSharedFlags` on the ancestor at `declaredBy`.
 * - `Global`: a global flag; `declaredBy` is the path of the command that
 *   declared it with `withGlobalFlags`, or `undefined` for a built-in.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Scope =
  | { readonly _tag: "Local" }
  | { readonly _tag: "Inherited"; readonly declaredBy: ReadonlyArray<string> }
  | {
    readonly _tag: "Global"
    readonly declaredBy: ReadonlyArray<string> | undefined
    readonly kind: "Action" | "Setting"
  }

/**
 * Repeat bounds of a variadic parameter. `undefined` means unbounded on that side.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface VariadicBounds {
  readonly min: number | undefined
  readonly max: number | undefined
}

/**
 * How a parameter obtains a value when it is absent, described without being
 * evaluated. See `Param.Fallback`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Fallback = Param.Fallback

/**
 * The primitive type a parameter parses, one variant per `Primitive`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Type =
  | { readonly _tag: "Boolean" }
  | { readonly _tag: "String" }
  | { readonly _tag: "Int" }
  | { readonly _tag: "Finite" }
  | { readonly _tag: "Date" }
  | { readonly _tag: "Choice"; readonly values: ReadonlyArray<string> }
  | { readonly _tag: "Path"; readonly pathType: Primitive.PathType }
  | { readonly _tag: "Redacted" }
  | { readonly _tag: "FileText" }
  | { readonly _tag: "FileParse" }
  | { readonly _tag: "FileSchema" }
  | { readonly _tag: "KeyValuePair" }
  | { readonly _tag: "Never" }

/**
 * Options for {@link resolve}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ResolveOptions {
  /**
   * Built-in global flags to report. Defaults to `GlobalFlag.BuiltIns`; pass
   * the value configured in `CliConfig` when it differs.
   */
  readonly builtIns?: ReadonlyArray<GlobalFlag.GlobalFlag<any>> | undefined
}

/**
 * Projects one command path of a command tree into a {@link Spec}.
 *
 * **When to use**
 *
 * Use when generating reference documentation or machine-readable schemas
 * for a CLI from its `Command` definition, in a build step, without running
 * the CLI.
 *
 * **Details**
 *
 * `path` names the commands from the root down, root name first, exactly as
 * `HelpDoc.commandPath` does. Only canonical names match: a subcommand alias
 * in the path, an unknown segment, a different root name or an empty path all
 * yield `Option.none()` rather than the deepest matching ancestor.
 *
 * The call is pure and synchronous. Handlers, prompts, `Config` lookups and
 * effectful defaults are reported as {@link Fallback} values and never run.
 *
 * **Example** (Listing the required flags of a subcommand)
 *
 * ```ts import.meta.vitest
 * import { Option } from "effect"
 * import { Command, CommandSpec, Flag } from "effect/cli"
 *
 * const push = Command.make("push", {
 *   dbUrl: Flag.String("db-url"),
 *   dryRun: Flag.Boolean("dry-run")
 * })
 * const cli = Command.make("app").pipe(
 *   Command.withSharedFlags({ profile: Flag.String("profile").pipe(Flag.optional) }),
 *   Command.withSubcommands([push])
 * )
 *
 * const spec = Option.getOrThrow(CommandSpec.resolve(cli, ["app", "push"], { builtIns: [] }))
 *
 * const surface = spec.flags.map((flag) => [flag.name, flag.scope._tag, flag.required])
 * surface // => [["db-url", "Local", true], ["dry-run", "Local", false], ["profile", "Inherited", false]]
 * ```
 *
 * @see {@link Spec} for the returned shape
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const resolve = (
  command: Command.Any,
  path: ReadonlyArray<string>,
  options?: ResolveOptions | undefined
): Option.Option<Spec> => {
  const lineage = resolveLineage(command, path)
  if (lineage === undefined) return Option.none()

  const current = lineage[lineage.length - 1]
  const impl = toImpl(current)
  const builtIns = options?.builtIns ?? GlobalFlag.BuiltIns

  const flags: Array<Flag> = []
  const seen = new Set<string>()
  const addFlags = (params: ReadonlyArray<Param.AnyFlag>, scope: Scope): void => {
    for (const param of params) {
      const metadata = Param.getParamMetadata(param)
      for (const single of Param.extractSingleParams(param)) {
        if (single.kind !== "flag") continue
        // Match help: a name already supplied by a nearer scope wins.
        if (scope._tag !== "Local" && seen.has(single.name)) continue
        seen.add(single.name)
        flags.push(toFlag(single, metadata, scope))
      }
    }
  }

  addFlags(impl.config.flags, { _tag: "Local" })
  for (let index = 0; index < lineage.length - 1; index++) {
    addFlags(toImpl(lineage[index]).contextConfig.flags, {
      _tag: "Inherited",
      declaredBy: path.slice(0, index + 1)
    })
  }

  const seenGlobals = new Set<GlobalFlag.GlobalFlag<any>>()
  const addGlobals = (
    globals: ReadonlyArray<GlobalFlag.GlobalFlag<any>>,
    declaredBy: ReadonlyArray<string> | undefined
  ): void => {
    for (const global of globals) {
      if (seenGlobals.has(global)) continue
      seenGlobals.add(global)
      addFlags([global.flag], { _tag: "Global", declaredBy, kind: global._tag })
    }
  }
  addGlobals(builtIns, undefined)
  for (let index = 0; index < lineage.length; index++) {
    addGlobals(toImpl(lineage[index]).globalFlags, path.slice(0, index + 1))
  }

  const args: Array<Argument> = []
  for (const param of impl.config.arguments) {
    const metadata = Param.getParamMetadata(param)
    for (const single of Param.extractSingleParams(param)) {
      if (single.kind !== "argument") continue
      args.push({
        name: single.name,
        description: Option.getOrUndefined(single.description),
        type: toType(single.primitiveType),
        typeName: Primitive.getTypeName(single.primitiveType),
        metavar: single.typeName,
        required: metadata.isRequired,
        fallbacks: metadata.fallbacks,
        variadic: toVariadic(metadata),
        annotations: single.annotations
      })
    }
  }

  const subcommands: Array<Subcommand> = []
  for (const group of current.subcommands) {
    for (const subcommand of group.commands) {
      subcommands.push({
        name: subcommand.name,
        alias: subcommand.alias,
        group: group.group,
        unlisted: subcommand.unlisted,
        shortDescription: subcommand.shortDescription,
        description: subcommand.description
      })
    }
  }

  return Option.some({
    path,
    name: current.name,
    alias: current.alias,
    description: current.description,
    shortDescription: current.shortDescription,
    unlisted: current.unlisted,
    examples: impl.resolveExamples(path),
    annotations: impl.annotations,
    flags,
    arguments: args,
    subcommands
  })
}

/**
 * Walks `path` from the root, matching canonical names only. Returns the
 * commands from root to leaf, or `undefined` when any segment fails to match.
 */
const resolveLineage = (
  root: Command.Any,
  path: ReadonlyArray<string>
): ReadonlyArray<Command.Any> | undefined => {
  if (path.length === 0 || path[0] !== root.name) return undefined
  const lineage: Array<Command.Any> = [root]
  for (let index = 1; index < path.length; index++) {
    const parent = lineage[lineage.length - 1]
    let next: Command.Any | undefined = undefined
    for (const group of parent.subcommands) {
      next = group.commands.find((subcommand) => subcommand.name === path[index])
      if (next !== undefined) break
    }
    if (next === undefined) return undefined
    lineage.push(next)
  }
  return lineage
}

const toFlag = (
  single: Param.Single<Param.ParamKind, unknown>,
  metadata: Param.ParamMetadata,
  scope: Scope
): Flag => {
  const isBoolean = Primitive.isBoolean(single.primitiveType)
  return {
    name: single.name,
    aliases: single.aliases,
    description: Option.getOrUndefined(single.description),
    hidden: single.hidden,
    type: toType(single.primitiveType),
    typeName: Primitive.getTypeName(single.primitiveType),
    metavar: single.typeName,
    required: !isBoolean && metadata.isRequired,
    fallbacks: metadata.fallbacks,
    variadic: toVariadic(metadata),
    optionalValue: single.optionalValue,
    negation: isBoolean && single.negation !== false ? single.negation ?? `no-${single.name}` : undefined,
    scope,
    annotations: single.annotations
  }
}

const toVariadic = (metadata: Param.ParamMetadata): VariadicBounds | undefined =>
  metadata.isVariadic
    ? {
      min: Option.getOrUndefined(metadata.variadicMin),
      max: Option.getOrUndefined(metadata.variadicMax)
    }
    : undefined

const toType = (primitive: Primitive.Primitive<unknown>): Type => {
  switch (primitive._tag) {
    case "Choice":
      return { _tag: "Choice", values: Primitive.getChoiceKeys(primitive) ?? [] }
    case "Path":
      return { _tag: "Path", pathType: Primitive.getPathType(primitive) ?? "either" }
    case "Boolean":
    case "Int":
    case "Finite":
    case "Date":
    case "Redacted":
    case "FileText":
    case "FileParse":
    case "FileSchema":
    case "KeyValuePair":
    case "Never":
      return { _tag: primitive._tag }
    default:
      return { _tag: "String" }
  }
}

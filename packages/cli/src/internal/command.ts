import type * as Args from "@effect/cli/Args"
import type * as CliConfig from "@effect/cli/CliConfig"
import type * as Command from "@effect/cli/Command"
import type * as CommandDirective from "@effect/cli/CommandDirective"
import type * as HelpDoc from "@effect/cli/HelpDoc"
import * as _args from "@effect/cli/internal/args"
import * as builtInOption from "@effect/cli/internal/builtInOption"
import * as cliConfig from "@effect/cli/internal/cliConfig"
import * as commandDirective from "@effect/cli/internal/commandDirective"
import * as doc from "@effect/cli/internal/helpDoc"
import * as span from "@effect/cli/internal/helpDoc/span"
import * as options from "@effect/cli/internal/options"
import * as _usage from "@effect/cli/internal/usage"
import * as validationError from "@effect/cli/internal/validationError"
import type * as Options from "@effect/cli/Options"
import type * as Usage from "@effect/cli/Usage"
import type * as ValidationError from "@effect/cli/ValidationError"
import * as Chunk from "@effect/data/Chunk"
import * as Either from "@effect/data/Either"
import { dual, pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as HashSet from "@effect/data/HashSet"
import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"

const CommandSymbolKey = "@effect/cli/Command"

/** @internal */
export const CommandTypeId: Command.CommandTypeId = Symbol.for(
  CommandSymbolKey
) as Command.CommandTypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Command.Command<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [CommandTypeId]: {
    _ArgsType: (_: never) => _,
    _OptionsType: (_: never) => _
  }
}

/** @internal */
export type Instruction =
  | Single
  | Map
  | OrElse
  | Subcommands

/** @internal */
export interface Single extends
  Op<"Single", {
    readonly name: string
    readonly help: HelpDoc.HelpDoc
    readonly options: Options.Options<unknown>
    readonly args: Args.Args<unknown>
  }>
{}

/** @internal */
export interface Map extends
  Op<"Map", {
    readonly command: Instruction
    readonly f: (a: unknown) => Either.Either<ValidationError.ValidationError, unknown>
  }>
{}

/** @internal */
export interface OrElse extends
  Op<"OrElse", {
    readonly left: Instruction
    readonly right: Instruction
  }>
{}

/** @internal */
export interface Subcommands extends
  Op<"Subcommands", {
    readonly parent: Instruction
    readonly child: Instruction
  }>
{}

const getSubcommandsMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => HashMap.HashMap<string, Command.Command<any>>
} = {
  Single: (self) => HashMap.make([self.name, self]),
  Map: (self) => getSubcommandsMap[self.command._tag](self.command as any),
  OrElse: (self) =>
    HashMap.union(
      getSubcommandsMap[self.left._tag](self.left as any),
      getSubcommandsMap[self.right._tag](self.right as any)
    ),
  Subcommands: (self) => getSubcommandsMap[self.child._tag](self.child as any)
}

/** @internal */
export const getSubcommands = <A>(self: Command.Command<A>): HashMap.HashMap<string, Command.Command<unknown>> =>
  getSubcommandsMap[(self as Instruction)._tag](self as any)

const helpDocMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => HelpDoc.HelpDoc
} = {
  Single: (self) => {
    const header = doc.isEmpty(self.help)
      ? doc.empty
      : doc.sequence(doc.h1("DESCRIPTION"), self.help)
    const argsHelp = _args.helpDoc(self.args)
    const argsSection = doc.isEmpty(argsHelp)
      ? doc.empty
      : doc.sequence(doc.h1("ARGUMENTS"), argsHelp)
    const optionsHelp = options.helpDoc(self.options)
    const optionsSection = doc.isEmpty(optionsHelp)
      ? doc.empty
      : doc.sequence(doc.h1("OPTIONS"), optionsHelp)
    return doc.sequence(header, doc.sequence(argsSection, optionsSection))
  },
  Map: (self) => helpDocMap[self.command._tag](self.command as any),
  OrElse: (self) =>
    doc.sequence(
      helpDocMap[self.left._tag](self.left as any),
      helpDocMap[self.right._tag](self.right as any)
    ),
  Subcommands: (self) =>
    doc.sequence(
      helpDocMap[self.parent._tag](self.parent as any),
      doc.sequence(
        doc.h1("COMMANDS"),
        subcommandsDescription(self.child, getSubcommandMaxSynopsisLength(self.child))
      )
    )
}

/** @internal */
export const helpDoc = <A>(self: Command.Command<A>): HelpDoc.HelpDoc =>
  helpDocMap[(self as Instruction)._tag](self as any)

const defaultConstructorConfig = {
  options: options.none,
  args: _args.none
}

/** @internal */
export const make = <Name extends string, OptionsType = void, ArgsType = void>(
  name: Name,
  config: Command.Command.ConstructorConfig<OptionsType, ArgsType> = defaultConstructorConfig as any
): Command.Command<Command.Command.Parsed<Name, OptionsType, ArgsType>> => {
  const { args, options } = { ...defaultConstructorConfig, ...config }
  return single(name, doc.empty, options, args) as any
}

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Command.Command<A>) => Command.Command<B>,
  <A, B>(self: Command.Command<A>, f: (a: A) => B) => Command.Command<B>
>(2, (self, f) => mapOrFail(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => (self: Command.Command<A>) => Command.Command<B>,
  <A, B>(
    self: Command.Command<A>,
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => Command.Command<B>
>(2, (self, f) => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.command = self
  op.f = f
  return op
})

const namesMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => HashSet.HashSet<string>
} = {
  Single: (self) => HashSet.make(self.name),
  Map: (self) => namesMap[self.command._tag](self.command as any),
  OrElse: (self) =>
    HashSet.union(
      namesMap[self.left._tag](self.left as any),
      namesMap[self.right._tag](self.right as any)
    ),
  Subcommands: (self) => namesMap[self.parent._tag](self.parent as any)
}

/** @internal */
export const names = <A>(self: Command.Command<A>): HashSet.HashSet<string> =>
  namesMap[(self as Instruction)._tag](self as any)

/** @internal */
export const orElse = dual<
  <B>(that: Command.Command<B>) => <A>(self: Command.Command<A>) => Command.Command<A | B>,
  <A, B>(self: Command.Command<A>, that: Command.Command<B>) => Command.Command<A | B>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "OrElse"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const orElseEither = dual<
  <B>(that: Command.Command<B>) => <A>(self: Command.Command<A>) => Command.Command<Either.Either<A, B>>,
  <A, B>(self: Command.Command<A>, that: Command.Command<B>) => Command.Command<Either.Either<A, B>>
>(2, (self, that) => orElse(map(self, Either.left), map(that, Either.right)))

const parseMap: {
  [K in Instruction["_tag"]]: (
    self: Extract<Instruction, { _tag: K }>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<never, ValidationError.ValidationError, CommandDirective.CommandDirective<any>>
} = {
  Single: (self, args, config) => {
    const parseBuiltInArgs =
      args[0] !== undefined && cliConfig.normalizeCase(config, self.name) === cliConfig.normalizeCase(config, args[0])
        ? pipe(
          builtInOption.builtInOptions(self, usage(self), helpDoc(self)),
          options.validate(args, config),
          Effect.mapBoth({
            onFailure: (error) => error.error,
            onSuccess: (tuple) => tuple[1]
          }),
          Effect.some,
          Effect.map(commandDirective.builtIn)
        )
        : Effect.fail(Option.none())
    const parseUserDefinedArgs = pipe(
      ReadonlyArray.isNonEmptyReadonlyArray(args)
        ? pipe(
          Effect.succeed(args.slice(1)),
          Effect.when(() => cliConfig.normalizeCase(config, args[0]) === cliConfig.normalizeCase(config, self.name)),
          Effect.some,
          Effect.orElseFail(() =>
            validationError.commandMismatch(doc.p(span.error(`Missing command name: '${self.name}'`)))
          )
        )
        : Effect.fail(validationError.commandMismatch(doc.p(span.error(`Missing command name: '${self.name}'`)))),
      Effect.flatMap((commandOptionsAndArgs) =>
        pipe(
          options.validate(self.options, unCluster(commandOptionsAndArgs), config),
          Effect.flatMap(([commandArgs, options]) =>
            pipe(
              _args.validate(self.args, commandArgs),
              Effect.map(([argsLeftover, args]) =>
                commandDirective.userDefined(argsLeftover, {
                  name: self.name,
                  options,
                  args
                })
              )
            )
          )
        )
      )
    )
    return Effect.orElse(parseBuiltInArgs, () => parseUserDefinedArgs)
  },
  Map: (self, args, config) =>
    Effect.flatMap(
      parseMap[self.command._tag](self.command as any, args, config),
      (directive) => {
        if (commandDirective.isUserDefined(directive)) {
          const either = self.f(directive.value)
          return Either.isLeft(either)
            ? Effect.fail(either.left)
            : Effect.succeed(commandDirective.userDefined(directive.leftover, either.right))
        }
        return Effect.succeed(directive)
      }
    ),
  OrElse: (self, args, config) =>
    Effect.catchSome(
      parseMap[self.left._tag](self.left as any, args, config),
      (error) =>
        validationError.isCommandMismatch(error)
          ? Option.some(parseMap[self.right._tag](self.right as any, args, config))
          : Option.none()
    ),
  Subcommands: (self, args, config) => {
    const helpDirectiveForChild = Effect.flatMap(
      parseMap[self.child._tag](
        self.child as any,
        ReadonlyArray.isEmptyReadonlyArray(args) ? [] : args.slice(1),
        config
      ),
      (directive) => {
        if (commandDirective.isBuiltIn(directive) && builtInOption.isShowHelp(directive.option)) {
          const availableNames = Array.from(names(self))
          const parentName = availableNames.length === 0 ? "" : availableNames[0]
          return Effect.succeed(commandDirective.builtIn(builtInOption.showHelp(
            _usage.concat(
              _usage.named(Chunk.of(parentName), Option.none()),
              directive.option.usage
            ),
            directive.option.helpDoc
          )))
        }
        return Effect.fail(validationError.invalidArgument(doc.empty))
      }
    )
    const helpDirectiveForParent = Effect.succeed(commandDirective.builtIn(builtInOption.showHelp(
      usage(self),
      helpDoc(self)
    )))
    const wizardDirectiveForChild = Effect.flatMap(
      parseMap[self.child._tag](
        self.child as any,
        ReadonlyArray.isEmptyReadonlyArray(args) ? [] : args.slice(1),
        config
      ),
      (directive) =>
        commandDirective.isBuiltIn(directive) && builtInOption.isWizard(directive.option)
          ? Effect.succeed(directive)
          : Effect.fail(validationError.invalidArgument(doc.empty))
    )
    const wizardDirectiveForParent = Effect.succeed(commandDirective.builtIn(builtInOption.wizard(self)))
    return pipe(
      parseMap[self.parent._tag](self.parent as any, args, config),
      Effect.flatMap((directive) => {
        if (commandDirective.isBuiltIn(directive)) {
          if (builtInOption.isShowHelp(directive.option)) {
            return Effect.orElse(helpDirectiveForChild, () => helpDirectiveForParent)
          }
          if (builtInOption.isWizard(directive.option)) {
            return Effect.orElse(wizardDirectiveForChild, () => wizardDirectiveForParent)
          }
          return Effect.succeed(directive)
        }
        if (ReadonlyArray.isNonEmptyReadonlyArray(directive.leftover)) {
          return Effect.map(
            parseMap[self.child._tag](self.child as any, directive.leftover, config),
            commandDirective.map((subcommand) => ({
              ...directive.value,
              subcommand: Option.some(subcommand)
            }))
          )
        }
        return Effect.succeed(commandDirective.map(directive, () => ({
          ...directive.value,
          subcommand: Option.none()
        })))
      }),
      Effect.catchSome(() =>
        ReadonlyArray.isEmptyReadonlyArray(args)
          ? Option.some(helpDirectiveForParent)
          : Option.none()
      )
    )
  }
}

/** @internal */
export const parse = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(
    self: Command.Command<A>
  ) => Effect.Effect<never, ValidationError.ValidationError, CommandDirective.CommandDirective<A>>,
  <A>(
    self: Command.Command<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<never, ValidationError.ValidationError, CommandDirective.CommandDirective<A>>
>(3, (self, args, config) => parseMap[(self as Instruction)._tag](self as any, args, config))

/** @internal */
export const subcommands = dual<
  <Subcommands extends NonEmptyReadonlyArray<Command.Command<any>>>(
    subcommands: [...Subcommands]
  ) => <A>(
    self: Command.Command<A>
  ) => Command.Command<
    Command.Command.ComputeParsedType<
      A & Readonly<{ subcommand: Option.Option<Command.Command.Subcommands<Subcommands>> }>
    >
  >,
  <A, Subcommands extends NonEmptyReadonlyArray<Command.Command<any>>>(
    self: Command.Command<A>,
    subcommands: [...Subcommands]
  ) => Command.Command<
    Command.Command.ComputeParsedType<
      A & Readonly<{ subcommand: Option.Option<Command.Command.Subcommands<Subcommands>> }>
    >
  >
>(2, (self, subcommands) => {
  const head = subcommands[0]
  const tail = subcommands.slice(1)
  if (tail.length === 0) {
    return makeSubcommand(self, head)
  }
  return makeSubcommand(self, tail.slice(1).reduce(orElse, orElse(head, tail[0])))
})

const usageMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => Usage.Usage
} = {
  Single: (self) =>
    _usage.concat(
      _usage.named(Chunk.of(self.name), Option.none()),
      _usage.concat(
        options.usage(self.options),
        _args.usage(self.args)
      )
    ),
  Map: (self) => usageMap[self.command._tag](self.command as any),
  OrElse: () => _usage.mixed,
  Subcommands: (self) =>
    _usage.concat(
      usageMap[self.parent._tag](self.parent as any),
      usageMap[self.child._tag](self.child as any)
    )
}

/** @internal */
export const usage = <A>(self: Command.Command<A>): Usage.Usage => usageMap[(self as Instruction)._tag](self as any)

const withHelpMap: {
  [K in Instruction["_tag"]]: (
    self: Extract<Instruction, { _tag: K }>,
    help: string | HelpDoc.HelpDoc
  ) => Command.Command<any>
} = {
  Single: (self, help) => single(self.name, typeof help === "string" ? doc.p(help) : help, self.options, self.args),
  Map: (self, help) => map(withHelpMap[self.command._tag](self.command as any, help), self.f),
  OrElse: (self, help) =>
    orElse(
      withHelpMap[self.left._tag](self.left as any, help),
      withHelpMap[self.right._tag](self.right as any, help)
    ),
  Subcommands: (self, help) => makeSubcommand(withHelpMap[self.parent._tag](self.parent as any, help), self.child)
}

/** @internal */
export const withHelp = dual<
  (help: string | HelpDoc.HelpDoc) => <A>(self: Command.Command<A>) => Command.Command<A>,
  <A>(self: Command.Command<A>, help: string | HelpDoc.HelpDoc) => Command.Command<A>
>(2, (self, help) => withHelpMap[(self as Instruction)._tag](self as any, help))

const single = <Name extends string, OptionsType, ArgsType>(
  name: Name,
  help: HelpDoc.HelpDoc,
  options: Options.Options<OptionsType>,
  args: Args.Args<ArgsType>
): Command.Command<Command.Command.Parsed<Name, OptionsType, ArgsType>> => {
  const op = Object.create(proto)
  op._tag = "Single"
  op.name = name
  op.help = help
  op.options = options
  op.args = args
  return op
}

const makeSubcommand = <A, B>(parent: Command.Command<A>, child: Command.Command<B>): Instruction => {
  const op = Object.create(proto)
  op._tag = "Subcommands"
  op.parent = parent
  op.child = child
  return op
}

const clusteredOptionRegex = /^-{1}([^-]{2,}|$)/

const unCluster = (args: ReadonlyArray<string>): ReadonlyArray<string> =>
  ReadonlyArray.flatMap(args, (arg) =>
    clusteredOptionRegex.test(arg.trim())
      ? arg.substring(1).split("").map((c) => `-${c}`)
      : ReadonlyArray.of(arg))

const subcommandMaxSynopsisLengthMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => number
} = {
  Single: (self) => span.size(doc.getSpan(_usage.helpDoc(usage(self)))),
  Map: (self) => subcommandMaxSynopsisLengthMap[self.command._tag](self.command as any),
  OrElse: (self) =>
    Math.max(
      subcommandMaxSynopsisLengthMap[self.left._tag](self.left as any),
      subcommandMaxSynopsisLengthMap[self.right._tag](self.right as any)
    ),
  Subcommands: (self) => subcommandMaxSynopsisLengthMap[self.parent._tag](self.parent as any)
}

const getSubcommandMaxSynopsisLength = (self: Instruction): number =>
  subcommandMaxSynopsisLengthMap[self._tag](self as any)

const subcommandDescriptionMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>, maxSynopsisLength: number) => HelpDoc.HelpDoc
} = {
  Single: (self, maxSynopsisLength) => {
    const usageSpan = doc.getSpan(_usage.helpDoc(usage(self)))
    return doc.p(span.spans([
      usageSpan,
      span.text(" ".repeat(maxSynopsisLength - span.size(usageSpan) + 2)),
      doc.getSpan(self.help)
    ]))
  },
  Map: (self, maxSynopsisLength) => subcommandDescriptionMap[self.command._tag](self.command as any, maxSynopsisLength),
  OrElse: (self, maxSynopsisLength) =>
    doc.enumeration([
      subcommandDescriptionMap[self.left._tag](self.left as any, maxSynopsisLength),
      subcommandDescriptionMap[self.right._tag](self.right as any, maxSynopsisLength)
    ]),
  Subcommands: (self, maxSynopsisLength) =>
    subcommandDescriptionMap[self.parent._tag](self.parent as any, maxSynopsisLength)
}

const subcommandsDescription = (self: Instruction, maxSynopsisLength: number): HelpDoc.HelpDoc =>
  subcommandDescriptionMap[self._tag](self as any, maxSynopsisLength)

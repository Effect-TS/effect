import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import type * as HashMap from "effect/HashMap"
import type * as HashSet from "effect/HashSet"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import type * as Types from "effect/Types"
import type * as Args from "../Args.js"
import type * as CliApp from "../CliApp.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../Command.js"
import type * as Descriptor from "../CommandDescriptor.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Options from "../Options.js"
import type * as Prompt from "../Prompt.js"
import type * as Usage from "../Usage.js"
import * as ValidationError from "../ValidationError.js"
import * as InternalArgs from "./args.js"
import * as InternalCliApp from "./cliApp.js"
import * as InternalDescriptor from "./commandDescriptor.js"
import * as InternalOptions from "./options.js"

const CommandSymbolKey = "@effect/cli/Command"

/** @internal */
export const TypeId: Command.TypeId = Symbol.for(
  CommandSymbolKey
) as Command.TypeId

const parseConfig = (config: Command.Command.Config): Command.Command.ParsedConfig => {
  const args: Array<Args.Args<any>> = []
  let argsIndex = 0
  const options: Array<Options.Options<any>> = []
  let optionsIndex = 0

  function parse(config: Command.Command.Config) {
    const tree: Command.Command.ParsedConfigTree = {}
    for (const key in config) {
      tree[key] = parseValue(config[key])
    }
    return tree
  }

  function parseValue(
    value:
      | Args.Args<any>
      | Options.Options<any>
      | ReadonlyArray<Args.Args<any> | Options.Options<any> | Command.Command.Config>
      | Command.Command.Config
  ): Command.Command.ParsedConfigNode {
    if (Arr.isArray(value)) {
      return {
        _tag: "Array",
        children: Arr.map(value as Array<any>, parseValue)
      }
    } else if (InternalArgs.isArgs(value)) {
      args.push(value)
      return {
        _tag: "Args",
        index: argsIndex++
      }
    } else if (InternalOptions.isOptions(value)) {
      options.push(value)
      return {
        _tag: "Options",
        index: optionsIndex++
      }
    } else {
      return {
        _tag: "ParsedConfig",
        tree: parse(value as any)
      }
    }
  }

  return {
    args,
    options,
    tree: parse(config)
  }
}

const reconstructConfigTree = (
  tree: Command.Command.ParsedConfigTree,
  args: ReadonlyArray<any>,
  options: ReadonlyArray<any>
): Record<string, any> => {
  const output: Record<string, any> = {}

  for (const key in tree) {
    output[key] = nodeValue(tree[key])
  }

  return output

  function nodeValue(node: Command.Command.ParsedConfigNode): any {
    if (node._tag === "Args") {
      return args[node.index]
    } else if (node._tag === "Options") {
      return options[node.index]
    } else if (node._tag === "Array") {
      return Arr.map(node.children, nodeValue)
    } else {
      return reconstructConfigTree(node.tree, args, options)
    }
  }
}

const Prototype = {
  ...Effectable.CommitPrototype,
  [TypeId]: TypeId,
  commit(this: Command.Command<string, any, any, any>) {
    return this.tag
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const registeredDescriptors = globalValue(
  "@effect/cli/Command/registeredDescriptors",
  () => new WeakMap<Context.Tag<any, any>, Descriptor.Command<any>>()
)

const getDescriptor = <Name extends string, R, E, A>(self: Command.Command<Name, R, E, A>) =>
  registeredDescriptors.get(self.tag) ?? self.descriptor

const makeProto = <Name extends string, R, E, A>(
  descriptor: Descriptor.Command<A>,
  handler: (_: A) => Effect.Effect<void, E, R>,
  tag: Context.Tag<any, any>,
  transform: Command.Command.Transform<R, E, A> = identity
): Command.Command<Name, R, E, A> => {
  const self = Object.create(Prototype)
  self.descriptor = descriptor
  self.handler = handler
  self.transform = transform
  self.tag = tag
  return self
}

const makeDerive = <Name extends string, R, E, A>(
  self: Command.Command<Name, any, any, A>,
  options: {
    readonly descriptor?: Descriptor.Command<A>
    readonly handler?: (_: A) => Effect.Effect<void, E, R>
    readonly transform?: Command.Command.Transform<R, E, A>
  }
): Command.Command<Name, R, E, A> => {
  const command = Object.create(Prototype)
  command.descriptor = options.descriptor ?? self.descriptor
  command.handler = options.handler ?? self.handler
  command.transform = options.transform
    ? ((effect: Effect.Effect<void, E, R>, opts: A) => options.transform!(self.transform(effect, opts), opts))
    : self.transform
  command.tag = self.tag
  return command
}

/** @internal */
export const fromDescriptor = dual<
  {
    (): <A extends { readonly name: string }>(
      command: Descriptor.Command<A>
    ) => Command.Command<A["name"], never, never, A>
    <A extends { readonly name: string }, R, E>(
      handler: (_: A) => Effect.Effect<void, E, R>
    ): (command: Descriptor.Command<A>) => Command.Command<A["name"], R, E, A>
  },
  {
    <A extends { readonly name: string }>(
      descriptor: Descriptor.Command<A>
    ): Command.Command<A["name"], never, never, A>
    <A extends { readonly name: string }, R, E>(
      descriptor: Descriptor.Command<A>,
      handler: (_: A) => Effect.Effect<void, E, R>
    ): Command.Command<A["name"], R, E, A>
  }
>(
  (args) => InternalDescriptor.isCommand(args[0]),
  (descriptor: Descriptor.Command<any>, handler?: (_: any) => Effect.Effect<any, any, any>) => {
    const self: Command.Command<any, any, any, any> = makeProto(
      descriptor,
      handler ??
        ((_) => Effect.failSync(() => ValidationError.helpRequested(getDescriptor(self)))),
      Context.GenericTag(
        `@effect/cli/Command/(${Arr.fromIterable(InternalDescriptor.getNames(descriptor)).join("|")})`
      )
    )
    return self as any
  }
)

const makeDescriptor = <const Config extends Command.Command.Config>(
  name: string,
  config: Config
): Descriptor.Command<Types.Simplify<Command.Command.ParseConfig<Config>>> => {
  const { args, options, tree } = parseConfig(config)
  return InternalDescriptor.map(
    InternalDescriptor.make(name, InternalOptions.all(options), InternalArgs.all(args)),
    ({ args, options }) => reconstructConfigTree(tree, args, options)
  ) as any
}

/** @internal */
export const make: {
  <Name extends string>(name: Name): Command.Command<
    Name,
    never,
    never,
    {}
  >

  <Name extends string, const Config extends Command.Command.Config>(
    name: Name,
    config: Config
  ): Command.Command<
    Name,
    never,
    never,
    Types.Simplify<Command.Command.ParseConfig<Config>>
  >

  <Name extends string, const Config extends Command.Command.Config, R, E>(
    name: Name,
    config: Config,
    handler: (_: Types.Simplify<Command.Command.ParseConfig<Config>>) => Effect.Effect<void, E, R>
  ): Command.Command<
    Name,
    R,
    E,
    Types.Simplify<Command.Command.ParseConfig<Config>>
  >
} = (
  name: string,
  config: Command.Command.Config = {},
  handler?: (_: any) => Effect.Effect<any, any, any>
) => fromDescriptor(makeDescriptor(name, config) as any, handler as any) as any

/** @internal */
export const getHelp = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>,
  config: CliConfig.CliConfig
): HelpDoc.HelpDoc => InternalDescriptor.getHelp(self.descriptor, config)

/** @internal */
export const getNames = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>
): HashSet.HashSet<string> => InternalDescriptor.getNames(self.descriptor)

/** @internal */
export const getBashCompletions = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>,
  programName: string
): Effect.Effect<Array<string>> => InternalDescriptor.getBashCompletions(self.descriptor, programName)

/** @internal */
export const getFishCompletions = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>,
  programName: string
): Effect.Effect<Array<string>> => InternalDescriptor.getFishCompletions(self.descriptor, programName)

/** @internal */
export const getZshCompletions = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>,
  programName: string
): Effect.Effect<Array<string>> => InternalDescriptor.getZshCompletions(self.descriptor, programName)

/** @internal */
export const getSubcommands = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>
): HashMap.HashMap<string, Descriptor.Command<unknown>> => InternalDescriptor.getSubcommands(self.descriptor)

/** @internal */
export const getUsage = <Name extends string, R, E, A>(
  self: Command.Command<Name, R, E, A>
): Usage.Usage => InternalDescriptor.getUsage(self.descriptor)

const mapDescriptor = dual<
  <A>(f: (_: Descriptor.Command<A>) => Descriptor.Command<A>) => <Name extends string, R, E>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, R, E, A>,
  <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>,
    f: (_: Descriptor.Command<A>) => Descriptor.Command<A>
  ) => Command.Command<Name, R, E, A>
>(2, (self, f) => makeDerive(self, { descriptor: f(self.descriptor) }))

/** @internal */
export const prompt = <Name extends string, A, R, E>(
  name: Name,
  prompt: Prompt.Prompt<A>,
  handler: (_: A) => Effect.Effect<void, E, R>
) =>
  makeProto(
    InternalDescriptor.map(
      InternalDescriptor.prompt(name, prompt),
      (_) => _.value
    ),
    handler,
    Context.GenericTag(`@effect/cli/Prompt/${name}`)
  )

/** @internal */
export const withHandler = dual<
  <A, R, E>(
    handler: (_: A) => Effect.Effect<void, E, R>
  ) => <Name extends string, XR, XE>(
    self: Command.Command<Name, XR, XE, A>
  ) => Command.Command<Name, R, E, A>,
  <Name extends string, XR, XE, A, R, E>(
    self: Command.Command<Name, XR, XE, A>,
    handler: (_: A) => Effect.Effect<void, E, R>
  ) => Command.Command<Name, R, E, A>
>(2, (self, handler) => makeDerive(self, { handler, transform: identity }))

/** @internal */
export const transformHandler = dual<
  <R, E, A, R2, E2>(
    f: (effect: Effect.Effect<void, E, R>, config: A) => Effect.Effect<void, E2, R2>
  ) => <Name extends string>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, R | R2, E | E2, A>,
  <Name extends string, R, E, A, R2, E2>(
    self: Command.Command<Name, R, E, A>,
    f: (effect: Effect.Effect<void, E, R>, config: A) => Effect.Effect<void, E2, R2>
  ) => Command.Command<Name, R | R2, E | E2, A>
>(2, (self, f) => makeDerive(self, { transform: f }))

/** @internal */
export const provide = dual<
  <A, LR, LE, LA>(
    layer: Layer.Layer<LA, LE, LR> | ((_: A) => Layer.Layer<LA, LE, LR>)
  ) => <Name extends string, R, E>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, Exclude<R, LA> | LR, E | LE, A>,
  <Name extends string, R, E, A, LR, LE, LA>(
    self: Command.Command<Name, R, E, A>,
    layer: Layer.Layer<LA, LE, LR> | ((_: A) => Layer.Layer<LA, LE, LR>)
  ) => Command.Command<Name, Exclude<R, LA> | LR, E | LE, A>
>(2, (self, layer) =>
  makeDerive(self, {
    transform: (effect, config) => Effect.provide(effect, typeof layer === "function" ? layer(config) : layer)
  }))

/** @internal */
export const provideEffect = dual<
  <I, S, A, R2, E2>(
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E2, R2> | ((_: A) => Effect.Effect<S, E2, R2>)
  ) => <Name extends string, R, E>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, Exclude<R, I> | R2, E | E2, A>,
  <Name extends string, R, E, A, I, S, R2, E2>(
    self: Command.Command<Name, R, E, A>,
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E2, R2> | ((_: A) => Effect.Effect<S, E2, R2>)
  ) => Command.Command<Name, Exclude<R, I> | R2, E | E2, A>
>(3, (self, tag, effect_) =>
  makeDerive(self, {
    transform: (self, config) => {
      const effect = typeof effect_ === "function" ? effect_(config) : effect_
      return Effect.provideServiceEffect(self, tag, effect)
    }
  }))

/** @internal */
export const provideEffectDiscard = dual<
  <A, R2, E2, _>(
    effect: Effect.Effect<_, E2, R2> | ((_: A) => Effect.Effect<_, E2, R2>)
  ) => <Name extends string, R, E>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, R | R2, E | E2, A>,
  <Name extends string, R, E, A, R2, E2, _>(
    self: Command.Command<Name, R, E, A>,
    effect: Effect.Effect<_, E2, R2> | ((_: A) => Effect.Effect<_, E2, R2>)
  ) => Command.Command<Name, R | R2, E | E2, A>
>(2, (self, effect_) =>
  makeDerive(self, {
    transform: (self, config) => {
      const effect = typeof effect_ === "function" ? effect_(config) : effect_
      return Effect.zipRight(effect, self)
    }
  }))

/** @internal */
export const provideSync = dual<
  <I, S, A>(
    tag: Context.Tag<I, S>,
    service: S | ((_: A) => S)
  ) => <Name extends string, R, E>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, Exclude<R, I>, E, A>,
  <Name extends string, R, E, A, I, S>(
    self: Command.Command<Name, R, E, A>,
    tag: Context.Tag<I, S>,
    service: S | ((_: A) => S)
  ) => Command.Command<Name, Exclude<R, I>, E, A>
>(3, (self, tag, f) =>
  makeDerive(self, {
    transform: (self, config) => {
      const service = typeof f === "function" ? (f as any)(config) : f
      return Effect.provideService(self, tag, service)
    }
  }))

/** @internal */
export const withDescription = dual<
  (
    help: string | HelpDoc.HelpDoc
  ) => <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>
  ) => Command.Command<Name, R, E, A>,
  <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>,
    help: string | HelpDoc.HelpDoc
  ) => Command.Command<Name, R, E, A>
>(2, (self, help) => mapDescriptor(self, InternalDescriptor.withDescription(help)))

/** @internal */
export const withSubcommands = dual<
  <Subcommand extends Arr.NonEmptyReadonlyArray<Command.Command<any, any, any, any>>>(
    subcommands: Subcommand
  ) => <Name extends string, R, E, A>(self: Command.Command<Name, R, E, A>) => Command.Command<
    Name,
    | R
    | Exclude<
      Effect.Effect.Context<ReturnType<Subcommand[number]["handler"]>>,
      Descriptor.Command<Name>
    >,
    E | Effect.Effect.Error<ReturnType<Subcommand[number]["handler"]>>,
    Descriptor.Command.ComputeParsedType<
      & A
      & Readonly<
        {
          subcommand: Option.Option<
            Descriptor.Command.GetParsedType<Subcommand[number]["descriptor"]>
          >
        }
      >
    >
  >,
  <
    Name extends string,
    R,
    E,
    A,
    Subcommand extends Arr.NonEmptyReadonlyArray<Command.Command<any, any, any, any>>
  >(
    self: Command.Command<Name, R, E, A>,
    subcommands: Subcommand
  ) => Command.Command<
    Name,
    | R
    | Exclude<
      Effect.Effect.Context<ReturnType<Subcommand[number]["handler"]>>,
      Descriptor.Command<Name>
    >,
    E | Effect.Effect.Error<ReturnType<Subcommand[number]["handler"]>>,
    Descriptor.Command.ComputeParsedType<
      & A
      & Readonly<
        {
          subcommand: Option.Option<
            Descriptor.Command.GetParsedType<Subcommand[number]["descriptor"]>
          >
        }
      >
    >
  >
>(2, (self, subcommands) => {
  const command = InternalDescriptor.withSubcommands(
    self.descriptor,
    Arr.map(subcommands, (_) => [_.tag, _.descriptor])
  )
  const subcommandMap = Arr.reduce(
    subcommands,
    new Map<Context.Tag<any, any>, Command.Command<any, any, any, any>>(),
    (handlers, subcommand) => {
      handlers.set(subcommand.tag, subcommand)
      registeredDescriptors.set(subcommand.tag, subcommand.descriptor)
      return handlers
    }
  )
  function handler(
    args: {
      readonly name: string
      readonly subcommand: Option.Option<readonly [id: Context.Tag<any, any>, value: unknown]>
    }
  ) {
    if (args.subcommand._tag === "Some") {
      const [tag, value] = args.subcommand.value
      const subcommand = subcommandMap.get(tag)!
      const subcommandEffect = subcommand.transform(subcommand.handler(value), value)
      return Effect.provideService(
        subcommandEffect,
        self.tag,
        args as any
      )
    }
    return self.handler(args as any)
  }
  return makeDerive(self as any, { descriptor: command as any, handler }) as any
})

/** @internal */
export const wizard = dual<
  (
    prefix: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>
  ) => Effect.Effect<
    Array<string>,
    Terminal.QuitException | ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >,
  <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>,
    prefix: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    Array<string>,
    Terminal.QuitException | ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >
>(3, (self, prefix, config) => InternalDescriptor.wizard(self.descriptor, prefix, config))

/** @internal */
export const run = dual<
  (
    config: Omit<CliApp.CliApp.ConstructorArgs<never>, "command">
  ) => <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>
  ) => (
    args: ReadonlyArray<string>
  ) => Effect.Effect<void, E | ValidationError.ValidationError, R | CliApp.CliApp.Environment>,
  <Name extends string, R, E, A>(
    self: Command.Command<Name, R, E, A>,
    config: Omit<CliApp.CliApp.ConstructorArgs<never>, "command">
  ) => (
    args: ReadonlyArray<string>
  ) => Effect.Effect<void, E | ValidationError.ValidationError, R | CliApp.CliApp.Environment>
>(2, (self, config) => {
  const app = InternalCliApp.make({
    ...config,
    command: self.descriptor
  })
  registeredDescriptors.set(self.tag, self.descriptor)
  const handler = (args: any) => self.transform(self.handler(args), args)
  return (args) => InternalCliApp.run(app, args, handler)
})

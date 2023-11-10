import type * as FileSystem from "@effect/platform/FileSystem"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Args from "../Args.js"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Parameter from "../Parameter.js"
import type * as Primitive from "../Primitive.js"
import type * as RegularLanguage from "../RegularLanguage.js"
import type * as Usage from "../Usage.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalPrimitive from "./primitive.js"
import * as InternalRegularLanguage from "./regularLanguage.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const ArgsSymbolKey = "@effect/cli/Args"

/** @internal */
export const ArgsTypeId: Args.ArgsTypeId = Symbol.for(
  ArgsSymbolKey
) as Args.ArgsTypeId

const proto = {
  _A: (_: never) => _
}

/** @internal */
export class Empty implements Args.Args<void> {
  readonly [ArgsTypeId] = proto
  readonly _tag = "Empty"

  get minSize(): number {
    return 0
  }

  get maxSize(): number {
    return 0
  }

  get identifier(): Option.Option<string> {
    return Option.none()
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.empty
  }

  get usage(): Usage.Usage {
    return InternalUsage.empty
  }

  get shortDescription(): string {
    return ""
  }

  validate(
    args: ReadonlyArray<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, void]> {
    return Effect.succeed([args, undefined])
  }

  addDescription(_description: string): Args.Args<void> {
    return new Empty()
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Single<A> implements Args.Args<A>, Parameter.Input {
  readonly [ArgsTypeId] = proto
  readonly _tag = "Single"

  constructor(
    readonly pseudoName: Option.Option<string>,
    readonly primitiveType: Primitive.Primitive<A>,
    readonly description: HelpDoc.HelpDoc = InternalHelpDoc.empty
  ) {}

  get minSize(): number {
    return 1
  }

  get maxSize(): number {
    return 1
  }

  get identifier(): Option.Option<string> {
    return Option.some(this.name)
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.descriptionList([[
      InternalSpan.weak(this.name),
      InternalHelpDoc.sequence(
        InternalHelpDoc.p(this.primitiveType.help),
        this.description
      )
    ]])
  }

  get usage(): Usage.Usage {
    return InternalUsage.named(ReadonlyArray.of(this.name), this.primitiveType.choices)
  }

  get shortDescription(): string {
    return `Argument $name: ${InternalSpan.getText(InternalHelpDoc.getSpan(this.description))}`
  }

  isValid(
    input: string,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, ReadonlyArray<string>> {
    const args = ReadonlyArray.of(input)
    return this.validate(args, config).pipe(Effect.as(args))
  }

  validate(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, A]
  > {
    return Effect.suspend(() => {
      if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
        const head = ReadonlyArray.headNonEmpty(args)
        const tail = ReadonlyArray.tailNonEmpty(args)
        return this.primitiveType.validate(Option.some(head), config).pipe(
          Effect.mapBoth({
            onFailure: (text) => InternalHelpDoc.p(text),
            onSuccess: (a) => [tail, a] as const
          })
        )
      }
      const choices = this.primitiveType.choices
      if (Option.isSome(this.pseudoName) && Option.isSome(choices)) {
        return Effect.fail(InternalHelpDoc.p(
          `Missing argument <${this.pseudoName.value}> with choices ${choices.value}`
        ))
      }
      if (Option.isSome(this.pseudoName)) {
        return Effect.fail(InternalHelpDoc.p(
          `Missing argument <${this.pseudoName.value}>`
        ))
      }
      if (Option.isSome(choices)) {
        return Effect.fail(InternalHelpDoc.p(
          `Missing argument ${this.primitiveType.typeName} with choices ${choices.value}`
        ))
      }
      return Effect.fail(InternalHelpDoc.p(
        `Missing argument ${this.primitiveType.typeName}`
      ))
    }).pipe(Effect.mapError((help) => InternalValidationError.invalidArgument(help)))
  }

  parse(
    _args: ReadonlyArray<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<
    never,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, ReadonlyArray<string>]
  > {
    return Effect.succeed([ReadonlyArray.empty(), ReadonlyArray.empty()])
  }

  addDescription(description: string): Args.Args<A> {
    const desc = InternalHelpDoc.sequence(this.description, InternalHelpDoc.p(description))
    return new Single(this.pseudoName, this.primitiveType, desc)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  private get name(): string {
    const name = Option.getOrElse(this.pseudoName, () => this.primitiveType.typeName)
    return `<${name}>`
  }
}

export class Both<A, B> implements Args.Args<readonly [A, B]> {
  readonly [ArgsTypeId] = proto
  readonly _tag = "Both"

  constructor(
    readonly left: Args.Args<A>,
    readonly right: Args.Args<B>
  ) {}

  get minSize(): number {
    return this.left.minSize + this.right.minSize
  }

  get maxSize(): number {
    return this.left.maxSize + this.right.maxSize
  }

  get identifier(): Option.Option<string> {
    const ids = ReadonlyArray.compact([this.left.identifier, this.right.identifier])
    return ReadonlyArray.match(ids, {
      onEmpty: () => Option.none(),
      onNonEmpty: (ids) => Option.some(ReadonlyArray.join(ids, ", "))
    })
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.sequence(this.left.help, this.right.help)
  }

  get usage(): Usage.Usage {
    return InternalUsage.concat(this.left.usage, this.right.usage)
  }

  get shortDescription(): string {
    return ""
  }

  validate(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, readonly [A, B]]
  > {
    return this.left.validate(args, config).pipe(
      Effect.flatMap(([args, a]) =>
        this.right.validate(args, config).pipe(
          Effect.map(([args, b]) => [args, [a, b]] as const)
        )
      )
    )
  }

  addDescription(description: string): Args.Args<readonly [A, B]> {
    return new Both(
      this.left.addDescription(description),
      this.right.addDescription(description)
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Variadic<A> implements Args.Args<ReadonlyArray<A>>, Parameter.Input {
  readonly [ArgsTypeId] = proto
  readonly _tag = "Variadic"

  constructor(
    readonly value: Args.Args<A>,
    readonly min: Option.Option<number>,
    readonly max: Option.Option<number>
  ) {}

  get minSize(): number {
    return Math.floor(Option.getOrElse(this.min, () => 0) * this.value.minSize)
  }

  get maxSize(): number {
    return Math.floor(
      Option.getOrElse(this.max, () => Number.MAX_SAFE_INTEGER / 2) * this.value.maxSize
    )
  }

  get identifier(): Option.Option<string> {
    return this.value.identifier
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.mapDescriptionList(this.value.help, (oldSpan, oldBlock) => {
      const min = this.minSize
      const max = this.maxSize
      const newSpan = InternalSpan.text(
        Option.isSome(this.max) ? ` ${min} - ${max}` : min === 0 ? "..." : ` ${min}+`
      )
      const newBlock = InternalHelpDoc.p(
        Option.isSome(this.max)
          ? `This argument must be repeated at least ${min} times and may be repeated up to ${max} times.`
          : min === 0
          ? "This argument may be repeated zero or more times."
          : `This argument must be repeated at least ${min} times.`
      )
      return [InternalSpan.concat(oldSpan, newSpan), InternalHelpDoc.sequence(oldBlock, newBlock)]
    })
  }

  get usage(): Usage.Usage {
    return InternalUsage.repeated(this.value.usage)
  }

  get shortDescription(): string {
    return InternalHelpDoc.toAnsiText(this.help)
  }

  validate(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, ReadonlyArray<A>]
  > {
    const min1 = Option.getOrElse(this.min, () => 0)
    const max1 = Option.getOrElse(this.max, () => Number.MAX_SAFE_INTEGER)
    const loop = (
      args: ReadonlyArray<string>,
      acc: ReadonlyArray<A>
    ): Effect.Effect<
      FileSystem.FileSystem,
      ValidationError.ValidationError,
      readonly [ReadonlyArray<string>, ReadonlyArray<A>]
    > => {
      if (acc.length >= max1) {
        return Effect.succeed([args, acc])
      }
      return this.value.validate(args, config).pipe(Effect.matchEffect({
        onFailure: (failure) =>
          acc.length >= min1 && ReadonlyArray.isEmptyReadonlyArray(args)
            ? Effect.succeed([args, acc])
            : Effect.fail(failure),
        onSuccess: ([args, a]) => loop(args, ReadonlyArray.prepend(acc, a))
      }))
    }
    return loop(args, ReadonlyArray.empty()).pipe(
      Effect.map(([args, acc]) => [args, ReadonlyArray.reverse(acc)])
    )
  }

  parse(
    _args: ReadonlyArray<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<
    never,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, ReadonlyArray<string>]
  > {
    return Effect.succeed([ReadonlyArray.empty(), ReadonlyArray.empty()])
  }

  isValid(
    input: string,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, ReadonlyArray<string>> {
    const args = input.split(" ")
    return this.validate(args, config).pipe(Effect.as(args))
  }

  addDescription(description: string): Args.Args<ReadonlyArray<A>> {
    return new Variadic(this.value.addDescription(description), this.min, this.max)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Map<A, B> implements Args.Args<B> {
  readonly [ArgsTypeId] = proto
  readonly _tag = "Map"

  constructor(
    readonly args: Args.Args<A>,
    readonly f: (value: A) => Either.Either<HelpDoc.HelpDoc, B>
  ) {}

  get minSize(): number {
    return this.args.minSize
  }

  get maxSize(): number {
    return this.args.maxSize
  }

  get identifier(): Option.Option<string> {
    return this.args.identifier
  }

  get help(): HelpDoc.HelpDoc {
    return this.args.help
  }

  get usage(): Usage.Usage {
    return this.args.usage
  }

  get shortDescription(): string {
    return this.args.shortDescription
  }

  validate(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, B]
  > {
    return this.args.validate(args, config).pipe(
      Effect.flatMap(([leftover, a]) =>
        Either.match(this.f(a), {
          onLeft: (doc) => Effect.fail(InternalValidationError.invalidArgument(doc)),
          onRight: (b) => Effect.succeed([leftover, b] as const)
        })
      )
    )
  }

  addDescription(description: string): Args.Args<B> {
    return new Map(this.args.addDescription(description), this.f)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isArgs = (u: unknown): u is Args.Args<unknown> =>
  typeof u === "object" && u != null && ArgsTypeId in u

/** @internal */
export const isEmpty = (u: unknown): u is Empty => isArgs(u) && "_tag" in u && u._tag === "Empty"

/** @internal */
export const isSingle = (u: unknown): u is Single<unknown> =>
  isArgs(u) && "_tag" in u && u._tag === "Single"

/** @internal */
export const isBoth = (u: unknown): u is Both<unknown, unknown> =>
  isArgs(u) && "_tag" in u && u._tag === "Both"

/** @internal */
export const isVariadic = (u: unknown): u is Variadic<unknown> =>
  isArgs(u) && "_tag" in u && u._tag === "Variadic"

/** @internal */
export const isMap = (u: unknown): u is Map<unknown, unknown> =>
  isArgs(u) && "_tag" in u && u._tag === "Map"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const all: <
  const Arg extends Iterable<Args.Args<any>> | Record<string, Args.Args<any>>
>(arg: Arg) => Args.All.Return<Arg> = function() {
  if (arguments.length === 1) {
    if (isArgs(arguments[0])) {
      return map(arguments[0], (x) => [x]) as any
    } else if (Array.isArray(arguments[0])) {
      return allTupled(arguments[0]) as any
    } else {
      const entries = Object.entries(arguments[0] as Readonly<{ [K: string]: Args.Args<any> }>)
      let result = map(entries[0][1], (value) => ({ [entries[0][0]]: value }))
      if (entries.length === 1) {
        return result as any
      }
      const rest = entries.slice(1)
      for (const [key, options] of rest) {
        result = map(new Both(result, options), ([record, value]) => ({
          ...record,
          [key]: value
        }))
      }
      return result as any
    }
  }
  return allTupled(arguments[0]) as any
}

/** @internal */
export const boolean = (config: Args.Args.BaseArgsConfig = {}): Args.Args<boolean> =>
  new Single(Option.fromNullable(config.name), InternalPrimitive.boolean(Option.none()))

/** @internal */
export const choice = <A>(
  choices: ReadonlyArray.NonEmptyReadonlyArray<[string, A]>,
  config: Args.Args.BaseArgsConfig = {}
): Args.Args<A> => new Single(Option.fromNullable(config.name), InternalPrimitive.choice(choices))

/** @internal */
export const date = (config: Args.Args.BaseArgsConfig = {}): Args.Args<globalThis.Date> =>
  new Single(Option.fromNullable(config.name), InternalPrimitive.date)

/** @internal */
export const directory = (config: Args.Args.PathArgsConfig = {}): Args.Args<string> =>
  new Single(
    Option.fromNullable(config.name),
    InternalPrimitive.path("directory", config.exists || "either")
  )

/** @internal */
export const file = (config: Args.Args.PathArgsConfig = {}): Args.Args<string> =>
  new Single(
    Option.fromNullable(config.name),
    InternalPrimitive.path("file", config.exists || "either")
  )

/** @internal */
export const float = (config: Args.Args.BaseArgsConfig = {}): Args.Args<number> =>
  new Single(Option.fromNullable(config.name), InternalPrimitive.float)

/** @internal */
export const integer = (config: Args.Args.BaseArgsConfig = {}): Args.Args<number> =>
  new Single(Option.fromNullable(config.name), InternalPrimitive.integer)

/** @internal */
export const none: Args.Args<void> = new Empty()

/** @internal */
export const path = (config: Args.Args.PathArgsConfig = {}): Args.Args<string> =>
  new Single(
    Option.fromNullable(config.name),
    InternalPrimitive.path("either", config.exists || "either")
  )

/** @internal */
export const text = (config: Args.Args.BaseArgsConfig = {}): Args.Args<string> =>
  new Single(Option.fromNullable(config.name), InternalPrimitive.text)

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const atLeast = dual<
  {
    (times: 0): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray<A>>
    (times: number): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  },
  {
    <A>(self: Args.Args<A>, times: 0): Args.Args<ReadonlyArray<A>>
    <A>(self: Args.Args<A>, times: number): Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  }
>(2, (self, times) => new Variadic(self, Option.some(times), Option.none()) as any)

/** @internal */
export const atMost = dual<
  (times: number) => <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray<A>>,
  <A>(self: Args.Args<A>, times: number) => Args.Args<ReadonlyArray<A>>
>(2, (self, times) => new Variadic(self, Option.none(), Option.some(times)))

/** @internal */
export const between = dual<
  {
    (min: 0, max: number): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray<A>>
    (
      min: number,
      max: number
    ): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  },
  {
    <A>(self: Args.Args<A>, min: 0, max: number): Args.Args<ReadonlyArray<A>>
    <A>(
      self: Args.Args<A>,
      min: number,
      max: number
    ): Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  }
>(3, (self, min, max) => new Variadic(self, Option.some(min), Option.some(max)) as any)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => B) => Args.Args<B>
>(2, (self, f) => mapOrFail(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>) => Args.Args<B>
>(2, (self, f) => new Map(self, f))

/** @internal */
export const mapTryCatch = dual<
  <A, B>(
    f: (a: A) => B,
    onError: (e: unknown) => HelpDoc.HelpDoc
  ) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(
    self: Args.Args<A>,
    f: (a: A) => B,
    onError: (e: unknown) => HelpDoc.HelpDoc
  ) => Args.Args<B>
>(3, (self, f, onError) =>
  mapOrFail(self, (a) => {
    try {
      return Either.right(f(a))
    } catch (e) {
      return Either.left(onError(e))
    }
  }))

/** @internal */
export const repeated = <A>(self: Args.Args<A>): Args.Args<ReadonlyArray<A>> =>
  new Variadic(self, Option.none(), Option.none())

/** @internal */
export const repeatedAtLeastOnce = <A>(
  self: Args.Args<A>
): Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>> =>
  map(new Variadic(self, Option.some(1), Option.none()), (values) => {
    if (ReadonlyArray.isNonEmptyReadonlyArray(values)) {
      return values
    }
    const message = Option.match(self.identifier, {
      onNone: () => "An anonymous variadic argument",
      onSome: (identifier) => `The variadic option '${identifier}' `
    })
    throw new Error(`${message} is not respecting the required minimum of 1`)
  })

/** @internal */
export const toRegularLanguage = <A>(
  self: Args.Args<A>
): RegularLanguage.RegularLanguage => {
  if (isEmpty(self)) {
    return InternalRegularLanguage.epsilon
  }
  if (isSingle(self)) {
    return InternalRegularLanguage.primitive(self.primitiveType)
  }
  if (isBoth(self)) {
    return InternalRegularLanguage.concat(
      toRegularLanguage(self.left),
      toRegularLanguage(self.right)
    )
  }
  if (isVariadic(self)) {
    return InternalRegularLanguage.repeated(toRegularLanguage(self.value), {
      min: Option.getOrUndefined(self.min),
      max: Option.getOrUndefined(self.max)
    })
  }
  if (isMap(self)) {
    return toRegularLanguage(self.args)
  }
  throw new Error(
    "[BUG]: Args.toRegularLanguage - received unrecognized " +
      `args type ${JSON.stringify(self)}`
  )
}

// =============================================================================
// Internals
// =============================================================================

const allTupled = <const T extends ArrayLike<Args.Args<any>>>(arg: T): Args.Args<
  {
    [K in keyof T]: [T[K]] extends [Args.Args<infer A>] ? A : never
  }
> => {
  if (arg.length === 0) {
    return none as any
  }
  if (arg.length === 1) {
    return map(arg[0], (x) => [x]) as any
  }
  let result = map(arg[0], (x) => [x])
  for (let i = 1; i < arg.length; i++) {
    const curr = arg[i]
    result = map(new Both(result, curr), ([a, b]) => [...a, b])
  }
  return result as any
}

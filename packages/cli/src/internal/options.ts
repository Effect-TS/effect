import type * as CliConfig from "@effect/cli/CliConfig"
import type * as HelpDoc from "@effect/cli/HelpDoc"
import * as autoCorrect from "@effect/cli/internal/autoCorrect"
import * as doc from "@effect/cli/internal/helpDoc"
import * as span from "@effect/cli/internal/helpDoc/span"
import * as primitive from "@effect/cli/internal/primitive"
import * as _usage from "@effect/cli/internal/usage"
import * as validationError from "@effect/cli/internal/validationError"
import type * as Options from "@effect/cli/Options"
import type * as Primitive from "@effect/cli/Primitive"
import type * as Usage from "@effect/cli/Usage"
import type * as ValidationError from "@effect/cli/ValidationError"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import { pipeArguments } from "effect/Pipeable"
import type { Predicate } from "effect/Predicate"
import * as RA from "effect/ReadonlyArray"

const OptionsSymbolKey = "@effect/cli/Options"

/** @internal */
export const OptionsTypeId: Options.OptionsTypeId = Symbol.for(
  OptionsSymbolKey
) as Options.OptionsTypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Options.Options<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [OptionsTypeId]: {
    _A: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export type Instruction =
  | Empty
  | Single
  | Map
  | OrElse
  | KeyValueMap
  | Variadic
  | WithDefault
  | ZipWith

/** @internal */
export interface Empty extends Op<"Empty"> {}

/** @internal */
export interface Single extends
  Op<"Single", {
    readonly name: string
    readonly aliases: Chunk.Chunk<string>
    readonly primitiveType: Primitive.Primitive<unknown>
    readonly description: HelpDoc.HelpDoc
  }>
{}

export interface Map extends
  Op<"Map", {
    readonly value: Instruction
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
export interface KeyValueMap extends
  Op<"KeyValueMap", {
    readonly argumentOption: Single
  }>
{}

/** @internal */
export interface Variadic extends
  Op<"Variadic", {
    readonly options: Single
    readonly min: Option.Option<number>
    readonly max: Option.Option<number>
  }>
{}

/** @internal */
export interface WithDefault extends
  Op<"WithDefault", {
    readonly options: Instruction
    readonly default: unknown
  }>
{}

/** @internal */
export interface ZipWith extends
  Op<"Zip", {
    readonly left: Instruction
    readonly right: Instruction
  }>
{}

/** @internal */
export const isOptions = (u: unknown): u is Options.Options<unknown> =>
  typeof u === "object" && u != null && OptionsTypeId in u

/** @internal */
export const alias = dual<
  (alias: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, alias: string) => Options.Options<A>
>(2, (self, alias) =>
  modifySingle(self as Instruction, (original) => {
    const op = Object.create(proto)
    op._tag = "Single"
    op.name = original.name
    op.aliases = Chunk.append(original.aliases, alias)
    op.primitiveType = original.primitiveType
    op.description = original.description
    return op
  }))

/** @internal */
export const atLeast = dual<
  {
    (times: 0): <A>(self: Options.Options<A>) => Options.Options<Chunk.Chunk<A>>
    (times: number): <A>(self: Options.Options<A>) => Options.Options<Chunk.NonEmptyChunk<A>>
  },
  {
    <A>(self: Options.Options<A>, times: 0): Options.Options<Chunk.Chunk<A>>
    <A>(self: Options.Options<A>, times: number): Options.Options<Chunk.NonEmptyChunk<A>>
  }
>(2, (self, times) => variadic(self, Option.some(times), Option.none()) as any)

/** @internal */
export const atMost = dual<
  (times: number) => <A>(self: Options.Options<A>) => Options.Options<Chunk.Chunk<A>>,
  <A>(self: Options.Options<A>, times: number) => Options.Options<Chunk.Chunk<A>>
>(2, (self, times) => variadic(self, Option.none(), Option.some(times)))

/** @internal */
export const between = dual<
  {
    (min: 0, max: number): <A>(self: Options.Options<A>) => Options.Options<Chunk.Chunk<A>>
    (min: number, max: number): <A>(self: Options.Options<A>) => Options.Options<Chunk.NonEmptyChunk<A>>
  },
  {
    <A>(self: Options.Options<A>, min: 0, max: number): Options.Options<Chunk.Chunk<A>>
    <A>(self: Options.Options<A>, min: number, max: number): Options.Options<Chunk.NonEmptyChunk<A>>
  }
>(3, (self, min, max) => variadic(self, Option.some(min), Option.some(max)) as any)

const defaultBooleanOptions = {
  ifPresent: true,
  negationNames: []
}

/** @internal */
export const boolean = (name: string, options: Options.Options.BooleanOptionConfig = {}): Options.Options<boolean> => {
  const { ifPresent, negationNames } = { ...defaultBooleanOptions, ...options }
  const option = single(name, Chunk.empty(), primitive.boolean(Option.some(ifPresent)))
  if (RA.isNonEmptyReadonlyArray(negationNames)) {
    const negationOption = single(
      negationNames[0],
      Chunk.unsafeFromArray(negationNames.slice(1)),
      primitive.boolean(Option.some(!ifPresent))
    )
    return withDefault(orElse(option, negationOption), !ifPresent)
  }
  return withDefault(option, !ifPresent)
}

/** @internal */
export const choice = <A extends string, C extends RA.NonEmptyReadonlyArray<A>>(
  name: string,
  choices: C
): Options.Options<C[number]> =>
  single(
    name,
    Chunk.empty(),
    primitive.choice(RA.mapNonEmpty(choices, (choice) => [choice, choice] as const))
  )

/** @internal */
export const choiceWithValue = <C extends RA.NonEmptyReadonlyArray<readonly [string, any]>>(
  name: string,
  choices: C
): Options.Options<C[number][1]> => single(name, Chunk.empty(), primitive.choice(choices))

/** @internal */
export const date = (name: string): Options.Options<Date> => single(name, Chunk.empty(), primitive.date)

/** @internal */
export const filterMap = dual<
  <A, B>(f: (a: A) => Option.Option<B>, message: string) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(self: Options.Options<A>, f: (a: A) => Option.Option<B>, message: string) => Options.Options<B>
>(3, (self, f, message) =>
  mapOrFail(self, (a) =>
    Option.match(f(a), {
      onNone: () => Either.left(validationError.invalidValue(doc.p(message))),
      onSome: Either.right
    })))

/** @internal */
export const float = (name: string): Options.Options<number> => single(name, Chunk.empty(), primitive.float)

const helpDocMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => HelpDoc.HelpDoc
} = {
  Empty: () => doc.empty,
  Single: (self) =>
    doc.descriptionList(RA.of([
      doc.getSpan(_usage.helpDoc(usage(self))),
      doc.sequence(doc.p(primitive.helpDoc(self.primitiveType)), self.description)
    ])),
  Map: (self) => helpDocMap[self.value._tag](self.value as any),
  OrElse: (self) => {
    const left = helpDocMap[self.left._tag](self.left as any)
    const right = helpDocMap[self.right._tag](self.right as any)
    return doc.sequence(left, right)
  },
  KeyValueMap: (self) => helpDocMap[self.argumentOption._tag](self.argumentOption as any),
  Variadic: (self) => helpDocMap[self.options._tag](self.options as any),
  WithDefault: (self) => {
    const helpDoc = helpDocMap[self.options._tag](self.options as any)
    return doc.mapDescriptionList(helpDoc, (span, block) => [
      span,
      doc.sequence(
        block,
        doc.p(
          Option.isOption(self.default) ?
            "This setting is optional." :
            `This setting is optional. (Defaults to: '${JSON.stringify(self.default)}')`
        )
      )
    ])
  },
  Zip: (self) => {
    const left = helpDocMap[self.left._tag](self.left as any)
    const right = helpDocMap[self.right._tag](self.right as any)
    return doc.sequence(left, right)
  }
}

/** @internal */
export const helpDoc = <A>(self: Options.Options<A>): HelpDoc.HelpDoc =>
  helpDocMap[(self as Instruction)._tag](self as any)

/** @internal */
export const integer = (name: string): Options.Options<number> => single(name, Chunk.empty(), primitive.integer)

const isBoolMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => boolean
} = {
  Empty: () => false,
  Single: (self) => primitive.isBool(self.primitiveType),
  Map: (self) => isBoolMap[self.value._tag](self.value as any),
  OrElse: () => false,
  KeyValueMap: () => false,
  Variadic: () => false,
  WithDefault: (self) => isBoolMap[self.options._tag](self.options as any),
  Zip: () => false
}

/** @internal */
export const isBool = <A>(self: Options.Options<A>): boolean => isBoolMap[(self as Instruction)._tag](self as any)

/** @internal */
export const keyValueMap = (name: string): Options.Options<HashMap.HashMap<string, string>> => {
  const op = Object.create(proto)
  op._tag = "KeyValueMap"
  op.argumentOption = single(name, Chunk.empty(), primitive.text)
  return op
}

/** @internal */
export const keyValueMapFromOption = (
  argumentOption: Options.Options<string>
): Options.Options<HashMap.HashMap<string, string>> => {
  if ((argumentOption as Instruction)._tag !== "Single") {
    throw new Error("argumentOption must be a single option")
  }
  const op = Object.create(proto)
  op._tag = "KeyValueMap"
  op.argumentOption = argumentOption
  return op
}

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(self: Options.Options<A>, f: (a: A) => B) => Options.Options<B>
>(2, <A, B>(self: Options.Options<A>, f: (a: A) => B) => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.value = self
  op.f = (a: A) => Either.right(f(a))
  return op
})

/** @internal */
export const mapOrFail = dual<
  <A, B>(
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(
    self: Options.Options<A>,
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => Options.Options<B>
>(2, (self, f) => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.value = self
  op.f = f
  return op
})

/** @internal */
export const mapTryCatch = dual<
  <A, B>(f: (a: A) => B, onError: (e: unknown) => HelpDoc.HelpDoc) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(self: Options.Options<A>, f: (a: A) => B, onError: (e: unknown) => HelpDoc.HelpDoc) => Options.Options<B>
>(3, (self, f, onError) =>
  mapOrFail(self, (a) => {
    try {
      return Either.right(f(a))
    } catch (e) {
      return Either.left(validationError.invalidValue(onError(e)))
    }
  }))

/** @internal */
export const none: Options.Options<void> = (() => {
  const op = Object.create(proto)
  op._tag = "Empty"
  return op
})()

/** @internal */
export const optional = <A>(self: Options.Options<A>): Options.Options<Option.Option<A>> =>
  withDefault(map(self, Option.some), Option.none())

/** @internal */
export const orElse = dual<
  <A>(that: Options.Options<A>) => <B>(self: Options.Options<B>) => Options.Options<A | B>,
  <A, B>(self: Options.Options<A>, that: Options.Options<B>) => Options.Options<A | B>
>(2, (self, that) => map(orElseEither(self, that), Either.merge))

/** @internal */
export const orElseEither = dual<
  <A>(that: Options.Options<A>) => <B>(self: Options.Options<B>) => Options.Options<Either.Either<B, A>>,
  <A, B>(self: Options.Options<A>, that: Options.Options<B>) => Options.Options<Either.Either<B, A>>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "OrElse"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const repeat = <A>(self: Options.Options<A>): Options.Options<Chunk.Chunk<A>> =>
  variadic(self, Option.none(), Option.none())

/** @internal */
export const repeat1 = <A>(self: Options.Options<A>): Options.Options<Chunk.NonEmptyChunk<A>> =>
  variadic(self, Option.some(1), Option.none()) as any

/** @internal */
export const text = (name: string): Options.Options<string> => single(name, Chunk.empty(), primitive.text)

const uidMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => Option.Option<string>
} = {
  Empty: () => Option.none(),
  Single: (self) => Option.some(singleFullName(self)),
  Map: (self) => uidMap[self.value._tag](self.value as any),
  OrElse: (self) => combineUids(self.left, self.right),
  KeyValueMap: (self) => uidMap[self.argumentOption._tag](self.argumentOption as any),
  Variadic: (self) => uidMap[self.options._tag](self.options as any),
  WithDefault: (self) => uidMap[self.options._tag](self.options as any),
  Zip: (self) => combineUids(self.left, self.right)
}

/** @internal */
export const uid = <A>(self: Options.Options<A>): Option.Option<string> =>
  uidMap[(self as Instruction)._tag](self as any)

const usageMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => Usage.Usage
} = {
  Empty: () => _usage.empty,
  Single: (self) => {
    const names = singleNames(self)
    const acceptedValues = primitive.isBool(self.primitiveType)
      ? Option.none()
      : Option.orElse(
        primitive.choices(self.primitiveType),
        () => Option.some(primitive.typeName(self.primitiveType))
      )
    return _usage.named(names, acceptedValues)
  },
  Map: (self) => usageMap[self.value._tag](self.value as any),
  OrElse: (self) => {
    const left = usageMap[self.left._tag](self.left as any)
    const right = usageMap[self.right._tag](self.right as any)
    return _usage.alternation(left, right)
  },
  KeyValueMap: (self) => usageMap[self.argumentOption._tag](self.argumentOption as any),
  Variadic: (self) => _usage.optional(usageMap[self.options._tag](self.options as any)),
  WithDefault: (self) => _usage.optional(usageMap[self.options._tag](self.options as any)),
  Zip: (self) => {
    const left = usageMap[self.left._tag](self.left as any)
    const right = usageMap[self.right._tag](self.right as any)
    return _usage.concat(left, right)
  }
}

/** @internal */
export const usage = <A>(self: Options.Options<A>): Usage.Usage => usageMap[(self as Instruction)._tag](self as any)

const validateMap: {
  [K in Instruction["_tag"]]: (
    self: Extract<Instruction, { _tag: K }>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, any]>
} = {
  Empty: (_, args) => Effect.succeed([args, void 0]),
  Single: (self, args, config) => {
    if (RA.isNonEmptyReadonlyArray(args)) {
      const [rest, supported] = processSingleArg(self, args[0], args.slice(1), config)
      if (supported) {
        if (primitive.isBool(self.primitiveType)) {
          return Effect.mapBoth(primitive.validate(self.primitiveType, Option.none()), {
            onFailure: (error) => validationError.invalidValue(doc.p(error)),
            onSuccess: (a) => [rest, a]
          })
        }
        return Effect.mapBoth(primitive.validate(self.primitiveType, RA.head(rest)), {
          onFailure: (error) => validationError.invalidValue(doc.p(error)),
          onSuccess: (a) => [rest.slice(1), a]
        })
      }
      const fullName = singleFullName(self)
      const distance = autoCorrect.levensteinDistance(args[0], fullName, config)
      if (self.name.length > config.autoCorrectLimit + 1 && distance <= config.autoCorrectLimit) {
        const message = `The flag '${args[0]}' is not recognized. Did you mean '${fullName}'?`
        const error = validationError.invalidValue(doc.p(span.error(message)))
        return Effect.fail(error)
      }
      return Effect.map(
        validateMap[self._tag](self, rest, config),
        (tuple) => [RA.prepend(tuple[0], args[0]), tuple[1]]
      )
    }
    const error = validationError.missingValue(
      doc.p(span.error(`Expected to find option: '${singleFullName(self)}'`))
    )
    return Effect.fail(error)
  },
  Map: (self, args, config) =>
    Effect.flatMap(
      validateMap[self.value._tag](self.value as any, args, config),
      (tuple) =>
        Either.match(self.f(tuple[1]), {
          onLeft: Effect.fail,
          onRight: (a) => Effect.succeed([tuple[0], a])
        })
    ),
  OrElse: (self, args, config) =>
    Effect.matchEffect(validateMap[self.left._tag](self.left as any, args, config), {
      onFailure: (error1) =>
        Effect.matchEffect(validateMap[self.right._tag](self.right as any, args, config), {
          onFailure: (error2) => {
            const message = doc.sequence(error1.error, error2.error)
            // The option is only considered "missing" if neither option was given
            if (validationError.isMissingValue(error1) && validationError.isMissingValue(error2)) {
              return Effect.fail(validationError.missingValue(message))
            }
            return Effect.fail(validationError.invalidValue(message))
          },
          onSuccess: (tuple) => Effect.succeed([tuple[0], Either.right(tuple[1])])
        }),
      onSuccess: (tuple) =>
        Effect.matchEffect(validateMap[self.right._tag](self.right as any, tuple[0], config), {
          onFailure: () => Effect.succeed([tuple[0], Either.left(tuple[1])]),
          onSuccess: () => {
            const left = uid(self.left)
            const right = uid(self.right)
            if (Option.isNone(left) || Option.isNone(right)) {
              const message = "Collision between two options detected. Could not render option identifiers."
              const error = validationError.invalidValue(doc.p(span.error(message)))
              return Effect.fail(error)
            }
            const message = "Collision between two options detected." +
              ` You can only specify one of either: ['${left.value}', '${right.value}'].`
            const error = validationError.invalidValue(doc.p(span.error(message)))
            return Effect.fail(error)
          }
        })
    }),
  KeyValueMap: (self, args, config) =>
    Effect.map(
      validateMap[self.argumentOption._tag](self.argumentOption as any, args, config),
      (tuple) => processKeyValueMapArg(self, tuple[0], tuple[1], config)
    ),
  Variadic: (self, args, config) => {
    const min = Option.getOrElse(self.min, () => 0)
    const max = Option.getOrElse(self.max, () => Infinity)
    const loop = (
      args: ReadonlyArray<string>,
      acc: Chunk.Chunk<unknown>
    ): Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, Chunk.Chunk<unknown>]> =>
      Effect.matchEffect(validateMap[self.options._tag](self.options as any, args, config), {
        onFailure: (error) => {
          if (!validationError.isMissingValue(error)) {
            return Effect.fail(error)
          } else if (acc.length < min) {
            return Effect.fail(validationError.missingValue(
              doc.p(span.error(`Expected at least ${min} value(s) for option: '${singleFullName(self.options)}'`))
            ))
          }

          return Effect.succeed([args, acc])
        },
        onSuccess: (tuple) => {
          acc = Chunk.append(acc, tuple[1])
          if (acc.length > max) {
            return Effect.fail(validationError.extraneousValue(
              doc.p(span.error(`Expected at most ${max} value(s) for option: '${singleFullName(self.options)}'`))
            ))
          }
          return loop(tuple[0], acc)
        }
      })
    return loop(args, Chunk.empty())
  },
  WithDefault: (self, args, config) =>
    Effect.catchSome(
      validateMap[self.options._tag](self.options as any, args, config),
      (error) =>
        validationError.isMissingValue(error)
          ? Option.some(Effect.succeed([args, self.default]))
          : Option.none()
    ),
  Zip: (self, args, config) =>
    pipe(
      validateMap[self.left._tag](self.left as any, args, config),
      Effect.catchAll(
        (error1) =>
          Effect.matchEffect(validateMap[self.right._tag](self.right as any, args, config), {
            onFailure: (error2) => Effect.fail(validationError.missingValue(doc.sequence(error1.error, error2.error))),
            onSuccess: () => Effect.fail(error1)
          })
      ),
      Effect.flatMap(([args, a]) =>
        pipe(
          validateMap[self.right._tag](self.right as any, args, config),
          Effect.map(([args, b]) => [args, [a, b]])
        )
      )
    )
}

/** @internal */
export const validate = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(
    self: Options.Options<A>
  ) => Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, A]>,
  <A>(
    self: Options.Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, A]>
>(3, (self, args, config) => validateMap[(self as Instruction)._tag](self as any, args, config))

const variadic = <A>(
  self: Options.Options<A>,
  min: Option.Option<number>,
  max: Option.Option<number>
): Options.Options<Chunk.Chunk<A>> => {
  const op = Object.create(proto)
  op._tag = "Variadic"
  op.options = self
  op.min = min
  op.max = max
  return op
}

/** @internal */
export const withDefault = dual<
  <A>(value: A) => (self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, value: A) => Options.Options<A>
>(2, (self, value) => {
  const op = Object.create(proto)
  op._tag = "WithDefault"
  op.options = self
  op.default = value
  return op
})

/** @internal */
export const withDescription = dual<
  (description: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, description: string) => Options.Options<A>
>(2, (self, description) =>
  modifySingle(self as Instruction, (original) => {
    const op = Object.create(proto)
    op._tag = "Single"
    op.name = original.name
    op.aliases = original.aliases
    op.primitiveType = original.primitiveType
    op.description = doc.sequence(original.description, doc.p(description))
    return op
  }))

/** @internal */
export const zip = dual<
  <B>(that: Options.Options<B>) => <A>(self: Options.Options<A>) => Options.Options<readonly [A, B]>,
  <A, B>(self: Options.Options<A>, that: Options.Options<B>) => Options.Options<readonly [A, B]>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "Zip"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const zipFlatten = dual<
  <B>(
    that: Options.Options<B>
  ) => <A extends ReadonlyArray<any>>(
    self: Options.Options<A>
  ) => Options.Options<[...A, B]>,
  <A extends ReadonlyArray<any>, B>(
    self: Options.Options<A>,
    that: Options.Options<B>
  ) => Options.Options<[...A, B]>
>(2, (self, that) => map(zip(self, that), ([a, b]) => [...a, b]))

/** @internal */
export const zipWith = dual<
  <B, A, C>(that: Options.Options<B>, f: (a: A, b: B) => C) => (self: Options.Options<A>) => Options.Options<C>,
  <A, B, C>(self: Options.Options<A>, that: Options.Options<B>, f: (a: A, b: B) => C) => Options.Options<C>
>(3, (self, that, f) => map(zip(self, that), ([a, b]) => f(a, b)))

/* @internal */
export const all: {
  <A, T extends ReadonlyArray<Options.Options<any>>>(
    self: Options.Options<A>,
    ...args: T
  ): Options.Options<
    readonly [
      A,
      ...(T["length"] extends 0 ? []
        : Readonly<{ [K in keyof T]: [T[K]] extends [Options.Options<infer A>] ? A : never }>)
    ]
  >
  <T extends ReadonlyArray<Options.Options<any>>>(
    args: [...T]
  ): Options.Options<
    T[number] extends never ? []
      : Readonly<{ [K in keyof T]: [T[K]] extends [Options.Options<infer A>] ? A : never }>
  >
  <T extends Readonly<{ [K: string]: Options.Options<any> }>>(
    args: T
  ): Options.Options<
    Readonly<{ [K in keyof T]: [T[K]] extends [Options.Options<infer A>] ? A : never }>
  >
} = function() {
  if (arguments.length === 1) {
    if (isOptions(arguments[0])) {
      return map(arguments[0], (x) => [x])
    } else if (Array.isArray(arguments[0])) {
      return tuple(arguments[0])
    } else {
      const entries = Object.entries(arguments[0] as Readonly<{ [K: string]: Options.Options<any> }>)
      let result = map(entries[0][1], (value) => ({ [entries[0][0]]: value }))
      if (entries.length === 1) {
        return result as any
      }
      const rest = entries.slice(1)
      for (const [key, options] of rest) {
        result = zipWith(result, options, (record, value) => ({ ...record, [key]: value }))
      }
      return result as any
    }
  }
  return tuple(arguments[0])
}

const single = <A>(
  name: string,
  aliases: Chunk.Chunk<string>,
  primitiveType: Primitive.Primitive<A>,
  description: HelpDoc.HelpDoc = doc.empty
): Options.Options<A> => {
  const op = Object.create(proto)
  op._tag = "Single"
  op.name = name
  op.aliases = aliases
  op.primitiveType = primitiveType
  op.description = description
  return op
}

const singleModifierMap: {
  [K in Instruction["_tag"]]: (
    self: Extract<Instruction, { _tag: K }>,
    f: (single: Single) => Single
  ) => Options.Options<any>
} = {
  Empty: (self) => self,
  Single: (self, f) => f(self),
  Map: (self, f) => mapOrFail(modifySingle(self.value, f), self.f),
  OrElse: (self, f) => orElseEither(modifySingle(self.left, f), modifySingle(self.right, f)),
  KeyValueMap: (self, f) => keyValueMapFromOption(f(self.argumentOption)),
  Variadic: (self, f) => variadic(f(self.options), self.min, self.max),
  WithDefault: (self, f) => withDefault(modifySingle(self.options, f), self.default),
  Zip: (self, f) => zip(modifySingle(self.left, f), modifySingle(self.right, f))
}

const singleFullName = (self: Single): string => makeSingleFullName(self.name)[1]

const singleNames = (self: Single): Chunk.Chunk<string> =>
  pipe(
    Chunk.prepend(self.aliases, self.name),
    Chunk.map(makeSingleFullName),
    Chunk.sort(Order.mapInput(Order.boolean, (tuple: readonly [boolean, string]) => !tuple[0])),
    Chunk.map((tuple) => tuple[1])
  )

const makeSingleFullName = (s: string): readonly [boolean, string] =>
  s.length === 1 ? [true, `-${s}`] : [false, `--${s}`]

const modifySingle = (self: Instruction, f: (single: Single) => Single): Options.Options<any> =>
  singleModifierMap[self._tag](self as any, f)

const processKeyValueMapArg = (
  self: KeyValueMap,
  input: ReadonlyArray<string>,
  first: string,
  config: CliConfig.CliConfig
): readonly [ReadonlyArray<string>, HashMap.HashMap<string, string>] => {
  const [remaining, chunk] = processVariadicArg(repeat(self.argumentOption) as any, input, first, config)
  const createMapEntry = (input: string): readonly [string, string] =>
    input.split("=").slice(0, 2) as unknown as readonly [string, string]
  return [remaining, HashMap.fromIterable(Chunk.map(chunk, createMapEntry))]
}

const processVariadicArg = (
  self: Variadic,
  input: ReadonlyArray<string>,
  first: string,
  config: CliConfig.CliConfig
): readonly [ReadonlyArray<string>, Chunk.Chunk<string>] => {
  const max = Option.getOrElse(self.max, () => Infinity)
  const makeFullName = (s: string): string => s.length === 1 ? `-${s}` : `--${s}`
  const supports = (s: string, config: CliConfig.CliConfig): boolean => {
    const argumentNames = Chunk.prepend(
      Chunk.map(self.options.aliases, makeFullName),
      makeFullName(self.options.name)
    )
    return config.isCaseSensitive
      ? Chunk.contains(argumentNames, s)
      : Chunk.some(argumentNames, (name) => name.toLowerCase() === s.toLowerCase())
  }

  const createChunk = (input: ReadonlyArray<string>): Chunk.Chunk<string> =>
    Chunk.fromIterable(RA.filter(input, (s) => !s.startsWith("-")))

  const tuple = RA.span(RA.fromIterable(input), (s) => !s.startsWith("-") || supports(s, config))
  const remaining = tuple[1]

  let chunk: Chunk.Chunk<string> = Chunk.prepend(createChunk(tuple[0]), first)
  if (max < Infinity) {
    chunk = Chunk.take(chunk, max)
  }

  return [remaining, chunk]
}

const processSingleArg = (
  self: Single,
  arg: string,
  remaining: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): readonly [ReadonlyArray<string>, boolean] => {
  const process = (predicate: Predicate<string>): readonly [ReadonlyArray<string>, boolean] => {
    if (predicate(arg)) {
      return [remaining, true]
    }
    if (arg.startsWith("--")) {
      const splitArg = arg.split("=")
      return splitArg.length === 2
        ? [RA.prepend(remaining, splitArg[1]), predicate(splitArg[0])]
        : [remaining, false]
    }
    return [remaining, false]
  }
  return config.isCaseSensitive
    ? process((arg) => Chunk.contains(singleNames(self), arg))
    : process((arg) => Chunk.some(singleNames(self), (name) => name.toLowerCase() === arg.toLowerCase()))
}

const combineUids = (left: Instruction, right: Instruction): Option.Option<string> => {
  const l = uidMap[left._tag](left as any)
  const r = uidMap[right._tag](right as any)
  if (Option.isNone(l) && Option.isNone(r)) {
    return Option.none()
  }
  if (Option.isNone(l) && Option.isSome(r)) {
    return Option.some(r.value)
  }
  if (Option.isSome(l) && Option.isNone(r)) {
    return Option.some(l.value)
  }
  return Option.some(`${(l as Option.Some<string>).value}, ${(r as Option.Some<string>).value}`)
}

const tuple = <T extends ArrayLike<Options.Options<any>>>(tuple: T): Options.Options<
  {
    [K in keyof T]: [T[K]] extends [Options.Options<infer A>] ? A : never
  }
> => {
  if (tuple.length === 0) {
    return none as any
  }
  if (tuple.length === 1) {
    return map(tuple[0], (x) => [x]) as any
  }
  let result = map(tuple[0], (x) => [x])
  for (let i = 1; i < tuple.length; i++) {
    const options = tuple[i]
    result = zipFlatten(result, options)
  }
  return result as any
}

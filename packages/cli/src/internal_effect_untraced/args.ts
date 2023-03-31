import type * as Args from "@effect/cli/Args"
import type * as HelpDoc from "@effect/cli/HelpDoc"
import * as doc from "@effect/cli/internal_effect_untraced/helpDoc"
import * as span from "@effect/cli/internal_effect_untraced/helpDoc/span"
import * as primitive from "@effect/cli/internal_effect_untraced/primitive"
import * as _usage from "@effect/cli/internal_effect_untraced/usage"
import * as validationError from "@effect/cli/internal_effect_untraced/validationError"
import type * as Primitive from "@effect/cli/Primitive"
import type * as Usage from "@effect/cli/Usage"
import type * as ValidationError from "@effect/cli/ValidationError"
import * as Chunk from "@effect/data/Chunk"
import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import { dual } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"

const ArgsSymbolKey = "@effect/cli/Args"

/** @internal */
export const ArgsTypeId: Args.ArgsTypeId = Symbol.for(
  ArgsSymbolKey
) as Args.ArgsTypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Args.Args<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [ArgsTypeId]: {
    _A: (_: never) => _
  }
}

/** @internal */
export type Instruction =
  | Empty
  | Map
  | Single
  | Variadic
  | Zip

/** @internal */
export interface Empty extends Op<"Empty"> {}

/** @internal */
export interface Single extends
  Op<"Single", {
    readonly pseudoName: Option.Option<string>
    readonly primitiveType: Primitive.Primitive<unknown>
    readonly description: HelpDoc.HelpDoc
  }>
{}

/** @internal */
export interface Map extends
  Op<"Map", {
    readonly value: Instruction
    readonly f: (a: unknown) => Either.Either<HelpDoc.HelpDoc, unknown>
  }>
{}

/** @internal */
export interface Variadic extends
  Op<"Variadic", {
    readonly value: Instruction
    readonly min: Option.Option<number>
    readonly max: Option.Option<number>
  }>
{}

/** @internal */
export interface Zip extends
  Op<"Zip", {
    readonly left: Instruction
    readonly right: Instruction
  }>
{}

/** @internal */
export const isArgs = (u: unknown): u is Args.Args<unknown> => typeof u === "object" && u != null && ArgsTypeId in u

const addDescriptionMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>, description: string) => Args.Args<any>
} = {
  Empty: (self) => self,
  Single: (self, description) =>
    single(self.pseudoName, self.primitiveType, doc.sequence(self.description, doc.p(description))),
  Map: (self, description) => mapOrFail(addDescriptionMap[self.value._tag](self.value as any, description), self.f),
  Variadic: (self, description) =>
    variadic(addDescriptionMap[self.value._tag](self.value as any, description), self.min, self.max),
  Zip: (self, description) =>
    zip(
      addDescriptionMap[self.left._tag](self.left as any, description),
      addDescriptionMap[self.right._tag](self.right as any, description)
    )
}

/** @internal */
export const addDescription = dual<
  (description: string) => <A>(self: Args.Args<A>) => Args.Args<A>,
  <A>(self: Args.Args<A>, description: string) => Args.Args<A>
>(2, (self, description) => addDescriptionMap[(self as Instruction)._tag](self as any, description))

/* @internal */
export const all: {
  <A, T extends ReadonlyArray<Args.Args<any>>>(
    self: Args.Args<A>,
    ...args: T
  ): Args.Args<
    readonly [
      A,
      ...(T["length"] extends 0 ? []
        : Readonly<{ [K in keyof T]: [T[K]] extends [Args.Args<infer A>] ? A : never }>)
    ]
  >
  <T extends ReadonlyArray<Args.Args<any>>>(
    args: [...T]
  ): Args.Args<
    T[number] extends never ? []
      : Readonly<{ [K in keyof T]: [T[K]] extends [Args.Args<infer A>] ? A : never }>
  >
  <T extends Readonly<{ [K: string]: Args.Args<any> }>>(
    args: T
  ): Args.Args<
    Readonly<{ [K in keyof T]: [T[K]] extends [Args.Args<infer A>] ? A : never }>
  >
} = function() {
  if (arguments.length === 1) {
    if (isArgs(arguments[0])) {
      return map(arguments[0], (x) => [x])
    } else if (Array.isArray(arguments[0])) {
      return tuple(arguments[0])
    } else {
      const entries = Object.entries(arguments[0] as Readonly<{ [K: string]: Args.Args<any> }>)
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

/** @internal */
export const atLeast = dual<
  {
    (times: 0): <A>(self: Args.Args<A>) => Args.Args<Chunk.Chunk<A>>
    (times: number): <A>(self: Args.Args<A>) => Args.Args<Chunk.NonEmptyChunk<A>>
  },
  {
    <A>(self: Args.Args<A>, times: 0): Args.Args<Chunk.Chunk<A>>
    <A>(self: Args.Args<A>, times: number): Args.Args<Chunk.NonEmptyChunk<A>>
  }
>(2, (self, times) => variadic(self, Option.some(times), Option.none()) as any)

/** @internal */
export const atMost = dual<
  (times: number) => <A>(self: Args.Args<A>) => Args.Args<Chunk.Chunk<A>>,
  <A>(self: Args.Args<A>, times: number) => Args.Args<Chunk.Chunk<A>>
>(2, (self, times) => variadic(self, Option.none(), Option.some(times)))

/** @internal */
export const between = dual<
  {
    (min: 0, max: number): <A>(self: Args.Args<A>) => Args.Args<Chunk.Chunk<A>>
    (min: number, max: number): <A>(self: Args.Args<A>) => Args.Args<Chunk.NonEmptyChunk<A>>
  },
  {
    <A>(self: Args.Args<A>, min: 0, max: number): Args.Args<Chunk.Chunk<A>>
    <A>(self: Args.Args<A>, min: number, max: number): Args.Args<Chunk.NonEmptyChunk<A>>
  }
>(3, (self, min, max) => variadic(self, Option.some(min), Option.some(max)) as any)

/** @internal */
export const boolean = (config: Args.Args.ArgsConfig = {}): Args.Args<boolean> =>
  single(Option.fromNullable(config.name), primitive.boolean(Option.none()))

/** @internal */
export const choice = <A>(
  choices: NonEmptyReadonlyArray<readonly [string, A]>,
  config: Args.Args.ArgsConfig = {}
): Args.Args<A> => single(Option.fromNullable(config.name), primitive.choice(choices))

/** @internal */
export const date = (config: Args.Args.ArgsConfig = {}): Args.Args<globalThis.Date> =>
  single(Option.fromNullable(config.name), primitive.date)

/** @internal */
export const float = (config: Args.Args.ArgsConfig = {}): Args.Args<number> =>
  single(Option.fromNullable(config.name), primitive.float)

const helpDocMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => HelpDoc.HelpDoc
} = {
  Empty: () => doc.empty,
  Single: (self) =>
    doc.descriptionList([[
      span.weak(singleName(self)),
      doc.sequence(doc.p(primitive.helpDoc(self.primitiveType)), self.description)
    ]]),
  Map: (self) => helpDocMap[self.value._tag](self.value as any),
  Variadic: (self) =>
    doc.mapDescriptionList(
      helpDocMap[self.value._tag](self.value as any),
      (oldSpan, oldBlock) => {
        const min = minSize(self)
        const max = maxSize(self)
        const newSpan = span.text(Option.isSome(self.max) ? ` ${min} - ${max}` : min === 0 ? "..." : ` ${min}+`)
        const newBlock = doc.p(
          Option.isSome(self.max)
            ? `This argument must be repeated at least ${min} times and may be repeated up to ${max} times.`
            : min === 0
            ? "This argument may be repeated zero or more times."
            : `This argument must be repeated at least ${min} times.`
        )
        return [span.concat(oldSpan, newSpan), doc.sequence(oldBlock, newBlock)]
      }
    ),
  Zip: (self) =>
    doc.sequence(
      helpDocMap[self.left._tag](self.left as any),
      helpDocMap[self.right._tag](self.right as any)
    )
}

/** @internal */
export const helpDoc = <A>(self: Args.Args<A>): HelpDoc.HelpDoc => helpDocMap[(self as Instruction)._tag](self as any)

/** @internal */
export const integer = (config: Args.Args.ArgsConfig = {}): Args.Args<number> =>
  single(Option.fromNullable(config.name), primitive.integer)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => B) => Args.Args<B>
>(2, (self, f) => mapOrFail(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>) => Args.Args<B>
>(2, (self, f) => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.value = self
  op.f = f
  return op
})

/** @internal */
export const mapTryCatch = dual<
  <A, B>(f: (a: A) => B, onError: (e: unknown) => HelpDoc.HelpDoc) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => B, onError: (e: unknown) => HelpDoc.HelpDoc) => Args.Args<B>
>(3, (self, f, onError) =>
  mapOrFail(self, (a) => {
    try {
      return Either.right(f(a))
    } catch (e) {
      return Either.left(onError(e))
    }
  }))

const minSizeMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => number
} = {
  Empty: () => 0,
  Single: () => 1,
  Map: (self) => minSizeMap[self.value._tag](self.value as any),
  Variadic: (self) => Option.getOrElse(self.min, () => 0) * minSizeMap[self.value._tag](self.value as any),
  Zip: (self) => minSizeMap[self.left._tag](self.left as any) + minSizeMap[self.right._tag](self.right as any)
}

/** @internal */
export const minSize = <A>(self: Args.Args<A>): number => minSizeMap[(self as Instruction)._tag](self as any)

const maxSizeMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => number
} = {
  Empty: () => 0,
  Single: () => 1,
  Map: (self) => maxSizeMap[self.value._tag](self.value as any),
  Variadic: (self) =>
    Option.getOrElse(self.max, () => Math.floor(Number.MAX_SAFE_INTEGER / 2)) *
    maxSizeMap[self.value._tag](self.value as any),
  Zip: (self) => maxSizeMap[self.left._tag](self.left as any) + maxSizeMap[self.right._tag](self.right as any)
}

/** @internal */
export const maxSize = <A>(self: Args.Args<A>): number => maxSizeMap[(self as Instruction)._tag](self as any)

/** @internal */
export const none: Args.Args<void> = (() => {
  const op = Object.create(proto)
  op._tag = "Empty"
  return op
})()

/** @internal */
export const repeat = <A>(self: Args.Args<A>): Args.Args<Chunk.Chunk<A>> => variadic(self, Option.none(), Option.none())

/** @internal */
export const repeat1 = <A>(self: Args.Args<A>): Args.Args<Chunk.NonEmptyChunk<A>> =>
  map(variadic(self, Option.some(1), Option.none()), (chunk) => {
    if (Chunk.isNonEmpty(chunk)) {
      return chunk
    }
    const message = Option.match(
      uid(self),
      () => "An anonymous variadic argument",
      (identifier) => `The variadic option '${identifier}' `
    )
    throw new Error(`${message} is not respecting the required minimum of 1`)
  })

/** @internal */
export const text = (config: Args.Args.ArgsConfig = {}): Args.Args<string> =>
  single(Option.fromNullable(config.name), primitive.text)

const uidMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => Option.Option<string>
} = {
  Empty: () => Option.none(),
  Single: (self) => Option.some(singleName(self)),
  Map: (self) => uidMap[self.value._tag](self.value as any),
  Variadic: (self) => uidMap[self.value._tag](self.value as any),
  Zip: (self) => combineUids(self.left, self.right)
}

/** @internal */
export const uid = <A>(self: Args.Args<A>): Option.Option<string> => uidMap[(self as Instruction)._tag](self as any)

const usageMap: {
  [K in Instruction["_tag"]]: (self: Extract<Instruction, { _tag: K }>) => Usage.Usage
} = {
  Empty: () => _usage.empty,
  Single: (self) => _usage.named(Chunk.of(singleName(self)), primitive.choices(self.primitiveType)),
  Map: (self) => usageMap[self.value._tag](self.value as any),
  Variadic: (self) => _usage.repeated(usageMap[self.value._tag](self.value as any)),
  Zip: (self) =>
    _usage.concat(
      usageMap[self.left._tag](self.left as any),
      usageMap[self.right._tag](self.right as any)
    )
}

/** @internal */
export const usage = <A>(self: Args.Args<A>): Usage.Usage => usageMap[(self as Instruction)._tag](self as any)

const validateMap: {
  [K in Instruction["_tag"]]: (
    self: Extract<Instruction, { _tag: K }>,
    args: ReadonlyArray<string>
  ) => Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, any]>
} = {
  Empty: (_, args) => Effect.succeed([args, void 0]),
  Single: (self, args) => {
    if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
      return Effect.mapBoth(
        primitive.validate(self.primitiveType, Option.some(args[0])),
        (text) => validationError.invalidArgument(doc.p(text)),
        (a) => [args.slice(1), a]
      )
    }
    const choices = primitive.choices(self.primitiveType)
    let message = ""
    if (Option.isSome(self.pseudoName) && Option.isSome(choices)) {
      message = `Missing argument <${self.pseudoName.value}> with values: ${choices.value}`
    }
    if (Option.isSome(self.pseudoName) && Option.isNone(choices)) {
      message = `Missing argument <${self.pseudoName.value}>`
    }
    if (Option.isNone(self.pseudoName) && Option.isSome(choices)) {
      message = `Missing a ${primitive.typeName(self.primitiveType)} argument with values: ${choices.value}`
    }
    message = `Missing a ${primitive.typeName(self.primitiveType)} argument`
    return Effect.fail(validationError.invalidArgument(doc.p(message)))
  },
  Map: (self, args) =>
    Effect.flatMap(
      validateMap[self.value._tag](self.value as any, args),
      ([remainder, a]) =>
        Either.match(
          self.f(a),
          (doc) => Effect.fail(validationError.invalidArgument(doc)),
          (value) => Effect.succeed([remainder, value])
        )
    ),
  Variadic: (self, args) => {
    const min = Option.getOrElse(self.min, () => 0)
    const max = Option.getOrElse(self.max, () => Infinity)
    const loop = (
      args: ReadonlyArray<string>,
      acc: Chunk.Chunk<unknown>
    ): Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, Chunk.Chunk<unknown>]> =>
      acc.length >= max
        ? Effect.succeed([args, acc])
        : Effect.matchEffect(
          validateMap[self.value._tag](self.value as any, args),
          (error) =>
            acc.length >= min && ReadonlyArray.isEmptyReadonlyArray(args) ?
              Effect.succeed([args, acc]) :
              Effect.fail(error),
          (tuple) => loop(tuple[0], Chunk.append(acc, tuple[1]))
        )
    return loop(args, Chunk.empty())
  },
  Zip: (self, args) =>
    Effect.flatMap(
      validateMap[self.left._tag](self.left as any, args),
      ([args, a]) =>
        Effect.map(
          validateMap[self.right._tag](self.right as any, args),
          ([args, b]) => [args, [a, b]]
        )
    )
}

/** @internal */
export const validate = Debug.dualWithTrace<
  (
    args: ReadonlyArray<string>
  ) => <A>(
    self: Args.Args<A>
  ) => Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, A]>,
  <A>(
    self: Args.Args<A>,
    args: ReadonlyArray<string>
  ) => Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, A]>
>(2, (trace) => (self, args) => validateMap[(self as Instruction)._tag](self as any, args).traced(trace))

/** @internal */
export const zip = dual<
  <B>(that: Args.Args<B>) => <A>(self: Args.Args<A>) => Args.Args<readonly [A, B]>,
  <A, B>(self: Args.Args<A>, that: Args.Args<B>) => Args.Args<readonly [A, B]>
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
    that: Args.Args<B>
  ) => <A extends ReadonlyArray<any>>(
    self: Args.Args<A>
  ) => Args.Args<[...A, B]>,
  <A extends ReadonlyArray<any>, B>(
    self: Args.Args<A>,
    that: Args.Args<B>
  ) => Args.Args<[...A, B]>
>(2, (self, that) => map(zip(self, that), ([a, b]) => [...a, b]))

/** @internal */
export const zipWith = dual<
  <B, A, C>(that: Args.Args<B>, f: (a: A, b: B) => C) => (self: Args.Args<A>) => Args.Args<C>,
  <A, B, C>(self: Args.Args<A>, that: Args.Args<B>, f: (a: A, b: B) => C) => Args.Args<C>
>(3, (self, that, f) => map(zip(self, that), ([a, b]) => f(a, b)))

const single = <A>(
  pseudoName: Option.Option<string>,
  primitiveType: Primitive.Primitive<A>,
  description: HelpDoc.HelpDoc = doc.empty
): Args.Args<A> => {
  const op = Object.create(proto)
  op._tag = "Single"
  op.pseudoName = pseudoName
  op.primitiveType = primitiveType
  op.description = description
  return op
}

const singleName = (self: Single): string =>
  `<${Option.getOrElse(self.pseudoName, () => primitive.typeName(self.primitiveType))}>`

const variadic = <A>(
  value: Args.Args<A>,
  min: Option.Option<number>,
  max: Option.Option<number>
): Args.Args<Chunk.Chunk<A>> => {
  const op = Object.create(proto)
  op._tag = "Variadic"
  op.value = value
  op.min = min
  op.max = max
  return op
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

const tuple = <T extends ArrayLike<Args.Args<any>>>(tuple: T): Args.Args<
  {
    [K in keyof T]: [T[K]] extends [Args.Args<infer A>] ? A : never
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
    const args = tuple[i]
    result = zipFlatten(result, args)
  }
  return result as any
}

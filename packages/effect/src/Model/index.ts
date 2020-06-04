import {
  Any,
  InputOf,
  getDefaultContext,
  Type,
  success,
  failure,
  identity,
  OutputOf,
  brand,
  Branded,
  string,
  literal,
  Mixed,
  TypeOf,
  union,
  strict,
  ArrayType,
  array as mutableArray
} from "io-ts"

import * as A from "../Array"
import { mapLeft, map_, chain_, Either, mapLeft_ } from "../Either"
import { Refinement } from "../Function"
import { wrap, unwrap } from "../Monocle/Iso"
import { AnyNewtype, CarrierOf, iso } from "../Newtype"
import * as NEA from "../NonEmptyArray"
import * as O from "../Option"
import type { Ord } from "../Ord"
import * as S from "../Set"

export {
  Any,
  AnyArrayType,
  AnyC,
  AnyDictionaryType,
  AnyProps,
  AnyType,
  Array,
  ArrayType,
  BigIntC,
  BigIntType,
  BooleanC,
  BooleanType,
  Brand,
  BrandC,
  Branded,
  Compact,
  Context,
  ContextEntry,
  Decode,
  Decoder,
  Dictionary,
  DictionaryType,
  Encode,
  Encoder,
  Errors,
  Exact,
  ExactC,
  ExactType,
  Function,
  FunctionC,
  FunctionType,
  HasProps,
  HasPropsIntersection,
  HasPropsReadonly,
  HasPropsRefinement,
  InputOf,
  Int,
  IntBrand,
  Integer,
  InterfaceType,
  IntersectionC,
  IntersectionType,
  Is,
  KeyofC,
  KeyofType,
  LiteralC,
  LiteralType,
  Mixed,
  NeverC,
  NeverType,
  NullC,
  NullType,
  NumberC,
  NumberType,
  ObjectC,
  ObjectType,
  OutputOf,
  OutputOfDictionary,
  OutputOfPartialProps,
  OutputOfProps,
  PartialC,
  PartialType,
  Props,
  PropsOf,
  ReadonlyArrayC,
  ReadonlyArrayType,
  ReadonlyC,
  ReadonlyType,
  RecordC,
  RecursiveType,
  RefinementC,
  RefinementType,
  StrictC,
  StrictType,
  StringC,
  StringType,
  Tagged,
  TaggedExact,
  TaggedIntersection,
  TaggedIntersectionArgument,
  TaggedProps,
  TaggedRefinement,
  TaggedUnion,
  TaggedUnionC,
  TaggedUnionType,
  TupleC,
  TupleType,
  Type,
  TypeC,
  TypeOf,
  TypeOfDictionary,
  TypeOfPartialProps,
  TypeOfProps,
  UndefinedC,
  UndefinedType,
  UnionC,
  UnionType,
  UnknownArray,
  UnknownArrayC,
  UnknownC,
  UnknownRecord,
  UnknownRecordC,
  UnknownType,
  Validate,
  Validation,
  ValidationError,
  VoidC,
  VoidType,
  alias,
  any,
  appendContext,
  bigint,
  boolean,
  brand,
  clean,
  dictionary,
  exact,
  failure,
  failures,
  getContextEntry,
  getDefaultContext,
  getFunctionName,
  getValidationError,
  identity,
  interface,
  intersection,
  keyof,
  literal,
  mixed,
  never,
  null,
  nullType,
  number,
  object,
  partial,
  readonly,
  readonlyArray,
  record,
  recursion,
  strict,
  string,
  success,
  taggedUnion,
  tuple,
  type,
  undefined,
  union,
  unknown,
  void,
  voidType
} from "io-ts"

export function clone<C extends Any>(t: C): C {
  const r = Object.create(Object.getPrototypeOf(t))
  Object.assign(r, t)
  return r
}

export function withMessage<C extends Any>(
  message: (i: InputOf<C>) => string
): (codec: C) => C {
  return (codec) =>
    withValidate_(codec, (i, c) =>
      mapLeft(() => [
        {
          value: i,
          context: c,
          message: message(i),
          actual: i
        }
      ])(codec.validate(i, c))
    )
}

export function withFirstMessage<C extends Any>(
  message: (i: InputOf<C>) => string
): (codec: C) => C {
  return (codec) =>
    withValidate_(codec, (i, c) =>
      mapLeft_(codec.validate(i, c), (e) => [
        e.length > 0 && e[0].message
          ? {
              value: i,
              context: c,
              message: e[0].message,
              actual: i
            }
          : {
              value: i,
              context: c,
              message: message(i),
              actual: i
            }
      ])
    )
}

export function withMessage_<C extends Any>(
  codec: C,
  message: (i: InputOf<C>) => string
): C {
  return withValidate_(codec, (i, c) =>
    mapLeft(() => [
      {
        value: i,
        context: c,
        message: message(i),
        actual: i
      }
    ])(codec.validate(i, c))
  )
}

export function withValidate<C extends Any>(
  validate: C["validate"],
  name?: string
): (codec: C) => C {
  return (codec) => {
    const r: any = clone(codec)
    r.validate = validate
    r.decode = (i: any) => validate(i, getDefaultContext(r))
    r.name = name || codec.name
    return r
  }
}

export function withValidate_<C extends Any>(
  codec: C,
  validate: C["validate"],
  name: string = codec.name
): C {
  const r: any = clone(codec)
  r.validate = validate
  r.decode = (i: any) => validate(i, getDefaultContext(r))
  r.name = name
  return r
}

export function fromRefinement<A>(
  name: string,
  is: (u: unknown) => u is A
): Type<A, A, unknown> {
  return new Type(name, is, (u, c) => (is(u) ? success(u) : failure(u, c)), identity)
}

export function fromNewtype<N extends AnyNewtype = never>(
  codec: Type<CarrierOf<N>, OutputOf<CarrierOf<N>>>,
  name = `fromNewtype(${codec.name})`
): Type<N, CarrierOf<N>, unknown> {
  const i = iso<N>()
  return new Type(
    name,
    (u): u is N => codec.is(u),
    (u, c) => map_(codec.validate(u, c), wrap(i)),
    (a) => codec.encode(unwrap(i)(a))
  )
}

export function refinement<A, O, I, B extends A>(
  codec: Type<A, O, I>,
  refinement: Refinement<A, B>,
  name = `refinment(${codec.name})`
): Type<B, O, I> {
  return new Type(
    name,
    (u): u is B => codec.is(u) && refinement(u),
    (u, c) =>
      chain_(codec.validate(u, c), (a) => (refinement(a) ? success(a) : failure(u, c))),
    (a) => codec.encode(a)
  )
}

export function opaque<Opaque, OpaqueR = unknown, OpaqueI = unknown>() {
  return <A extends Opaque, O extends OpaqueR, I extends OpaqueI>(
    c: Type<A, O, I>
  ): Type<
    Opaque,
    unknown extends OpaqueR ? O : OpaqueR,
    unknown extends OpaqueI ? I : OpaqueI
  > => c as any
}

export {
  PathReporter,
  failure as reportFailure,
  success as reportSuccess
} from "io-ts/lib/PathReporter"

const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface UUIDBrand {
  readonly UUID: unique symbol
}

export type UUID = Branded<string, UUIDBrand>

export const UUID = brand(string, (s): s is UUID => regex.test(s), "UUID")

export interface DateFromISOStringC extends Type<Date, string, unknown> {}

export const DateFromISOString: DateFromISOStringC = new Type<Date, string, unknown>(
  "DateFromISOString",
  (u): u is Date => u instanceof Date,
  (u, c) =>
    chain_(string.validate(u, c), (s) => {
      const d = new Date(s)
      return isNaN(d.getTime()) ? failure(u, c) : success(d)
    }),
  (a) => a.toISOString()
)

const leftLiteral = literal("Left")

const rightLiteral = literal("Right")

export interface EitherC<L extends Mixed, R extends Mixed>
  extends Type<
    Either<TypeOf<L>, TypeOf<R>>,
    Either<OutputOf<L>, OutputOf<R>>,
    unknown
  > {}

export function either<L extends Mixed, R extends Mixed>(
  leftCodec: L,
  rightCodec: R,
  name = `Either<${leftCodec.name}, ${rightCodec.name}>`
): EitherC<L, R> {
  return union(
    [
      strict(
        {
          _tag: leftLiteral,
          left: leftCodec
        },
        `Left<${leftCodec.name}>`
      ),
      strict(
        {
          _tag: rightLiteral,
          right: rightCodec
        },
        `Right<${leftCodec.name}>`
      )
    ],
    name
  )
}

const None = strict({
  _tag: literal("None")
})

const someLiteral = literal("Some")

export interface OptionC<C extends Mixed>
  extends Type<O.Option<TypeOf<C>>, O.Option<OutputOf<C>>, unknown> {}

export function option<C extends Mixed>(
  codec: C,
  name = `Option<${codec.name}>`
): OptionC<C> {
  return union(
    [
      None,
      strict(
        {
          _tag: someLiteral,
          value: codec
        },
        `Some<${codec.name}>`
      )
    ],
    name
  )
}

export interface OptionFromNullableC<C extends Mixed>
  extends Type<O.Option<TypeOf<C>>, OutputOf<C> | null, unknown> {}

export function optionFromNullable<C extends Mixed>(
  codec: C,
  name = `Option<${codec.name}>`
): OptionFromNullableC<C> {
  return new Type(
    name,
    option(codec).is,
    (u, c) => (u == null ? success(O.none) : map_(codec.validate(u, c), O.some)),
    (a) => O.toNullable(O.map_(a, codec.encode))
  )
}

export interface ArrayC<C extends Mixed>
  extends ArrayType<C, A.Array<TypeOf<C>>, A.Array<OutputOf<C>>, unknown> {}

export const array: <C extends Mixed>(
  codec: C,
  name?: string
) => ArrayC<C> = mutableArray as any

export interface NonEmptyArrayC<C extends Mixed>
  extends Type<NEA.NonEmptyArray<TypeOf<C>>, A.Array<OutputOf<C>>, unknown> {}

export function nonEmptyArray<C extends Mixed>(
  codec: C,
  name = `NonEmptyArray<${codec.name}>`
): NonEmptyArrayC<C> {
  const arr = array(codec)
  return new Type(
    name,
    (u): u is NEA.NonEmptyArray<TypeOf<C>> => arr.is(u) && A.isNonEmpty(u),
    (u, c) =>
      chain_(arr.validate(u, c), (as) => {
        const onea = NEA.fromArray(as)
        return O.isNone(onea) ? failure(u, c) : success(onea.value)
      }),
    (nea) => arr.encode(nea)
  )
}

export interface SetFromArrayC<C extends Mixed>
  extends Type<S.Set<TypeOf<C>>, A.Array<OutputOf<C>>, unknown> {}

export function setFromArray<C extends Mixed>(
  codec: C,
  O: Ord<TypeOf<C>>,
  name = `Set<${codec.name}>`
): SetFromArrayC<C> {
  const arr = array(codec)
  const toArrayO = S.toArray(O)
  const fromArrayO = S.fromArray(O)
  return new Type(
    name,
    (u): u is Set<TypeOf<C>> => u instanceof Set && S.every(codec.is)(u),
    (u, c) =>
      chain_(arr.validate(u, c), (as) => {
        const set = fromArrayO(as)
        return set.size !== as.length ? failure(u, c) : success(set)
      }),
    (set) => arr.encode(toArrayO(set))
  )
}

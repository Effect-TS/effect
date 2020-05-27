import {
  Any,
  InputOf,
  getDefaultContext,
  Type,
  success,
  failure,
  identity,
  OutputOf
} from "io-ts"

import { mapLeft, map_ } from "../Either"
import { wrap, unwrap } from "../Monocle/Iso"
import { AnyNewtype, CarrierOf, iso } from "../Newtype"

export {
  Any,
  AnyArrayType,
  AnyC,
  AnyDictionaryType,
  AnyProps,
  AnyType,
  Array,
  ArrayC,
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
  array,
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
  refinement,
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
  codec: C,
  message: (i: InputOf<C>) => string
): C {
  return withValidate(codec, (i, c) =>
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

export function opaque<Opaque>() {
  return <A extends Opaque, O, I>(c: Type<A, O, I>): Type<Opaque, O, I> => c as any
}

export {
  PathReporter,
  failure as reportFailure,
  success as reportSuccess
} from "io-ts/lib/PathReporter"

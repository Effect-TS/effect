// adapted from https://github.com/gcanti/io-ts

/* eslint-disable no-prototype-builtins */

import * as A from "@matechs/core/Array"
import type { Branded } from "@matechs/core/Branded"
import * as E from "@matechs/core/Either"
import { Predicate, Refinement, identity, introduce } from "@matechs/core/Function"
import type { Iso } from "@matechs/core/Monocle/Iso"
import type { Prism } from "@matechs/core/Monocle/Prism"
import * as NEA from "@matechs/core/NonEmptyArray"
import * as O from "@matechs/core/Option"
import type { Ord } from "@matechs/core/Ord"
import * as S from "@matechs/core/Set"
import type { UUID } from "@matechs/morphic-alg/primitives"

export interface ContextEntry {
  readonly key: string
  readonly type: Decoder<any>
  /** the input data */
  readonly actual?: unknown
}

export interface Context extends ReadonlyArray<ContextEntry> {}

export interface ValidationError {
  /** the offending (sub)value */
  readonly value: unknown
  /** where the error originated */
  readonly context: Context
  /** optional custom error message */
  readonly message?: string
}

export interface Errors extends Array<ValidationError> {}

export type Validation<A> = E.Either<Errors, A>

export type Validate<A> = (i: unknown, context: Context) => Validation<A>

export type Decode<A> = (i: unknown) => Validation<A>

export type Encode<A, O> = (a: A) => O

export interface Any extends Codec<any, any> {}

export type TypeOf<C extends Any> = C["_A"]

export type OutputOf<C extends Any> = C["_O"]

export interface Decoder<A> {
  readonly name: string
  readonly validate: Validate<A>
  readonly decode: Decode<A>
}

export interface Encoder<A, O> {
  readonly encode: Encode<A, O>
}

export class Codec<A, O = A> implements Decoder<A>, Encoder<A, O> {
  readonly _A!: A
  readonly _O!: O
  constructor(
    /** a unique name for this codec */
    readonly name: string,
    /** succeeds if a value of type I can be decoded to a value of type A */
    readonly validate: Validate<A>,
    /** converts a value of type A to a value of type O */
    readonly encode: Encode<A, O>
  ) {
    this.decode = this.decode.bind(this)
  }

  /**
   * a version of `validate` with a default context
   */
  decode(i: unknown): Validation<A> {
    return this.validate(i, [{ key: "", type: this, actual: i }])
  }
}

export const getFunctionName = (f: Function): string =>
  (f as any).displayName || (f as any).name || `<function${f.length}>`

export const getContextEntry = (key: string, decoder: Decoder<any>): ContextEntry => ({
  key,
  type: decoder
})

export const appendContext = (
  c: Context,
  key: string,
  decoder: Decoder<any>,
  actual?: unknown
): Context => {
  const len = c.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i] = c[i]
  }
  r[len] = { key, type: decoder, actual }
  return r
}

export const failures: <T>(errors: Errors) => Validation<T> = E.left

export const failure = <T>(
  value: unknown,
  context: Context,
  message?: string
): Validation<T> => failures([{ value, context, message }])

export const success: <T>(value: T) => Validation<T> = E.right

const pushAll = <A>(xs: Array<A>, ys: Array<A>): void => {
  const l = ys.length
  for (let i = 0; i < l; i++) {
    xs.push(ys[i])
  }
}

export class UndefinedType extends Codec<undefined> {
  readonly _tag: "UndefinedType" = "UndefinedType"
  constructor() {
    super("undefined", (u, c) => (u === void 0 ? success(u) : failure(u, c)), identity)
  }
}

export interface UndefinedC extends UndefinedType {}

const undefinedType: UndefinedC =
  /*#__PURE__*/
  (() => new UndefinedType())()

export class VoidType extends Codec<void> {
  readonly _tag: "VoidType" = "VoidType"
  constructor() {
    super("void", undefinedType.validate, identity)
  }
}

export interface VoidC extends VoidType {}

export const voidType: VoidC =
  /*#__PURE__*/
  (() => new VoidType())()

export class UnknownType extends Codec<unknown> {
  readonly _tag: "UnknownType" = "UnknownType"
  constructor() {
    super("unknown", success, identity)
  }
}

export interface UnknownC extends UnknownType {}

export const unknown: UnknownC =
  /*#__PURE__*/
  (() => new UnknownType())()

export class StringType extends Codec<string> {
  readonly _tag: "StringType" = "StringType"
  constructor() {
    super(
      "string",
      (u, c) => (typeof u === "string" ? success(u) : failure(u, c)),
      identity
    )
  }
}

export const isString = (u: unknown): u is string => typeof u === "string"

export interface StringC extends StringType {}

export const string: StringC =
  /*#__PURE__*/
  (() => new StringType())()

export class NumberType extends Codec<number> {
  readonly _tag: "NumberType" = "NumberType"
  constructor() {
    super(
      "number",
      (u, c) => (typeof u === "number" ? success(u) : failure(u, c)),
      identity
    )
  }
}

export interface NumberC extends NumberType {}

export const number: NumberC =
  /*#__PURE__*/
  (() => new NumberType())()

export class BooleanType extends Codec<boolean> {
  readonly _tag: "BooleanType" = "BooleanType"
  constructor() {
    super(
      "boolean",
      (u, c) => (typeof u === "boolean" ? success(u) : failure(u, c)),
      identity
    )
  }
}

export interface BooleanC extends BooleanType {}

export const boolean: BooleanC =
  /*#__PURE__*/
  (() => new BooleanType())()

export class AnyArrayType extends Codec<Array<unknown>> {
  readonly _tag: "AnyArrayType" = "AnyArrayType"
  constructor() {
    super(
      "UnknownArray",
      (u, c) => (Array.isArray(u) ? success(u) : failure(u, c)),
      identity
    )
  }
}

export interface UnknownArrayC extends AnyArrayType {}

export const UnknownArray: UnknownArrayC =
  /*#__PURE__*/
  (() => new AnyArrayType())()

export class AnyDictionaryType extends Codec<{ [key: string]: unknown }> {
  readonly _tag: "AnyDictionaryType" = "AnyDictionaryType"
  constructor() {
    super(
      "UnknownRecord",
      (u, c) => (this.is(u) ? success(u) : failure(u, c)),
      identity
    )
  }

  is(u: unknown): u is { [key: string]: unknown } {
    const s = Object.prototype.toString.call(u)
    return s === "[object Object]" || s === "[object Window]"
  }
}

export const UnknownRecord: UnknownRecordC =
  /*#__PURE__*/
  (() => new AnyDictionaryType())()

export interface UnknownRecordC extends AnyDictionaryType {}

export interface RefinementC<C extends Any>
  extends RefinementType<C, TypeOf<C>, OutputOf<C>> {}

export class RefinementType<C extends Any, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "RefinementType" = "RefinementType"
  constructor(
    name: string,
    validate: RefinementType<C, A, O>["validate"],
    encode: RefinementType<C, A, O>["encode"],
    readonly type: C,
    readonly predicate: Predicate<A>
  ) {
    super(name, validate, encode)
  }
}

export interface BrandC<C extends Any, B>
  extends RefinementType<C, Branded<TypeOf<C>, B>, OutputOf<C>> {}

export const brand = <
  C extends Any,
  N extends string,
  B extends { readonly [K in N]: symbol }
>(
  codec: C,
  predicate: Refinement<TypeOf<C>, Branded<TypeOf<C>, B>>,
  name: N
): BrandC<C, B> => {
  return new RefinementType(
    name,
    (i, c) => {
      const e = codec.validate(i, c)
      if (E.isLeft(e)) {
        return e
      }
      const a = e.right
      return predicate(a) ? success(a) : failure(a, c)
    },
    codec.encode,
    codec,
    predicate
  )
}

type LiteralValue = string | number | boolean

export class LiteralType<V extends LiteralValue> extends Codec<V> {
  readonly _tag: "LiteralType" = "LiteralType"
  constructor(
    name: string,
    validate: LiteralType<V>["validate"],
    encode: LiteralType<V>["encode"],
    readonly value: V
  ) {
    super(name, validate, encode)
  }
}

export interface LiteralC<V extends LiteralValue> extends LiteralType<V> {}

export const literal = <V extends LiteralValue>(
  value: V,
  name: string = JSON.stringify(value)
): LiteralC<V> => {
  const is = (u: unknown): u is V => u === value
  return new LiteralType(
    name,
    (u, c) => (is(u) ? success(value) : failure(u, c)),
    identity,
    value
  )
}

export class KeyofType<D extends { [key: string]: unknown }> extends Codec<keyof D> {
  readonly _tag: "KeyofType" = "KeyofType"
  constructor(
    name: string,
    validate: KeyofType<D>["validate"],
    encode: KeyofType<D>["encode"],
    readonly keys: D
  ) {
    super(name, validate, encode)
  }
}

const hasOwnProperty =
  /*#__PURE__*/
  (() => Object.prototype.hasOwnProperty)()

export interface KeyofC<D extends { [key: string]: unknown }> extends KeyofType<D> {}

export const keyof = <D extends { [key: string]: unknown }>(
  keys: D,
  name: string = Object.keys(keys)
    .map((k) => JSON.stringify(k))
    .join(" | ")
): KeyofC<D> => {
  const is = (u: unknown): u is keyof D => isString(u) && hasOwnProperty.call(keys, u)
  return new KeyofType(
    name,
    (u, c) => (is(u) ? success(u) : failure(u, c)),
    identity,
    keys
  )
}

export class RecursiveType<C extends Any, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "RecursiveType" = "RecursiveType"
  constructor(
    name: string,
    validate: RecursiveType<C, A, O>["validate"],
    encode: RecursiveType<C, A, O>["encode"],
    public runDefinition: () => C
  ) {
    super(name, validate, encode)
  }

  get type(): C {
    return this.runDefinition()
  }
}

export const recursion = <A, O = A, C extends Codec<A, O> = Codec<A, O>>(
  name: string,
  definition: (self: C) => C
): RecursiveType<C, A, O> => {
  let cache: C
  const runDefinition = (): C => {
    if (!cache) {
      cache = definition(Self)
      ;(cache as any).name = name
    }
    return cache
  }
  const Self: any = new RecursiveType<C, A, O>(
    name,
    (u, c) => runDefinition().validate(u, c),
    (a) => runDefinition().encode(a),
    runDefinition
  )
  return Self
}

export class InterfaceType<P, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "InterfaceType" = "InterfaceType"
  constructor(
    name: string,
    validate: InterfaceType<P, A, O>["validate"],
    encode: InterfaceType<P, A, O>["encode"],
    readonly props: P
  ) {
    super(name, validate, encode)
  }
}

export interface AnyProps {
  [key: string]: Any
}

const getNameFromProps = (props: Props): string =>
  Object.keys(props)
    .map((k) => `${k}: ${props[k].name}`)
    .join(", ")

const useIdentity = (codecs: Array<Any>): boolean => {
  for (let i = 0; i < codecs.length; i++) {
    if (codecs[i].encode !== identity) {
      return false
    }
  }
  return true
}

export type TypeOfProps<P extends AnyProps> = { [K in keyof P]: TypeOf<P[K]> }

export type OutputOfProps<P extends AnyProps> = { [K in keyof P]: OutputOf<P[K]> }

export interface Props {
  [key: string]: Any
}
export interface TypeC<P extends Props>
  extends InterfaceType<
    P,
    { [K in keyof P]: TypeOf<P[K]> },
    { [K in keyof P]: OutputOf<P[K]> }
  > {}

const getInterfaceTypeName = (props: Props): string => {
  return `{ ${getNameFromProps(props)} }`
}

export const type = <P extends Props>(
  props: P,
  name: string = getInterfaceTypeName(props)
): TypeC<P> => {
  const keys = Object.keys(props)
  const types = keys.map((key) => props[key])
  const len = keys.length
  return new InterfaceType(
    name,
    (u, c) => {
      const e = UnknownRecord.validate(u, c)
      if (E.isLeft(e)) {
        return e
      }
      const o = e.right
      let a = o
      const errors: Errors = []
      for (let i = 0; i < len; i++) {
        const k = keys[i]
        const ak = a[k]
        const type = types[i]
        const result = type.validate(ak, appendContext(c, k, type, ak))
        if (E.isLeft(result)) {
          pushAll(errors, result.left)
        } else {
          const vak = result.right
          if (vak !== ak || (vak === undefined && !hasOwnProperty.call(a, k))) {
            /* istanbul ignore next */
            if (a === o) {
              a = { ...o }
            }
            a[k] = vak
          }
        }
      }
      return errors.length > 0 ? failures(errors) : success(a as any)
    },
    useIdentity(types)
      ? identity
      : (a) => {
          const s: { [x: string]: any } = { ...a }
          for (let i = 0; i < len; i++) {
            const k = keys[i]
            const encode = types[i].encode
            if (encode !== identity) {
              s[k] = encode(a[k])
            }
          }
          return s as any
        },
    props
  )
}

export class PartialType<P, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "PartialType" = "PartialType"
  constructor(
    name: string,
    validate: PartialType<P, A, O>["validate"],
    encode: PartialType<P, A, O>["encode"],
    readonly props: P
  ) {
    super(name, validate, encode)
  }
}

export type TypeOfPartialProps<P extends AnyProps> = { [K in keyof P]?: TypeOf<P[K]> }

export type OutputOfPartialProps<P extends AnyProps> = {
  [K in keyof P]?: OutputOf<P[K]>
}

export interface PartialC<P extends Props>
  extends PartialType<
    P,
    { [K in keyof P]?: TypeOf<P[K]> },
    { [K in keyof P]?: OutputOf<P[K]> }
  > {}

const getPartialTypeName = (inner: string): string => {
  return `Partial<${inner}>`
}

export const partial = <P extends Props>(
  props: P,
  name: string = getPartialTypeName(getInterfaceTypeName(props))
): PartialC<P> => {
  const keys = Object.keys(props)
  const types = keys.map((key) => props[key])
  const len = keys.length
  return new PartialType(
    name,
    (u, c) => {
      const e = UnknownRecord.validate(u, c)
      if (E.isLeft(e)) {
        return e
      }
      const o = e.right
      let a = o
      const errors: Errors = []
      for (let i = 0; i < len; i++) {
        const k = keys[i]
        const ak = a[k]
        const type = props[k]
        const result = type.validate(ak, appendContext(c, k, type, ak))
        if (E.isLeft(result)) {
          if (ak !== undefined) {
            pushAll(errors, result.left)
          }
        } else {
          const vak = result.right
          if (vak !== ak) {
            /* istanbul ignore next */
            if (a === o) {
              a = { ...o }
            }
            a[k] = vak
          }
        }
      }
      return errors.length > 0 ? failures(errors) : success(a as any)
    },
    useIdentity(types)
      ? identity
      : (a) => {
          const s: { [key: string]: any } = { ...a }
          for (let i = 0; i < len; i++) {
            const k = keys[i]
            const ak = a[k]
            if (ak !== undefined) {
              s[k] = types[i].encode(ak)
            }
          }
          return s as any
        },
    props
  )
}

export class DictionaryType<D extends Any, C extends Any, A = any, O = A> extends Codec<
  A,
  O
> {
  readonly _tag: "DictionaryType" = "DictionaryType"
  constructor(
    name: string,
    validate: DictionaryType<D, C, A, O>["validate"],
    encode: DictionaryType<D, C, A, O>["encode"],
    readonly domain: D,
    readonly codomain: C
  ) {
    super(name, validate, encode)
  }
}

export type TypeOfDictionary<D extends Any, C extends Any> = {
  [K in TypeOf<D>]: TypeOf<C>
}

export type OutputOfDictionary<D extends Any, C extends Any> = {
  [K in OutputOf<D>]: OutputOf<C>
}

export interface RecordC<D extends Any, C extends Any>
  extends DictionaryType<
    D,
    C,
    { [K in TypeOf<D>]: TypeOf<C> },
    { [K in OutputOf<D>]: OutputOf<C> }
  > {}

function enumerableRecord<D extends Any, C extends Any>(
  keys: Array<string>,
  domain: D,
  codomain: C,
  name = `{ [K in ${domain.name}]: ${codomain.name} }`
): RecordC<D, C> {
  const len = keys.length
  return new DictionaryType(
    name,
    (u, c) => {
      const e = UnknownRecord.validate(u, c)
      if (E.isLeft(e)) {
        return e
      }
      const o = e.right
      const a: { [key: string]: any } = {}
      const errors: Errors = []
      let changed = false
      for (let i = 0; i < len; i++) {
        const k = keys[i]
        const ok = o[k]
        const codomainResult = codomain.validate(ok, appendContext(c, k, codomain, ok))
        if (E.isLeft(codomainResult)) {
          pushAll(errors, codomainResult.left)
        } else {
          const vok = codomainResult.right
          changed = changed || vok !== ok
          a[k] = vok
        }
      }
      return errors.length > 0
        ? failures(errors)
        : success((changed || Object.keys(o).length !== len ? a : o) as any)
    },
    codomain.encode === identity
      ? identity
      : (a: any) => {
          const s: { [key: string]: any } = {}
          for (let i = 0; i < len; i++) {
            const k = keys[i]
            s[k] = codomain.encode(a[k])
          }
          return s as any
        },
    domain,
    codomain
  )
}

/**
 * @internal
 */
export function getDomainKeys<D extends Any>(
  domain: D
): Record<string, unknown> | undefined {
  if (isLiteralC(domain)) {
    const literal = domain.value
    if (isString(literal)) {
      return { [literal]: null }
    }
  } else if (isKeyofC(domain)) {
    return domain.keys
  } else if (isUnionC(domain)) {
    const keys = domain.types.map((type) => getDomainKeys(type))
    return keys.some((u) => u === void 0) ? undefined : Object.assign({}, ...keys)
  }
  return undefined
}

function nonEnumerableRecord<D extends Any, C extends Any>(
  domain: D,
  codomain: C,
  name = `{ [K in ${domain.name}]: ${codomain.name} }`
): RecordC<D, C> {
  return new DictionaryType(
    name,
    (u, c) => {
      if (UnknownRecord.is(u)) {
        const a: { [key: string]: any } = {}
        const errors: Errors = []
        const keys = Object.keys(u)
        const len = keys.length
        let changed = false
        for (let i = 0; i < len; i++) {
          let k = keys[i]
          const ok = u[k]
          const domainResult = domain.validate(k, appendContext(c, k, domain, k))
          if (E.isLeft(domainResult)) {
            pushAll(errors, domainResult.left)
          } else {
            const vk = domainResult.right
            changed = changed || vk !== k
            k = vk
            const codomainResult = codomain.validate(
              ok,
              appendContext(c, k, codomain, ok)
            )
            if (E.isLeft(codomainResult)) {
              pushAll(errors, codomainResult.left)
            } else {
              const vok = codomainResult.right
              changed = changed || vok !== ok
              a[k] = vok
            }
          }
        }
        return errors.length > 0 ? failures(errors) : success((changed ? a : u) as any)
      }
      if (isAnyC(codomain) && Array.isArray(u)) {
        return success(u)
      }
      return failure(u, c)
    },
    domain.encode === identity && codomain.encode === identity
      ? identity
      : (a) => {
          const s: { [key: string]: any } = {}
          const keys = Object.keys(a)
          const len = keys.length
          for (let i = 0; i < len; i++) {
            const k = keys[i]
            s[String(domain.encode(k))] = codomain.encode(a[k])
          }
          return s as any
        },
    domain,
    codomain
  )
}

export function record<D extends Any, C extends Any>(
  domain: D,
  codomain: C,
  name?: string
): RecordC<D, C> {
  const keys = getDomainKeys(domain)
  return keys
    ? enumerableRecord(Object.keys(keys), domain, codomain, name)
    : nonEnumerableRecord(domain, codomain, name)
}

export class UnionType<CS extends Array<Any>, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "UnionType" = "UnionType"
  constructor(
    name: string,
    validate: UnionType<CS, A, O>["validate"],
    encode: UnionType<CS, A, O>["encode"],
    readonly types: CS
  ) {
    super(name, validate, encode)
  }
}

export interface UnionC<CS extends [Any, Any, ...Array<Any>]>
  extends UnionType<CS, TypeOf<CS[number]>, OutputOf<CS[number]>> {}

const getUnionName = <CS extends [Any, Any, ...Array<Any>]>(codecs: CS): string => {
  return "(" + codecs.map((type) => type.name).join(" | ") + ")"
}

export const union = <CS extends [Any, Any, ...Array<Any>]>(
  codecs: CS,
  name: string = getUnionName(codecs)
): UnionC<CS> => {
  const index = getIndex(codecs)
  if (index !== undefined && codecs.length > 0) {
    const [tag, groups] = index
    const len = groups.length
    const find = (value: any): number | undefined => {
      for (let i = 0; i < len; i++) {
        if (groups[i].indexOf(value) !== -1) {
          return i
        }
      }
      return undefined
    }
    return new TaggedUnionType(
      name,
      (u, c) => {
        const e = UnknownRecord.validate(u, c)
        if (E.isLeft(e)) {
          return e
        }
        const r = e.right
        const i = find(r[tag])
        if (i === undefined) {
          return failure(u, c)
        }
        const codec = codecs[i]
        return codec.validate(r, appendContext(c, String(i), codec, r))
      },
      useIdentity(codecs)
        ? identity
        : (a) => {
            const i = find(a[tag])
            if (i === undefined) {
              throw new Error(`no codec found to encode value in union codec ${name}`)
            } else {
              return codecs[i].encode(a)
            }
          },
      codecs,
      tag
    )
  } else {
    throw new Error("Union only supports Tagged Unions")
  }
}

export class IntersectionType<CS extends Array<Any>, A = any, O = A> extends Codec<
  A,
  O
> {
  readonly _tag: "IntersectionType" = "IntersectionType"
  constructor(
    name: string,
    validate: IntersectionType<CS, A, O>["validate"],
    encode: IntersectionType<CS, A, O>["encode"],
    readonly types: CS
  ) {
    super(name, validate, encode)
  }
}

export interface IntersectionC<CS extends [Any, Any, ...Array<Any>]>
  extends IntersectionType<
    CS,
    CS extends { length: 2 }
      ? TypeOf<CS[0]> & TypeOf<CS[1]>
      : CS extends { length: 3 }
      ? TypeOf<CS[0]> & TypeOf<CS[1]> & TypeOf<CS[2]>
      : CS extends { length: 4 }
      ? TypeOf<CS[0]> & TypeOf<CS[1]> & TypeOf<CS[2]> & TypeOf<CS[3]>
      : CS extends { length: 5 }
      ? TypeOf<CS[0]> & TypeOf<CS[1]> & TypeOf<CS[2]> & TypeOf<CS[3]> & TypeOf<CS[4]>
      : unknown,
    CS extends { length: 2 }
      ? OutputOf<CS[0]> & OutputOf<CS[1]>
      : CS extends { length: 3 }
      ? OutputOf<CS[0]> & OutputOf<CS[1]> & OutputOf<CS[2]>
      : CS extends { length: 4 }
      ? OutputOf<CS[0]> & OutputOf<CS[1]> & OutputOf<CS[2]> & OutputOf<CS[3]>
      : CS extends { length: 5 }
      ? OutputOf<CS[0]> &
          OutputOf<CS[1]> &
          OutputOf<CS[2]> &
          OutputOf<CS[3]> &
          OutputOf<CS[4]>
      : unknown
  > {}

const mergeAll = (base: any, us: Array<any>): any => {
  let equal = true
  let primitive = true
  for (const u of us) {
    if (u !== base) {
      equal = false
    }
    if (UnknownRecord.is(u)) {
      primitive = false
    }
  }
  if (equal) {
    return base
  } else if (primitive) {
    return us[us.length - 1]
  }
  const r: any = {}
  for (const u of us) {
    for (const k in u) {
      if (u[k] !== base[k] || !r.hasOwnProperty(k)) {
        r[k] = u[k]
      }
    }
  }
  return r
}

export function intersection<
  A extends Any,
  B extends Any,
  C extends Any,
  D extends Any,
  E extends Any
>(codecs: [A, B, C, D, E], name?: string): IntersectionC<[A, B, C, D, E]>
export function intersection<
  A extends Any,
  B extends Any,
  C extends Any,
  D extends Any
>(codecs: [A, B, C, D], name?: string): IntersectionC<[A, B, C, D]>
export function intersection<A extends Any, B extends Any, C extends Any>(
  codecs: [A, B, C],
  name?: string
): IntersectionC<[A, B, C]>
export function intersection<A extends Any, B extends Any>(
  codecs: [A, B],
  name?: string
): IntersectionC<[A, B]>
export function intersection<CS extends [Any, Any, ...Array<Any>]>(
  codecs: CS,
  name = `(${codecs.map((type) => type.name).join(" & ")})`
): IntersectionC<CS> {
  const len = codecs.length
  return new IntersectionType(
    name,
    codecs.length === 0
      ? success
      : (u, c) => {
          const us: Array<unknown> = []
          const errors: Errors = []
          for (let i = 0; i < len; i++) {
            const codec = codecs[i]
            const result = codec.validate(u, appendContext(c, String(i), codec, u))
            if (E.isLeft(result)) {
              pushAll(errors, result.left)
            } else {
              us.push(result.right)
            }
          }
          return errors.length > 0 ? failures(errors) : success(mergeAll(u, us))
        },
    codecs.length === 0
      ? identity
      : (a) =>
          mergeAll(
            a,
            codecs.map((codec) => codec.encode(a))
          ),
    codecs
  )
}

export const strict = <P extends Props>(props: P, name?: string): ExactC<TypeC<P>> => {
  return exact(type(props), name)
}

export class TaggedUnionType<
  Tag extends string,
  CS extends Array<Any>,
  A = any,
  O = A
> extends UnionType<CS, A, O> {
  constructor(
    name: string,
    validate: TaggedUnionType<Tag, CS, A, O>["validate"],
    encode: TaggedUnionType<Tag, CS, A, O>["encode"],
    codecs: CS,
    readonly tag: Tag
  ) {
    super(name, validate, encode, codecs)
  }
}

export interface TaggedUnionC<Tag extends string, CS extends [Any, Any, ...Array<Any>]>
  extends TaggedUnionType<Tag, CS, TypeOf<CS[number]>, OutputOf<CS[number]>> {}

export class ExactType<C extends Any, A = any, O = A, I = unknown> extends Codec<A, O> {
  readonly _tag: "ExactType" = "ExactType"
  constructor(
    name: string,
    validate: ExactType<C, A, O, I>["validate"],
    encode: ExactType<C, A, O, I>["encode"],
    readonly type: C
  ) {
    super(name, validate, encode)
  }
}

export interface HasPropsRefinement extends RefinementType<HasProps, any, any> {}

export interface HasPropsIntersection
  extends IntersectionType<Array<HasProps>, any, any> {}

export type HasProps =
  | HasPropsRefinement
  | HasPropsIntersection
  | InterfaceType<any, any, any>
  | StrictType<any, any, any>
  | PartialType<any, any, any>

const getProps = (codec: HasProps): Props => {
  switch (codec._tag) {
    case "RefinementType":
      return getProps(codec.type)
    case "InterfaceType":
    case "StrictType":
    case "PartialType":
      return codec.props
    case "IntersectionType":
      return codec.types.reduce<Props>(
        (props, type) => Object.assign(props, getProps(type)),
        {}
      )
  }
}

export interface ExactC<C extends HasProps>
  extends ExactType<C, TypeOf<C>, OutputOf<C>> {}

const stripKeys = (o: any, props: Props): unknown => {
  const keys = Object.getOwnPropertyNames(o)
  let shouldStrip = false
  const r: any = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!hasOwnProperty.call(props, key)) {
      shouldStrip = true
    } else {
      r[key] = o[key]
    }
  }
  return shouldStrip ? r : o
}

const stripKeysP = (o: any, props: Props): [boolean, unknown] => {
  const keys = Object.getOwnPropertyNames(o)
  let shouldStrip = false
  const r: any = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!hasOwnProperty.call(props, key)) {
      shouldStrip = true
    } else {
      r[key] = o[key]
    }
  }
  return [shouldStrip, shouldStrip ? r : o]
}

const getExactTypeName = (codec: Any): string => {
  if (isTypeC(codec)) {
    return `{| ${getNameFromProps(codec.props)} |}`
  } else if (isPartialC(codec)) {
    return getPartialTypeName(`{| ${getNameFromProps(codec.props)} |}`)
  }
  return `Exact<${codec.name}>`
}

export const exact = <C extends HasProps>(
  codec: C,
  name: string = getExactTypeName(codec)
): ExactC<C> => {
  const props: Props = getProps(codec)
  return new ExactType(
    name,
    (u, c) => {
      const e = UnknownRecord.validate(u, c)
      if (E.isLeft(e)) {
        return e
      }
      const ce = codec.validate(u, c)
      if (E.isLeft(ce)) {
        return ce
      }
      return E.right(stripKeys(ce.right, props))
    },
    (a) => codec.encode(stripKeys(a, props)),
    codec
  )
}

export const precise = <C extends HasProps>(
  codec: C,
  name: string = getExactTypeName(codec)
): ExactC<C> => {
  const props: Props = getProps(codec)
  return new ExactType(
    name,
    (u, c) => {
      const e = UnknownRecord.validate(u, c)
      if (E.isLeft(e)) {
        return e
      }
      const ce = codec.validate(u, c)
      if (E.isLeft(ce)) {
        return ce
      }

      const [stripped, o] = stripKeysP(ce.right, props)

      if (stripped) {
        return failure(u, c)
      }

      return E.right(o)
    },
    (a) => codec.encode(stripKeys(a, props)),
    codec
  )
}

export const getValidationError = (
  value: unknown,
  context: Context
): ValidationError => ({
  value,
  context
})

export const getDefaultContext = (decoder: Decoder<any>): Context => [
  { key: "", type: decoder }
]

export class AnyType extends Codec<any> {
  readonly _tag: "AnyType" = "AnyType"
  constructor() {
    super("any", success, identity)
  }
}

export interface AnyC extends AnyType {}

export const any: AnyC =
  /*#__PURE__*/
  (() => new AnyType())()

export function refinement<A, O, B extends A>(
  codec: Codec<A, O>,
  refinement: Refinement<A, B>,
  name = `refinment(${codec.name})`
): Codec<B, O> {
  return new Codec(
    name,
    (u, c) =>
      E.chain_(codec.validate(u, c), (a) =>
        refinement(a) ? success(a) : failure(u, c)
      ),
    (a) => codec.encode(a)
  )
}

export function iso<A, O, B>(
  codec: Codec<A, O>,
  iso: Iso<A, B>,
  name = `iso(${codec.name})`
): Codec<B, O> {
  return new Codec(
    name,
    (u, c) => E.map_(codec.validate(u, c), iso.get),
    (a) => codec.encode(iso.reverseGet(a))
  )
}

export function prism<A, O, B>(
  codec: Codec<A, O>,
  iso: Prism<A, B>,
  name = `prism(${codec.name})`
): Codec<B, O> {
  return new Codec(
    name,
    (u, c) =>
      E.chain_(codec.validate(u, c), (x) =>
        introduce(iso.getOption(x))((ob) =>
          ob._tag === "None" ? failure(u, c) : success(ob.value)
        )
      ),
    (a) => codec.encode(iso.reverseGet(a))
  )
}

export class StrictType<P, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "StrictType" = "StrictType"
  constructor(
    name: string,
    validate: StrictType<P, A, O>["validate"],
    encode: StrictType<P, A, O>["encode"],
    readonly props: P
  ) {
    super(name, validate, encode)
  }
}

export interface StrictC<P extends Props>
  extends StrictType<
    P,
    { [K in keyof P]: TypeOf<P[K]> },
    { [K in keyof P]: OutputOf<P[K]> }
  > {}

export type TaggedProps<Tag extends string> = { [K in Tag]: LiteralType<any> }

export interface TaggedRefinement<Tag extends string, A, O = A>
  extends RefinementType<Tagged<Tag>, A, O> {}

export interface TaggedUnion<Tag extends string, A, O = A>
  extends UnionType<Array<Tagged<Tag>>, A, O> {}

export type TaggedIntersectionArgument<Tag extends string> =
  | [Tagged<Tag>]
  | [Tagged<Tag>, Any]
  | [Any, Tagged<Tag>]
  | [Tagged<Tag>, Any, Any]
  | [Any, Tagged<Tag>, Any]
  | [Any, Any, Tagged<Tag>]
  | [Tagged<Tag>, Any, Any, Any]
  | [Any, Tagged<Tag>, Any, Any]
  | [Any, Any, Tagged<Tag>, Any]
  | [Any, Any, Any, Tagged<Tag>]
  | [Tagged<Tag>, Any, Any, Any, Any]
  | [Any, Tagged<Tag>, Any, Any, Any]
  | [Any, Any, Tagged<Tag>, Any, Any]
  | [Any, Any, Any, Tagged<Tag>, Any]
  | [Any, Any, Any, Any, Tagged<Tag>]

export interface TaggedIntersection<Tag extends string, A, O = A>
  extends IntersectionType<TaggedIntersectionArgument<Tag>, A, O> {}

export interface TaggedExact<Tag extends string, A, O = A>
  extends ExactType<Tagged<Tag>, A, O> {}

export type Tagged<Tag extends string, A = any, O = A> =
  | InterfaceType<TaggedProps<Tag>, A, O>
  | StrictType<TaggedProps<Tag>, A, O>
  | TaggedRefinement<Tag, A, O>
  | TaggedUnion<Tag, A, O>
  | TaggedIntersection<Tag, A, O>
  | TaggedExact<Tag, A, O>
  | RecursiveType<any, A, O>

export function clean<A, O = A>(codec: Codec<A, O>): Codec<A, O> {
  return codec as any
}

export type PropsOf<T extends { props: any }> = T["props"]

export type Exact<T, X extends T> = T &
  {
    [K in ({ [K in keyof X]: K } &
      { [K in keyof T]: never } & { [key: string]: never })[keyof X]]?: never
  }

export function alias<A, O, P>(
  codec: PartialType<P, A, O>
): <
  AA extends Exact<A, AA>,
  OO extends Exact<O, OO> = O,
  PP extends Exact<P, PP> = P
>() => PartialType<PP, AA, OO>
export function alias<A, O, P>(
  codec: StrictType<P, A, O>
): <
  AA extends Exact<A, AA>,
  OO extends Exact<O, OO> = O,
  PP extends Exact<P, PP> = P
>() => StrictType<PP, AA, OO>
export function alias<A, O, P>(
  codec: InterfaceType<P, A, O>
): <
  AA extends Exact<A, AA>,
  OO extends Exact<O, OO> = O,
  PP extends Exact<P, PP> = P
>() => InterfaceType<PP, AA, OO>
export function alias<A, O>(
  codec: Codec<A, O>
): <AA extends Exact<A, AA>, OO extends Exact<O, OO> = O>() => Codec<AA, OO> {
  return () => codec as any
}

interface NonEmptyArray<A> extends Array<A> {
  0: A
}

const isNonEmpty = <A>(as: Array<A>): as is NonEmptyArray<A> => as.length > 0

interface Tags extends Record<string, NonEmptyArray<LiteralValue>> {}

export const emptyTags: Tags = {}

function intersect(
  a: NonEmptyArray<LiteralValue>,
  b: NonEmptyArray<LiteralValue>
): Array<LiteralValue> {
  const r: Array<LiteralValue> = []
  for (const v of a) {
    if (b.indexOf(v) !== -1) {
      r.push(v)
    }
  }
  return r
}

function mergeTags(a: Tags, b: Tags): Tags {
  if (a === emptyTags) {
    return b
  }
  if (b === emptyTags) {
    return a
  }
  let r: Tags = Object.assign({}, a)
  for (const k in b) {
    if (a.hasOwnProperty(k)) {
      const intersection = intersect(a[k], b[k])
      if (isNonEmpty(intersection)) {
        r[k] = intersection
      } else {
        r = emptyTags
        break
      }
    } else {
      r[k] = b[k]
    }
  }
  return r
}

function intersectTags(a: Tags, b: Tags): Tags {
  if (a === emptyTags || b === emptyTags) {
    return emptyTags
  }
  let r: Tags = emptyTags
  for (const k in a) {
    if (b.hasOwnProperty(k)) {
      const intersection = intersect(a[k], b[k])
      if (intersection.length === 0) {
        if (r === emptyTags) {
          r = {}
        }
        r[k] = a[k].concat(b[k]) as any
      }
    }
  }
  return r
}

function isAnyC(codec: Any): codec is AnyC {
  return (codec as any)._tag === "AnyType"
}

function isLiteralC(codec: Any): codec is LiteralC<LiteralValue> {
  return (codec as any)._tag === "LiteralType"
}

function isKeyofC(codec: Any): codec is KeyofC<Record<string, unknown>> {
  return (codec as any)._tag === "KeyofType"
}

function isTypeC(codec: Any): codec is TypeC<Props> {
  return (codec as any)._tag === "InterfaceType"
}

function isPartialC(codec: Any): codec is PartialC<Props> {
  return (codec as any)._tag === "PartialType"
}

function isStrictC(codec: Any): codec is StrictC<Props> {
  return (codec as any)._tag === "StrictType"
}

function isExactC(codec: Any): codec is ExactC<HasProps> {
  return (codec as any)._tag === "ExactType"
}

function isRefinementC(codec: Any): codec is RefinementC<Any> {
  return (codec as any)._tag === "RefinementType"
}

function isIntersectionC(
  codec: Any
): codec is IntersectionC<[Any, Any, ...Array<Any>]> {
  return (codec as any)._tag === "IntersectionType"
}

function isUnionC(codec: Any): codec is UnionC<[Any, Any, ...Array<Any>]> {
  return (codec as any)._tag === "UnionType"
}

function isRecursiveC(codec: Any): codec is RecursiveType<Any> {
  return (codec as any)._tag === "RecursiveType"
}

const lazyCodecs: Array<Any> = []

export function getTags(codec: Any): Tags {
  if (lazyCodecs.indexOf(codec) !== -1) {
    return emptyTags
  }
  if (isTypeC(codec) || isStrictC(codec)) {
    let index: Tags = emptyTags
    for (const k in codec.props) {
      const prop = codec.props[k]
      if (isLiteralC(prop)) {
        if (index === emptyTags) {
          index = {}
        }
        index[k] = [prop.value]
      }
    }
    return index
  } else if (isExactC(codec) || isRefinementC(codec)) {
    return getTags(codec.type)
  } else if (isIntersectionC(codec)) {
    return codec.types.reduce(
      (tags, codec) => mergeTags(tags, getTags(codec)),
      emptyTags
    )
  } else if (isUnionC(codec)) {
    return codec.types
      .slice(1)
      .reduce(
        (tags, codec) => intersectTags(tags, getTags(codec)),
        getTags(codec.types[0])
      )
  } else if (isRecursiveC(codec)) {
    lazyCodecs.push(codec)
    const tags = getTags(codec.type)
    lazyCodecs.pop()
    return tags
  }
  return emptyTags
}

export function getIndex(
  codecs: NonEmptyArray<Any>
): [string, NonEmptyArray<NonEmptyArray<LiteralValue>>] | undefined {
  const tags = getTags(codecs[0])
  const keys = Object.keys(tags)
  const len = codecs.length
  keys: for (const k of keys) {
    const all = tags[k].slice()
    const index: NonEmptyArray<NonEmptyArray<LiteralValue>> = [tags[k]]
    for (let i = 1; i < len; i++) {
      const codec = codecs[i]
      const ctags = getTags(codec)
      const values = ctags[k]
      if (values === undefined) {
        continue keys
      } else {
        if (values.some((v) => all.indexOf(v) !== -1)) {
          continue keys
        } else {
          all.push(...values)
          index.push(values)
        }
      }
    }
    return [k, index]
  }
  return undefined
}

export interface DateFromISOStringC extends Codec<Date, string> {}

export const DateFromISOString: DateFromISOStringC =
  /*#__PURE__*/
  (() =>
    new Codec<Date, string>(
      "DateFromISOString",
      (u, c) =>
        E.chain_(string.validate(u, c), (s) => {
          const d = new Date(s)
          return isNaN(d.getTime()) ? failure(u, c) : success(d)
        }),
      (a) => a.toISOString()
    ))()

const leftLiteral =
  /*#__PURE__*/
  (() => literal("Left"))()

const rightLiteral =
  /*#__PURE__*/
  (() => literal("Right"))()

export interface EitherC<L extends Any, R extends Any>
  extends Codec<E.Either<TypeOf<L>, TypeOf<R>>, E.Either<OutputOf<L>, OutputOf<R>>> {}

export function either<L extends Any, R extends Any>(
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

const None =
  /*#__PURE__*/
  (() =>
    strict({
      _tag: literal("None")
    }))()

const someLiteral =
  /*#__PURE__*/
  (() => literal("Some"))()

export interface OptionC<C extends Any>
  extends Codec<O.Option<TypeOf<C>>, O.Option<OutputOf<C>>> {}

export function option<C extends Any>(
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

export interface OptionFromNullableC<C extends Any>
  extends Codec<O.Option<TypeOf<C>>, OutputOf<C> | null> {}

export function optionFromNullable<C extends Any>(
  codec: C,
  name = `Option<${codec.name}>`
): OptionFromNullableC<C> {
  return new Codec(
    name,
    (u, c) => (u == null ? success(O.none) : E.map_(codec.validate(u, c), O.some)),
    (a) => O.toNullable(O.map_(a, codec.encode))
  )
}

export interface NonRequiredC<C extends Any>
  extends Codec<TypeOf<C> | undefined, OutputOf<C> | undefined> {}

export function nonRequired<C extends Any>(
  codec: C,
  name = `NonRequired<${codec.name}>`
): NonRequiredC<C> {
  return new Codec(
    name,
    (u, c) => (typeof u === "undefined" ? success(undefined) : codec.validate(u, c)),
    (a) => (typeof a === "undefined" ? undefined : codec.encode(a))
  )
}

export class ArrayType<C extends Any, A = any, O = A> extends Codec<A, O> {
  readonly _tag: "ArrayType" = "ArrayType"
  constructor(
    name: string,
    validate: ArrayType<C, A, O>["validate"],
    encode: ArrayType<C, A, O>["encode"],
    readonly type: C
  ) {
    super(name, validate, encode)
  }
}

export interface ArrayC<C extends Any>
  extends ArrayType<C, A.Array<TypeOf<C>>, A.Array<OutputOf<C>>> {}

export const array = <C extends Any>(
  codec: C,
  name = `Array<${codec.name}>`
): ArrayC<C> =>
  new ArrayType(
    name,
    (u, c) => {
      const e = UnknownArray.validate(u, c)
      if (E.isLeft(e)) {
        return e
      }
      const us = e.right
      const len = us.length
      let as: Array<TypeOf<C>> = us
      const errors: Errors = []
      for (let i = 0; i < len; i++) {
        const ui = us[i]
        const result = codec.validate(ui, appendContext(c, String(i), codec, ui))
        if (E.isLeft(result)) {
          pushAll(errors, result.left)
        } else {
          const ai = result.right
          if (ai !== ui) {
            if (as === us) {
              as = us.slice()
            }
            as[i] = ai
          }
        }
      }
      return errors.length > 0 ? failures(errors) : success(as)
    },
    codec.encode === identity ? identity : (a) => a.map(codec.encode),
    codec
  )

export interface NonEmptyArrayC<C extends Any>
  extends Codec<NEA.NonEmptyArray<TypeOf<C>>, A.Array<OutputOf<C>>> {}

export function nonEmptyArray<C extends Any>(
  codec: C,
  name = `NonEmptyArray<${codec.name}>`
): NonEmptyArrayC<C> {
  const arr = array(codec)
  return new Codec(
    name,
    (u, c) =>
      E.chain_(arr.validate(u, c), (as) => {
        const onea = NEA.fromArray(as)
        return O.isNone(onea) ? failure(u, c) : success(onea.value)
      }),
    (nea) => arr.encode(nea)
  )
}

export interface SetFromArrayC<C extends Any>
  extends Codec<S.Set<TypeOf<C>>, A.Array<OutputOf<C>>> {}

export function setFromArray<C extends Any>(
  codec: C,
  O: Ord<TypeOf<C>>,
  name = `Set<${codec.name}>`
): SetFromArrayC<C> {
  const arr = array(codec)
  const toArrayO = S.toArray(O)
  const fromArrayO = S.fromArray(O)
  return new Codec(
    name,
    (u, c) =>
      E.chain_(arr.validate(u, c), (as) => {
        const set = fromArrayO(as)
        return set.size !== as.length ? failure(u, c) : success(set)
      }),
    (set) => arr.encode(toArrayO(set))
  )
}

export interface BigIntStringC extends Codec<bigint, string> {}

export const BigIntString: BigIntStringC =
  /*#__PURE__*/
  (() =>
    new Codec<bigint, string>(
      "BigIntString",
      (u, c) =>
        E.chain_(string.validate(u, c), (s) => {
          try {
            const d = BigInt(s)
            return success(d)
          } catch {
            return failure(u, c)
          }
        }),
      (a) => a.toString(10)
    ))()

export function clone<C extends Any>(t: C): C {
  const r = Object.create(Object.getPrototypeOf(t))
  Object.assign(r, t)
  return r
}

export function withName<C extends Any>(name?: string): (codec: C) => C {
  return (c) => {
    const n: any = clone(c)

    if (name) {
      n.name = name
    }

    return n
  }
}

export function withMessage<C extends Any>(
  message: (i: unknown) => string
): (codec: C) => C {
  return (codec) =>
    withValidate_(codec, (i, c) =>
      E.mapLeft_(codec.validate(i, c), () => [
        {
          value: i,
          context: c,
          message: message(i),
          actual: i
        }
      ])
    )
}

export function withFirstMessage<C extends Any>(
  message: (i: unknown) => string
): (codec: C) => C {
  return (codec) =>
    withValidate_(codec, (i, c) =>
      E.mapLeft_(codec.validate(i, c), (e) => [
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
  message: (i: unknown) => string
): C {
  return withValidate_(codec, (i, c) =>
    E.mapLeft_(codec.validate(i, c), () => [
      {
        value: i,
        context: c,
        message: message(i),
        actual: i
      }
    ])
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

function stringify(v: any): string {
  if (typeof v === "function") {
    return getFunctionName(v)
  }
  if (typeof v === "number" && !isFinite(v)) {
    if (isNaN(v)) {
      return "NaN"
    }
    return v > 0 ? "Infinity" : "-Infinity"
  }
  return JSON.stringify(v)
}

function getContextPath(context: Context): string {
  return context.map(({ key, type }) => `${key}: ${type.name}`).join("/")
}

function getMessage(e: ValidationError): string {
  return e.message !== undefined
    ? e.message
    : `Invalid value ${stringify(e.value)} supplied to ${getContextPath(e.context)}`
}

export function reportFailure(es: Array<ValidationError>): Array<string> {
  return es.map(getMessage)
}

const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const uuid =
  /*#__PURE__*/
  (() => brand(string, (s): s is UUID => regex.test(s), "UUID"))()

export type { UUID, Branded }

/**
 * @since 1.0.0
 */
import type { Brand } from "effect/Brand"
import type * as Effect from "effect/Effect"
import { constUndefined, dual } from "effect/Function"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import * as Struct_ from "effect/Struct"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/experimental/VariantSchema")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

const cacheSymbol = Symbol.for("@effect/experimental/VariantSchema/cache")

/**
 * @since 1.0.0
 * @category models
 */
export interface Struct<in out A extends Field.Fields> extends Pipeable {
  readonly [TypeId]: A
  /** @internal */
  [cacheSymbol]?: Record<string, Schema.Schema.All>
}

/**
 * @since 1.0.0
 * @category guards
 */
export const isStruct = (u: unknown): u is Struct<any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Struct {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = { readonly [TypeId]: any }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Fields = {
    readonly [key: string]:
      | Schema.Schema.All
      | Schema.PropertySignature.All
      | Field<any>
      | Struct<any>
      | undefined
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Validate<A, Variant extends string> = {
    readonly [K in keyof A]: A[K] extends { readonly [TypeId]: infer _ } ? Validate<A[K], Variant> :
      A[K] extends Field<infer Config> ? [keyof Config] extends [Variant] ? {} : "field must have valid variants"
      : {}
  }
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const FieldTypeId: unique symbol = Symbol.for(
  "@effect/experimental/VariantSchema/Field"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export type FieldTypeId = typeof FieldTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Field<in out A extends Field.Config> extends Pipeable {
  readonly [FieldTypeId]: FieldTypeId
  readonly schemas: A
}

/**
 * @since 1.0.0
 * @category guards
 */
export const isField = (u: unknown): u is Field<any> => Predicate.hasProperty(u, FieldTypeId)

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Field {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = { readonly [FieldTypeId]: FieldTypeId }

  /**
   * @since 1.0.0
   * @category models
   */
  type ValueAny = Schema.Schema.All | Schema.PropertySignature.All

  /**
   * @since 1.0.0
   * @category models
   */
  export type Config = {
    readonly [key: string]: Schema.Schema.All | Schema.PropertySignature.All | undefined
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type ConfigWithKeys<K extends string> = {
    readonly [P in K]?: Schema.Schema.All | Schema.PropertySignature.All
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Fields = {
    readonly [key: string]:
      | Schema.Schema.All
      | Schema.PropertySignature.All
      | Field<any>
      | Struct<any>
      | undefined
  }
}

/**
 * @since 1.0.0
 * @category extractors
 */
export type ExtractFields<V extends string, Fields extends Struct.Fields, IsDefault = false> = {
  readonly [
    K in keyof Fields as [Fields[K]] extends [Field<infer Config>] ? V extends keyof Config ? K
      : never
      : K
  ]: [Fields[K]] extends [Struct<infer _>] ? Extract<V, Fields[K], IsDefault>
    : [Fields[K]] extends [Field<infer Config>]
      ? [Config[V]] extends [Schema.Schema.All | Schema.PropertySignature.All] ? Config[V]
      : never
    : [Fields[K]] extends [Schema.Schema.All | Schema.PropertySignature.All] ? Fields[K]
    : never
}

/**
 * @since 1.0.0
 * @category extractors
 */
export type Extract<V extends string, A extends Struct<any>, IsDefault = false> = [A] extends [
  Struct<infer Fields>
] ?
  IsDefault extends true
    ? [A] extends [Schema.Schema.Any] ? A : Schema.Struct<Schema.Simplify<ExtractFields<V, Fields>>>
  : Schema.Struct<Schema.Simplify<ExtractFields<V, Fields>>>
  : never

const extract: {
  <V extends string, const IsDefault extends boolean = false>(
    variant: V,
    options?: {
      readonly isDefault?: IsDefault | undefined
    }
  ): <A extends Struct<any>>(self: A) => Extract<V, A, IsDefault>
  <V extends string, A extends Struct<any>, const IsDefault extends boolean = false>(self: A, variant: V, options?: {
    readonly isDefault?: IsDefault | undefined
  }): Extract<V, A, IsDefault>
} = dual(
  (args) => isStruct(args[0]),
  <V extends string, A extends Struct<any>>(
    self: A,
    variant: V,
    options?: {
      readonly isDefault?: boolean | undefined
    }
  ): Extract<V, A> => {
    const cache = self[cacheSymbol] ?? (self[cacheSymbol] = {})
    const cacheKey = options?.isDefault === true ? "__default" : variant
    if (cache[cacheKey] !== undefined) {
      return cache[cacheKey] as any
    }
    const fields: Record<string, any> = {}
    for (const key of Object.keys(self[TypeId])) {
      const value = self[TypeId][key]
      if (TypeId in value) {
        if (options?.isDefault === true && Schema.isSchema(value)) {
          fields[key] = value
        } else {
          fields[key] = extract(value, variant)
        }
      } else if (FieldTypeId in value) {
        if (variant in value.schemas) {
          fields[key] = value.schemas[variant]
        }
      } else {
        fields[key] = value
      }
    }
    return cache[cacheKey] = Schema.Struct(fields) as any
  }
)

/**
 * @category accessors
 * @since 1.0.0
 */
export const fields = <A extends Struct<any>>(self: A): A[TypeId] => self[TypeId]

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

/**
 * @since 1.0.0
 * @category models
 */
export interface Class<
  Self,
  Fields extends Struct.Fields,
  SchemaFields extends Schema.Struct.Fields,
  A,
  I,
  R,
  C
> extends Schema.Schema<Self, Schema.Simplify<I>, R>, Struct<Schema.Simplify<Fields>> {
  new(
    props: RequiredKeys<C> extends never ? void | Schema.Simplify<C>
      : Schema.Simplify<C>,
    options?: {
      readonly disableValidation?: boolean
    }
  ): A

  readonly ast: AST.Transformation

  make<Args extends Array<any>, X>(
    this: { new(...args: Args): X },
    ...args: Args
  ): X

  annotations(
    annotations: Schema.Annotations.Schema<Self>
  ): Schema.SchemaClass<Self, I, R>

  readonly identifier: string
  readonly fields: Schema.Simplify<SchemaFields>
}

type ClassFromFields<
  Self,
  Fields extends Struct.Fields,
  SchemaFields extends Schema.Struct.Fields
> = Class<
  Self,
  Fields,
  SchemaFields,
  Schema.Struct.Type<SchemaFields>,
  Schema.Struct.Encoded<SchemaFields>,
  Schema.Struct.Context<SchemaFields>,
  Schema.Struct.Constructor<SchemaFields>
>

type MissingSelfGeneric<Params extends string = ""> =
  `Missing \`Self\` generic - use \`class Self extends Class<Self>()(${Params}{ ... })\``

/**
 * @since 1.0.0
 * @category models
 */
export interface Union<Members extends ReadonlyArray<Struct<any>>> extends
  Schema.Union<
    {
      readonly [K in keyof Members]: [Members[K]] extends [Schema.Schema.All] ? Members[K] : never
    }
  >
{}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Union {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Variants<Members extends ReadonlyArray<Struct<any>>, Variants extends string> = {
    readonly [Variant in Variants]: Schema.Union<
      {
        [K in keyof Members]: Extract<Variant, Members[K]>
      }
    >
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface fromKey<S extends Schema.Schema.All, Key extends string> extends
  Schema.PropertySignature<
    ":",
    Schema.Schema.Type<S>,
    Key,
    ":",
    Schema.Schema.Encoded<S>,
    false,
    Schema.Schema.Context<S>
  >
{}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace fromKey {
  /**
   * @since 1.0.0
   */
  export type Rename<S, Key extends string> = S extends Schema.PropertySignature<
    infer _TypeToken,
    infer _Type,
    infer _Key,
    infer _EncodedToken,
    infer _Encoded,
    infer _HasDefault,
    infer _R
  > ? Schema.PropertySignature<_TypeToken, _Type, Key, _EncodedToken, _Encoded, _HasDefault, _R>
    : S extends Schema.Schema.All ? fromKey<S, Key>
    : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Variants extends ReadonlyArray<string>,
  const Default extends Variants[number]
>(options: {
  readonly variants: Variants
  readonly defaultVariant: Default
}): {
  readonly Struct: <const A extends Struct.Fields>(
    fields: A & Struct.Validate<A, Variants[number]>
  ) => Struct<A>
  readonly Field: <const A extends Field.ConfigWithKeys<Variants[number]>>(
    config: A & { readonly [K in Exclude<keyof A, Variants[number]>]: never }
  ) => Field<A>
  readonly FieldOnly: <const Keys extends ReadonlyArray<Variants[number]>>(
    ...keys: Keys
  ) => <S extends Schema.Schema.All | Schema.PropertySignature.All>(
    schema: S
  ) => Field<{ readonly [K in Keys[number]]: S }>
  readonly FieldExcept: <const Keys extends ReadonlyArray<Variants[number]>>(
    ...keys: Keys
  ) => <S extends Schema.Schema.All | Schema.PropertySignature.All>(
    schema: S
  ) => Field<{ readonly [K in Exclude<Variants[number], Keys[number]>]: S }>
  readonly fieldEvolve: {
    <
      Self extends Field<any> | Field.ValueAny,
      const Mapping
        extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: (variant: S[K]) => Field.ValueAny }
          : { readonly [K in Variants[number]]?: (variant: Self) => Field.ValueAny })
    >(f: Mapping): (self: Self) => Field<
      Self extends Field<infer S> ? {
          readonly [K in keyof S]: K extends keyof Mapping
            ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K]
            : S[K]
        } :
        {
          readonly [K in Variants[number]]: K extends keyof Mapping
            ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : Self
            : Self
        }
    >
    <
      Self extends Field<any> | Field.ValueAny,
      const Mapping extends (Self extends Field<infer S> ? {
          readonly [K in keyof S]?: (variant: S[K]) => Field.ValueAny
        }
        : { readonly [K in Variants[number]]?: (variant: Self) => Field.ValueAny })
    >(self: Self, f: Mapping): Field<
      Self extends Field<infer S> ? {
          readonly [K in keyof S]: K extends keyof Mapping
            ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K]
            : S[K]
        } :
        {
          readonly [K in Variants[number]]: K extends keyof Mapping
            ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : Self
            : Self
        }
    >
  }
  readonly fieldFromKey: {
    <
      Self extends Field<any> | Field.ValueAny,
      const Mapping extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: string }
        : { readonly [K in Variants[number]]?: string })
    >(
      mapping: Mapping
    ): (self: Self) => Field<
      Self extends Field<infer S> ? {
          readonly [K in keyof S]: K extends keyof Mapping ?
            Mapping[K] extends string ? fromKey.Rename<S[K], Mapping[K]>
            : S[K] :
            S[K]
        } :
        {
          readonly [K in Variants[number]]: K extends keyof Mapping ?
            Mapping[K] extends string ? fromKey.Rename<Self, Mapping[K]>
            : Self :
            Self
        }
    >
    <
      Self extends Field<any> | Field.ValueAny,
      const Mapping extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: string }
        : { readonly [K in Variants[number]]?: string })
    >(
      self: Self,
      mapping: Mapping
    ): Field<
      Self extends Field<infer S> ? {
          readonly [K in keyof S]: K extends keyof Mapping ?
            Mapping[K] extends string ? fromKey.Rename<S[K], Mapping[K]>
            : S[K] :
            S[K]
        } :
        {
          readonly [K in Variants[number]]: K extends keyof Mapping ?
            Mapping[K] extends string ? fromKey.Rename<Self, Mapping[K]>
            : Self :
            Self
        }
    >
  }
  readonly Class: <Self = never>(
    identifier: string
  ) => <const Fields extends Struct.Fields>(
    fields: Fields & Struct.Validate<Fields, Variants[number]>,
    annotations?: Schema.Annotations.Schema<Self>
  ) => [Self] extends [never] ? MissingSelfGeneric
    :
      & ClassFromFields<
        Self,
        Fields,
        ExtractFields<Default, Fields, true>
      >
      & {
        readonly [V in Variants[number]]: Extract<V, Struct<Fields>>
      }
  readonly Union: <const Members extends ReadonlyArray<Struct<any>>>(
    ...members: Members
  ) => Union<Members> & Union.Variants<Members, Variants[number]>
  readonly extract: {
    <V extends Variants[number]>(
      variant: V
    ): <A extends Struct<any>>(self: A) => Extract<V, A, V extends Default ? true : false>
    <V extends Variants[number], A extends Struct<any>>(
      self: A,
      variant: V
    ): Extract<V, A, V extends Default ? true : false>
  }
} => {
  function Class<Self>(identifier: string) {
    return function(
      fields: Struct.Fields,
      annotations?: Schema.Annotations.Schema<Self>
    ) {
      const variantStruct = Struct(fields)
      const schema = extract(variantStruct, options.defaultVariant, {
        isDefault: true
      })
      class Base extends Schema.Class<any>(identifier)(schema.fields, annotations) {
        static [TypeId] = fields
      }
      for (const variant of options.variants) {
        Object.defineProperty(Base, variant, {
          value: extract(variantStruct, variant).annotations({
            identifier: `${identifier}.${variant}`,
            title: `${identifier}.${variant}`
          })
        })
      }
      return Base
    }
  }
  function FieldOnly<Keys extends Variants>(...keys: Keys) {
    return function<S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) {
      const obj: Record<string, S> = {}
      for (const key of keys) {
        obj[key] = schema
      }
      return Field(obj)
    }
  }
  function FieldExcept<Keys extends Variants>(...keys: Keys) {
    return function<S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) {
      const obj: Record<string, S> = {}
      for (const variant of options.variants) {
        if (!keys.includes(variant)) {
          obj[variant] = schema
        }
      }
      return Field(obj)
    }
  }
  function UnionVariants(...members: ReadonlyArray<Struct<any>>) {
    return Union(members, options.variants)
  }
  const fieldEvolve = dual(
    2,
    (
      self: Field<any> | Schema.Schema.All | Schema.PropertySignature.All,
      f: Record<string, (schema: Field.ValueAny) => Field.ValueAny>
    ): Field<any> => {
      const field = isField(self) ? self : Field(Object.fromEntries(
        options.variants.map((variant) => [variant, self])
      ))
      return Field(Struct_.evolve(field.schemas, f))
    }
  )
  const fieldFromKey = dual(
    2,
    (
      self:
        | Field<{
          readonly [key: string]: Schema.Schema.All | Schema.PropertySignature.Any | undefined
        }>
        | Schema.Schema.All
        | Schema.PropertySignature.Any,
      mapping: Record<string, string>
    ): Field<any> => {
      const obj: Record<string, any> = {}
      if (isField(self)) {
        for (const [key, schema] of Object.entries(self.schemas)) {
          obj[key] = mapping[key] !== undefined ? renameFieldValue(schema as any, mapping[key]) : schema
        }
      } else {
        for (const key of options.variants) {
          obj[key] = mapping[key] !== undefined ? renameFieldValue(self as any, mapping[key]) : self
        }
      }
      return Field(obj)
    }
  )
  const extractVariants = dual(
    2,
    (self: Struct<any>, variant: string): any =>
      extract(self, variant, {
        isDefault: variant === options.defaultVariant
      })
  )
  return {
    Struct,
    Field,
    FieldOnly,
    FieldExcept,
    Class,
    Union: UnionVariants,
    fieldEvolve,
    fieldFromKey,
    extract: extractVariants
  } as any
}

/**
 * @since 1.0.0
 * @category overrideable
 */
export const Override = <A>(value: A): A & Brand<"Override"> => value as any

/**
 * @since 1.0.0
 * @category overrideable
 */
export interface Overrideable<To, From, R = never>
  extends Schema.PropertySignature<":", (To & Brand<"Override">) | undefined, never, ":", From, true, R>
{}

/**
 * @since 1.0.0
 * @category overrideable
 */
export const Overrideable = <From, IFrom, RFrom, To, ITo, R>(
  from: Schema.Schema<From, IFrom, RFrom>,
  to: Schema.Schema<To, ITo>,
  options: {
    readonly generate: (_: Option.Option<ITo>) => Effect.Effect<From, ParseResult.ParseIssue, R>
    readonly decode?: Schema.Schema<ITo, From>
    readonly constructorDefault?: () => To
  }
): Overrideable<To, IFrom, RFrom | R> =>
  Schema.transformOrFail(
    from,
    Schema.Union(Schema.Undefined, to as Schema.brand<Schema.Schema<To, ITo>, "Override">),
    {
      decode: (_) => options.decode ? ParseResult.decode(options.decode)(_) : ParseResult.succeed(undefined),
      encode: (dt) => options.generate(dt === undefined ? Option.none() : Option.some(dt))
    }
  ).pipe(Schema.propertySignature, Schema.withConstructorDefault(options.constructorDefault ?? constUndefined as any))

const StructProto = {
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const Struct = <const A extends Field.Fields>(fields: A): Struct<A> => {
  const self = Object.create(StructProto)
  self[TypeId] = fields
  return self
}

const FieldProto = {
  [FieldTypeId]: FieldTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const Field = <const A extends Field.Config>(schemas: A): Field<A> => {
  const self = Object.create(FieldProto)
  self.schemas = schemas
  return self
}

const Union = <Members extends ReadonlyArray<Struct<any>>, Variants extends ReadonlyArray<string>>(
  members: Members,
  variants: Variants
) => {
  class VariantUnion extends (Schema.Union(...members.filter((member) => Schema.isSchema(member))) as any) {}
  for (const variant of variants) {
    Object.defineProperty(VariantUnion, variant, {
      value: Schema.Union(...members.map((member) => extract(member, variant)))
    })
  }
  return VariantUnion
}

const renameFieldValue = <F extends Schema.Schema.All | Schema.PropertySignature.Any>(
  self: F,
  key: string
) =>
  Schema.isPropertySignature(self)
    ? Schema.fromKey(self, key)
    : Schema.fromKey(Schema.propertySignature(self), key)

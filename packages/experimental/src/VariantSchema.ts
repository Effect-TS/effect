/**
 * @since 1.0.0
 */
import type * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import { dual } from "effect/Function"

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

/**
 * @since 1.0.0
 * @category models
 */
export interface Struct<in out A extends Field.Fields> {
  readonly [TypeId]: A
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Struct {
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
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type FieldsWithKeys<K extends string> = {
    readonly [key: string]:
      | Schema.Schema.All
      | Schema.PropertySignature.All
      | Field<Field.ConfigWithKeys<K>>
      | Struct<FieldsWithKeys<K>>
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
export interface Field<in out A extends Field.Config> {
  readonly [FieldTypeId]: FieldTypeId
  readonly schemas: A
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Field {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Config = Partial<{
    readonly [key: string]: Schema.Schema.All | Schema.PropertySignature.All
  }>

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
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Struct = <const A extends Field.Fields>(fields: A): Struct<A> => ({
  [TypeId]: fields
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const Field = <const A extends Field.Config>(schemas: A): Field<A> => ({
  [FieldTypeId]: FieldTypeId,
  schemas
})

/**
 * @since 1.0.0
 * @category extractors
 */
export type ExtractFields<V extends string, Fields extends Struct.Fields> = {
  readonly [
    K in keyof Fields as [Fields[K]] extends [Field<infer Config>] ? V extends keyof Config ? K
      : never
      : K
  ]: [Fields[K]] extends [Struct<infer _>] ? Extract<V, Fields[K]>
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
export type Extract<V extends string, A extends Struct<any>> = [A] extends [
  Struct<infer Fields>
] ? Schema.Struct<Schema.Simplify<ExtractFields<V, Fields>>>
  : never

/**
 * @since 1.0.0
 * @category extractors
 */
export const extract: {
  <V extends string>(
    variant: V
  ): <A extends Struct<any>>(self: A) => Extract<V, A>
  <V extends string, A extends Struct<any>>(self: A, variant: V): Extract<V, A>
} = dual(
  2,
  <V extends string, A extends Struct<any>>(
    self: A,
    variant: V
  ): Extract<V, A> => {
    const fields: Record<string, any> = {}
    for (const key of Object.keys(self[TypeId])) {
      const value = self[TypeId][key]
      if (TypeId in value) {
        fields[key] = extract(value, variant)
      } else if (FieldTypeId in value) {
        if (variant in value.schemas) {
          fields[key] = value.schemas[variant]
        }
      } else {
        fields[key] = value
      }
    }
    return Schema.Struct(fields) as any
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
 * @category models
 * @since 1.0.0
 */
export interface Class<
  Self,
  Fields extends Struct.Fields,
  SchemaFields extends Schema.Struct.Fields,
  A,
  I,
  R,
  C
> extends Schema.Schema<Self, Schema.Simplify<I>, R>, Struct<Fields> {
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
  ): Schema.SchemaClass<Self, Schema.Simplify<I>, R>

  readonly identifier: string
  readonly fields: SchemaFields
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
 * @category constructors
 */
export const make = <
  const Variants extends ReadonlyArray<string>,
  const Default extends Variants[number]
>(options: {
  readonly variants: Variants
  readonly defaultVariant: Default
}): {
  readonly Struct: <const A extends Struct.FieldsWithKeys<Variants[number]>>(
    fields: A
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
  readonly Class: <Self = never>(
    identifier: string
  ) => <Fields extends Struct.Fields>(
    fields: Fields,
    annotations?: Schema.Annotations.Schema<Self>
  ) => [Self] extends [never] ? MissingSelfGeneric
    :
      & ClassFromFields<
        Self,
        Fields,
        Schema.Simplify<ExtractFields<Default, Fields>>
      >
      & {
        readonly [V in Variants[number]]: Extract<V, Struct<Fields>>
      }
} => {
  function Class<Self>(identifier: string) {
    return function(
      fields: Struct.Fields,
      annotations?: Schema.Annotations.Schema<Self>
    ) {
      const variantStruct = Struct(fields)
      const schema = extract(variantStruct, options.defaultVariant)
      class Base extends Schema.Class<any>(identifier)(schema.fields, annotations) {
        static [TypeId] = fields
      }
      for (const variant of options.variants) {
        Object.defineProperty(Base, variant, {
          value: extract(variantStruct, variant)
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
  return {
    Struct,
    Field,
    FieldOnly,
    FieldExcept,
    Class
  } as any
}

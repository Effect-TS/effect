import * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import { dual, identity, pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import type { RpcEncodeFailure } from "../Error.js"
import type * as schema from "../Schema.js"
import * as Codec from "./codec.js"

type JsonArray = ReadonlyArray<Json>
type JsonObject = { readonly [key: string]: Json }
export type Json = null | boolean | number | string | JsonArray | JsonObject

/** @internal */
export const RpcServiceId: schema.RpcServiceId = Symbol.for(
  "@effect/rpc/Schema/RpcService"
) as schema.RpcServiceId

/** @internal */
export const RpcServiceErrorId: schema.RpcServiceErrorId = Symbol.for(
  "@effect/rpc/Schema/RpcServiceErrorId"
) as schema.RpcServiceErrorId

/** @internal */
export const schemasToUnion = (
  schemas: ReadonlyArray<Schema.Schema<any>>
): Schema.Schema<any> => {
  schemas = schemas.filter((s) => s !== (Schema.never as any))

  return schemas.length === 0
    ? (Schema.never as any)
    : schemas.length === 1
    ? schemas[0]
    : Schema.union(...schemas)
}

/** @internal */
export const methodSchemaTransform = <A>(
  f: (schema: {
    input?: Schema.Schema<any>
    output?: Schema.Schema<any>
    error: Schema.Schema<any>
  }) => A
) =>
<S extends schema.RpcService.DefinitionWithId>(
  schemas: S,
  serviceErrors: ReadonlyArray<Schema.Schema<any>> = [],
  prefix = ""
): Record<string, A> => {
  serviceErrors = [
    ...serviceErrors,
    schemas[RpcServiceErrorId] as Schema.Schema<any>
  ]

  return Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...methodSchemaTransform(f)(
          schema,
          serviceErrors,
          `${prefix}${method}.`
        )
      }
    }

    const errorSchemas = "error" in schema
      ? [schema.error, ...serviceErrors]
      : serviceErrors

    return {
      ...acc,
      [`${prefix}${method}`]: f({
        input: "input" in schema ? schema.input : undefined,
        output: "output" in schema ? schema.output : Schema.void,
        error: schemasToUnion(errorSchemas)
      })
    }
  }, {})
}

/** @internal */
export const methodSchemas = methodSchemaTransform(identity)

/** @internal */
export const methodCodecs = methodSchemaTransform((schema) => ({
  input: schema.input ? Codec.decode(schema.input) : undefined,
  output: schema.output ? Codec.encode(schema.output) : undefined,
  error: Codec.encode(schema.error)
}))

/** @internal */
export const methodClientCodecs = methodSchemaTransform((schema) => ({
  input: schema.input ? Codec.encode(schema.input) : undefined,
  output: schema.output ? Codec.decode(schema.output) : undefined,
  error: Codec.decode(schema.error)
}))

/** @internal */
export const methodClientCodecsEither = methodSchemaTransform((schema) => ({
  input: schema.input ? Codec.encodeEither(schema.input) : undefined,
  output: schema.output ? Codec.decodeEither(schema.output) : undefined,
  error: Codec.decodeEither(schema.error)
}))

/** @internal */
export const rawClientCodecs = <S extends schema.RpcService.DefinitionWithId>(
  schemas: S,
  prefix = ""
): Record<
  string,
  {
    readonly input: (input: unknown) => Effect.Effect<never, RpcEncodeFailure, unknown>
    readonly output: (output: unknown) => Effect.Effect<never, RpcEncodeFailure, unknown>
  }
> =>
  Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...rawClientCodecs(schema, `${prefix}${method}.`)
      }
    } else if (!("input" in schema)) {
      return acc
    }

    return {
      ...acc,
      [`${prefix}${method}`]: {
        input: Codec.encode(Schema.to(schema.input)),
        output: Codec.encode(Schema.to("output" in schema ? schema.output : Schema.void))
      }
    }
  }, {})

/** @internal */
export const withServiceError: {
  <EI extends Json, E>(
    error: Schema.Schema<EI, E>
  ): <S extends schema.RpcService.DefinitionWithId>(
    self: S
  ) => schema.RpcService.WithId<
    S,
    schema.RpcService.ErrorsFrom<S> | EI,
    schema.RpcService.Errors<S> | E
  >
  <S extends schema.RpcService.DefinitionWithId, EI extends Json, E>(
    self: S,
    error: Schema.Schema<EI, E>
  ): schema.RpcService.WithId<
    S,
    schema.RpcService.ErrorsFrom<S> | EI,
    schema.RpcService.Errors<S> | E
  >
} = dual(
  2,
  <S extends schema.RpcService.DefinitionWithId, EI extends Json, E>(
    self: S,
    error: Schema.Schema<EI, E>
  ): schema.RpcService.WithId<
    S,
    schema.RpcService.ErrorsFrom<S> | EI,
    schema.RpcService.Errors<S> | E
  > => ({
    ...self,
    [RpcServiceErrorId]: schemasToUnion([
      self[RpcServiceErrorId] as any,
      error
    ])
  })
)

/** @internal */
export const HashAnnotationId: schema.HashAnnotationId = Symbol.for(
  "@effect/rpc/Schema/HashAnnotation"
) as schema.HashAnnotationId

/** @internal */
export const withHash: {
  <A>(f: (a: A) => number): <I>(self: Schema.Schema<I, A>) => Schema.Schema<I, A>
  <I, A>(
    self: Schema.Schema<I, A>,
    f: (a: A) => number
  ): Schema.Schema<I, A>
} = dual(
  2,
  <I, A>(self: Schema.Schema<I, A>, f: (a: A) => number) => Schema.annotations({ [HashAnnotationId]: f })(self)
)

/** @internal */
export const withHashString: {
  <A>(f: (a: A) => string): <I>(self: Schema.Schema<I, A>) => Schema.Schema<I, A>
  <I, A>(
    self: Schema.Schema<I, A>,
    f: (a: A) => string
  ): Schema.Schema<I, A>
} = dual(
  2,
  <I, A>(self: Schema.Schema<I, A>, f: (a: A) => string) => withHash(self, (_) => Hash.string(f(_)))
)

/** @internal */
export const hash = <I, A>(
  self: Schema.Schema<I, A>,
  value: A
): number =>
  pipe(
    AST.getAnnotation<(a: A) => number>(HashAnnotationId)(self.ast),
    Option.map((f) => f(value)),
    Option.getOrElse(() => Hash.hash(value))
  )

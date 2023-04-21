import { dual } from "@effect/data/Function"
import type * as Effect from "@effect/io/Effect"
import type { RpcEncodeFailure } from "@effect/rpc/Error"
import type * as schema from "@effect/rpc/Schema"
import { decode, encode, encodeEffect } from "@effect/rpc/internal/codec"
import * as Schema from "@effect/schema/Schema"

/** @internal */
export const RpcServiceId: schema.RpcServiceId = Symbol.for(
  "@effect/rpc/Schema/RpcService",
) as schema.RpcServiceId

/** @internal */
export const RpcServiceErrorId: schema.RpcServiceErrorId = Symbol.for(
  "@effect/rpc/Schema/RpcServiceErrorId",
) as schema.RpcServiceErrorId

/** @internal */
export const schemasToUnion = (
  schemas: ReadonlyArray<Schema.Schema<any>>,
): Schema.Schema<any> => {
  schemas = schemas.filter((s) => s !== (Schema.never as any))

  return schemas.length === 0
    ? (Schema.never as any)
    : schemas.length === 1
    ? schemas[0]
    : Schema.union(...schemas)
}

/** @internal */
export const methodCodecs = <S extends schema.RpcService.DefinitionWithId>(
  schemas: S,
  serviceErrors: ReadonlyArray<Schema.Schema<any>> = [],
  prefix = "",
): Record<
  string,
  {
    input?: ReturnType<typeof decode>
    output: ReturnType<typeof encode>
    error: ReturnType<typeof encode>
  }
> => {
  serviceErrors = [
    ...serviceErrors,
    schemas[RpcServiceErrorId] as Schema.Schema<any>,
  ]

  return Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...methodCodecs(schema, serviceErrors, `${prefix}${method}.`),
      }
    }

    const errorSchemas = schema.error
      ? [schema.error, ...serviceErrors]
      : serviceErrors

    return {
      ...acc,
      [`${prefix}${method}`]: {
        input: "input" in schema ? decode(schema.input) : undefined,
        output: encode(schema.output),
        error: encode(schemasToUnion(errorSchemas)),
      },
    }
  }, {})
}

/** @internal */
export const methodClientCodecs = <
  S extends schema.RpcService.DefinitionWithId,
>(
  schemas: S,
  serviceErrors: ReadonlyArray<Schema.Schema<any>> = [],
  prefix = "",
): Record<
  string,
  {
    input?: ReturnType<typeof encode>
    output: ReturnType<typeof decode>
    error: ReturnType<typeof decode>
  }
> => {
  serviceErrors = [
    ...serviceErrors,
    schemas[RpcServiceErrorId] as Schema.Schema<any>,
  ]

  return Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...methodClientCodecs(schema, serviceErrors, `${prefix}${method}.`),
      }
    }

    const errorSchemas = schema.error
      ? [schema.error, ...serviceErrors]
      : serviceErrors

    return {
      ...acc,
      [`${prefix}${method}`]: {
        input: "input" in schema ? encode(schema.input) : undefined,
        output: decode(schema.output),
        error: decode(schemasToUnion(errorSchemas)),
      },
    }
  }, {})
}

/** @internal */
export const inputEncodeMap = <S extends schema.RpcService.DefinitionWithId>(
  schemas: S,
  prefix = "",
): Record<
  string,
  (input: unknown) => Effect.Effect<never, RpcEncodeFailure, unknown>
> =>
  Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...inputEncodeMap(schema, `${prefix}${method}.`),
      }
    } else if (!("input" in schema)) {
      return acc
    }

    return {
      ...acc,
      [`${prefix}${method}`]: encodeEffect(Schema.to(schema.input)),
    }
  }, {})

/** @internal */
export const withServiceError: {
  <EI extends Schema.Json, E>(error: Schema.Schema<EI, E>): <
    S extends schema.RpcService.DefinitionWithId,
  >(
    self: S,
  ) => schema.RpcService.WithId<
    S,
    schema.RpcService.ErrorsFrom<S> | EI,
    schema.RpcService.Errors<S> | E
  >
  <S extends schema.RpcService.DefinitionWithId, EI extends Schema.Json, E>(
    self: S,
    error: Schema.Schema<EI, E>,
  ): schema.RpcService.WithId<
    S,
    schema.RpcService.ErrorsFrom<S> | EI,
    schema.RpcService.Errors<S> | E
  >
} = dual(
  2,
  <S extends schema.RpcService.DefinitionWithId, EI extends Schema.Json, E>(
    self: S,
    error: Schema.Schema<EI, E>,
  ): schema.RpcService.WithId<
    S,
    schema.RpcService.ErrorsFrom<S> | EI,
    schema.RpcService.Errors<S> | E
  > => ({
    ...self,
    [RpcServiceErrorId]: schemasToUnion([
      self[RpcServiceErrorId] as any,
      error,
    ]),
  }),
)

import type * as Effect from "@effect/io/Effect"
import type { RpcEncodeFailure } from "@effect/rpc/Error"
import type { RpcService } from "@effect/rpc/Schema"
import { RpcServiceId } from "@effect/rpc/Schema"
import { decode, encode, encodeEffect } from "@effect/rpc/internal/codec"
import * as Schema from "@effect/schema/Schema"

/** @internal */
export const methodCodecs = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  prefix = "",
): Record<
  string,
  {
    input?: ReturnType<typeof decode>
    output: ReturnType<typeof encode>
    error: ReturnType<typeof encode>
  }
> =>
  Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...methodCodecs(schema, `${prefix}${method}.`),
      }
    }

    return {
      ...acc,
      [`${prefix}${method}`]: {
        input: "input" in schema ? decode(schema.input) : undefined,
        output: encode(schema.output),
        error: encode(schema.error ?? Schema.never),
      },
    }
  }, {})

/** @internal */
export const methodClientCodecs = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  prefix = "",
): Record<
  string,
  {
    input?: ReturnType<typeof encode>
    output: ReturnType<typeof decode>
    error: ReturnType<typeof decode>
  }
> =>
  Object.entries(schemas).reduce((acc, [method, schema]) => {
    if (RpcServiceId in schema) {
      return {
        ...acc,
        ...methodCodecs(schema, `${prefix}${method}.`),
      }
    }

    return {
      ...acc,
      [`${prefix}${method}`]: {
        input: "input" in schema ? encode(schema.input) : undefined,
        output: decode(schema.output),
        error: decode(schema.error ?? Schema.never),
      },
    }
  }, {})

/** @internal */
export const inputEncodeMap = <S extends RpcService.DefinitionWithId>(
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

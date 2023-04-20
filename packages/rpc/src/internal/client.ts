import { Tag } from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type * as Request from "@effect/io/Request"
import * as Tracer from "@effect/io/Tracer"
import type * as client from "@effect/rpc/Client"
import { RpcError } from "@effect/rpc/Error"
import type { RpcRequest, RpcResolver } from "@effect/rpc/Resolver"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import { RpcServiceId } from "@effect/rpc/Schema"
import * as codec from "@effect/rpc/internal/codec"
import * as resolverInternal from "@effect/rpc/internal/resolver"
import * as schema from "@effect/rpc/internal/schema"
import * as Schema from "@effect/schema/Schema"

/** @internal */
export const RpcCache = Tag<client.RpcCache, Request.Cache<RpcRequest>>()

const unsafeDecode = <S extends RpcService.DefinitionWithId>(schemas: S) => {
  const map = schema.methodClientCodecs(schemas)

  return (method: RpcService.Methods<S>, output: unknown) => {
    const result = map[method as string].output(output)
    if (result._tag !== "Left") {
      return result.right as unknown
    }

    throw "unsafeDecode fail"
  }
}

const makeRecursive = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  transport: RpcResolver<never>,
  options: client.RpcClientOptions,
  prefix = "",
): client.RpcClient<S> =>
  Object.entries(schemas).reduce(
    (acc, [method, codec]) => ({
      ...acc,
      [method]:
        RpcServiceId in codec
          ? makeRecursive(codec, transport, options, `${prefix}${method}.`)
          : makeRpc(transport, codec, `${prefix}${method}`, options),
    }),
    {} as any,
  )

/** @internal */
export const make = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  transport: RpcResolver<never>,
  options: client.RpcClientOptions = {},
): client.RpcClient<S> =>
  ({
    ...makeRecursive(schemas, transport, options),
    _schemas: schemas,
    _unsafeDecode: unsafeDecode(schemas),
  } as any)

const makeRpc = <S extends RpcSchema.Any>(
  resolver: RpcResolver<never>,
  schema: S,
  method: string,
  { spanPrefix = "RpcClient" }: client.RpcClientOptions,
): client.Rpc<S> => {
  const parseError = codec.decodeEffect(
    "error" in schema ? Schema.union(RpcError, schema.error) : RpcError,
  )
  const parseOutput = codec.decodeEffect(schema.output)

  if ("input" in schema) {
    const encodeInput = codec.encodeEffect(schema.input as Schema.Schema<any>)

    return ((input: any) =>
      Tracer.useSpan(`${spanPrefix}.${method}`, (span) =>
        pipe(
          encodeInput(input),
          Effect.flatMap((input) =>
            Effect.request(
              resolverInternal.RpcRequest({
                _tag: method,
                input,
                spanName: span.name,
                spanId: span.spanId,
                traceId: span.traceId,
              }),
              resolver,
              Effect.serviceOption(RpcCache),
            ),
          ),
          Effect.flatMap(parseOutput),
          Effect.catchAll((e) => Effect.flatMap(parseError(e), Effect.fail)),
        ),
      )) as any
  }

  return Tracer.useSpan(`${spanPrefix}.${method}`, (span) =>
    pipe(
      Effect.request(
        resolverInternal.RpcRequest({
          _tag: method,
          spanName: span.name,
          spanId: span.spanId,
          traceId: span.traceId,
        }),
        resolver,
        Effect.serviceOption(RpcCache),
      ),
      Effect.flatMap(parseOutput),
      Effect.catchAll((e) => Effect.flatMap(parseError(e), Effect.fail)),
    ),
  ) as any
}

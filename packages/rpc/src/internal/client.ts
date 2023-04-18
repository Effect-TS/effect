import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Tracer from "@effect/io/Tracer"
import type { Rpc, RpcClient, RpcClientOptions } from "@effect/rpc/Client"
import { RpcError } from "@effect/rpc/Error"
import type { RpcResolver } from "@effect/rpc/Resolver"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import { RpcServiceId } from "@effect/rpc/Schema"
import * as codec from "@effect/rpc/internal/codec"
import * as resolverInternal from "@effect/rpc/internal/resolver"
import * as schema from "@effect/rpc/internal/schema"
import * as Schema from "@effect/schema/Schema"

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

const makeRecursive = <
  S extends RpcService.DefinitionWithId,
  T extends RpcResolver<any>,
>(
  schemas: S,
  transport: T,
  options: RpcClientOptions,
  prefix = "",
): RpcClient<S, T extends RpcResolver<infer R> ? R : never> =>
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
export const make = <
  S extends RpcService.DefinitionWithId,
  T extends RpcResolver<any>,
>(
  schemas: S,
  transport: T,
  options: RpcClientOptions = {},
): RpcClient<S, T extends RpcResolver<infer R> ? R : never> =>
  ({
    ...makeRecursive(schemas, transport, options),
    _schemas: schemas,
    _unsafeDecode: unsafeDecode(schemas),
  } as any)

const makeRpc = <S extends RpcSchema.Any, TR>(
  resolver: RpcResolver<TR>,
  schema: S,
  method: string,
  { spanPrefix = "RpcClient" }: RpcClientOptions,
): Rpc<S, TR> => {
  const parseError = codec.decodeEffect(
    "error" in schema ? Schema.union(RpcError, schema.error) : RpcError,
  )
  const parseOutput = codec.decodeEffect(schema.output)

  const parseResponse = (self: Effect.Effect<any, any, unknown>) =>
    pipe(
      Effect.flatMap(self, parseOutput),
      Effect.catchAll((e) => Effect.flatMap(parseError(e), Effect.fail)),
      Tracer.withSpan(`${spanPrefix}.${method}`),
    )

  if ("input" in schema) {
    const encodeInput = codec.encodeEffect(schema.input as Schema.Schema<any>)

    return ((input: any) =>
      pipe(
        encodeInput(input),
        Effect.flatMap((input) =>
          Effect.flatMap(Tracer.Span, (span) =>
            Effect.request(
              resolverInternal.RpcRequest({
                _tag: method,
                input,
                spanName: span.name,
                spanId: span.spanId,
                traceId: span.traceId,
              }),
              resolver,
            ),
          ),
        ),
        parseResponse,
      )) as any
  }

  return parseResponse(
    Effect.flatMap(Tracer.Span, (span) =>
      Effect.request(
        resolverInternal.RpcRequest({
          _tag: method,
          spanName: span.name,
          spanId: span.spanId,
          traceId: span.traceId,
        }),
        resolver,
      ),
    ),
  ) as any
}

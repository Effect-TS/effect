import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Tracer from "@effect/io/Tracer"
import type * as client from "@effect/rpc/Client"
import { RpcError } from "@effect/rpc/Error"
import { RpcResolver } from "@effect/rpc/Resolver"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import { RpcServiceErrorId, RpcServiceId } from "@effect/rpc/Schema"
import * as codec from "@effect/rpc/internal/codec"
import * as resolverInternal from "@effect/rpc/internal/resolver"
import * as schemaInternal from "@effect/rpc/internal/schema"
import type * as Schema from "@effect/schema/Schema"

const unsafeDecode = <S extends RpcService.DefinitionWithId>(schemas: S) => {
  const map = schemaInternal.methodClientCodecs(schemas)

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
  serviceErrors: ReadonlyArray<Schema.Schema<any>> = [],
  prefix = "",
): client.RpcClient<S, never> => {
  serviceErrors = [
    ...serviceErrors,
    schemas[RpcServiceErrorId] as Schema.Schema<any>,
  ]

  return Object.entries(schemas).reduce(
    (acc, [method, codec]) => ({
      ...acc,
      [method]:
        RpcServiceId in codec
          ? makeRecursive(
              codec,
              transport,
              options,
              serviceErrors,
              `${prefix}${method}.`,
            )
          : makeRpc(
              transport,
              serviceErrors,
              codec,
              `${prefix}${method}`,
              options,
            ),
    }),
    {} as any,
  )
}

/** @internal */
export const makeWithResolver: {
  <
    S extends RpcService.DefinitionWithSetup,
    Resolver extends
      | RpcResolver<never>
      | Effect.Effect<any, never, RpcResolver<never>>,
  >(
    schemas: S,
    resolver: Resolver,
    init: RpcService.SetupInput<S>,
    options?: client.RpcClientOptions,
  ): Effect.Effect<
    never,
    RpcService.SetupError<S> | RpcError,
    client.RpcClient<
      S,
      [Resolver] extends [Effect.Effect<any, any, any>]
        ? Effect.Effect.Context<Resolver>
        : never
    >
  >
  <
    S extends RpcService.DefinitionWithoutSetup,
    Resolver extends
      | RpcResolver<never>
      | Effect.Effect<any, never, RpcResolver<never>>,
  >(
    schemas: S,
    resolver: Resolver,
    options?: client.RpcClientOptions,
  ): client.RpcClient<
    S,
    [Resolver] extends [Effect.Effect<any, any, any>]
      ? Effect.Effect.Context<Resolver>
      : never
  >
} = (
  schemas: RpcService.DefinitionWithId,
  resolver: RpcResolver<never> | Effect.Effect<any, never, RpcResolver<never>>,
  initOrOptions?: unknown,
  options?: client.RpcClientOptions,
) => {
  const hasSetup = "__setup" in schemas
  const opts = hasSetup ? options : (initOrOptions as client.RpcClientOptions)
  const client: any = {
    ...makeRecursive(schemas, resolver as any, opts ?? {}),
    _schemas: schemas,
    _unsafeDecode: unsafeDecode(schemas),
  }

  if (hasSetup) {
    return Effect.as(client.__setup(initOrOptions), client)
  }

  return client as any
}

/** @internal */
export const make: {
  <S extends RpcService.DefinitionWithSetup>(
    schemas: S,
    init: RpcService.SetupInput<S>,
    options?: client.RpcClientOptions,
  ): Effect.Effect<
    never,
    RpcService.SetupError<S> | RpcError,
    client.RpcClient<S, never>
  >
  <S extends RpcService.DefinitionWithoutSetup>(
    schemas: S,
    options?: client.RpcClientOptions,
  ): client.RpcClient<S, never>
} = (
  schemas: any,
  initOrOptions?: unknown,
  options?: client.RpcClientOptions,
) => makeWithResolver(schemas, RpcResolver, initOrOptions, options) as any

const makeRpc = <S extends RpcSchema.Any>(
  resolver: RpcResolver<never>,
  serviceErrors: ReadonlyArray<Schema.Schema<any>>,
  schema: S,
  method: string,
  { spanPrefix = "RpcClient" }: client.RpcClientOptions,
): client.Rpc<S, never, never> => {
  const errorSchemas =
    "error" in schema
      ? [RpcError, schema.error, ...serviceErrors]
      : [RpcError, ...serviceErrors]
  const parseError = codec.decodeEffect(
    schemaInternal.schemasToUnion(errorSchemas),
  )
  const parseOutput = codec.decodeEffect(schema.output)

  if ("input" in schema) {
    const encodeInput = codec.encodeEffect(schema.input as Schema.Schema<any>)

    return ((input: any) => {
      const hash = resolverInternal.requestHash(method, input, spanPrefix)
      return Tracer.useSpan(`${spanPrefix}.${method}`, (span) =>
        pipe(
          encodeInput(input),
          Effect.flatMap((input) =>
            Effect.request(
              resolverInternal.RpcRequest({
                payload: {
                  _tag: method,
                  input,
                  spanName: span.name,
                  spanId: span.spanId,
                  traceId: span.traceId,
                },
                hash,
                schema,
              }),
              resolver,
            ),
          ),
          Effect.flatMap(parseOutput),
          Effect.catchAll((e) => Effect.flatMap(parseError(e), Effect.fail)),
        ),
      )
    }) as any
  }

  const hash = resolverInternal.requestHash(method, undefined, spanPrefix)

  return Tracer.useSpan(`${spanPrefix}.${method}`, (span) =>
    pipe(
      Effect.request(
        resolverInternal.RpcRequest({
          payload: {
            _tag: method,
            spanName: span.name,
            spanId: span.spanId,
            traceId: span.traceId,
          },
          hash,
          schema,
        }),
        resolver,
      ),
      Effect.flatMap(parseOutput),
      Effect.catchAll((e) => Effect.flatMap(parseError(e), Effect.fail)),
    ),
  ) as any
}

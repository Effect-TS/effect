import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Tracer from "@effect/io/Tracer"
import type { RpcEncodeFailure, RpcError, RpcNotFound } from "@effect/rpc/Error"
import type { RpcRequest, RpcResponse } from "@effect/rpc/Resolver"
import type { RpcHandler, RpcHandlers, RpcRouter } from "@effect/rpc/Router"
import type {
  RpcRequestSchema,
  RpcSchema,
  RpcService,
} from "@effect/rpc/Schema"
import type { RpcUndecodedClient } from "@effect/rpc/Server"
import * as codec from "@effect/rpc/internal/codec"
import {
  inputEncodeMap,
  methodCodecs,
  methodSchemas,
} from "@effect/rpc/internal/schema"
import * as Schema from "@effect/schema/Schema"

const schemaHandlersMap = <H extends RpcHandlers>(
  handlers: H,
  prefix = "",
): Record<string, RpcHandler.Any> =>
  Object.entries(handlers).reduce((acc, [method, definition]) => {
    if ("handlers" in definition) {
      return {
        ...acc,
        ...schemaHandlersMap(definition.handlers, `${prefix}${method}.`),
      }
    }
    return { ...acc, [`${prefix}${method}`]: definition }
  }, {})

/** @internal */
export const handleSingle = <R extends RpcRouter.Base>(
  router: R,
): ((
  request: RpcRequest.Payload,
) => Effect.Effect<
  Exclude<RpcHandlers.Services<R["handlers"]>, Tracer.Span>,
  never,
  RpcResponse
>) => {
  const codecsMap = methodCodecs(router.schema)
  const handlerMap = schemaHandlersMap(router.handlers)

  return (request) =>
    pipe(
      Either.Do(),
      Either.bind("codecs", () =>
        Either.fromNullable(
          codecsMap[request._tag],
          (): RpcNotFound => ({
            _tag: "RpcNotFound",
            method: request._tag,
          }),
        ),
      ),
      Either.bind("handler", () =>
        Either.fromNullable(
          handlerMap[request._tag],
          (): RpcNotFound => ({
            _tag: "RpcNotFound",
            method: request._tag,
          }),
        ),
      ),
      Either.bind("input", ({ codecs }) =>
        codecs.input ? codecs.input(request.input) : Either.right(null),
      ),
      Either.map(({ codecs, handler, input }) => {
        const effect: Effect.Effect<any, unknown, unknown> = Effect.isEffect(
          handler,
        )
          ? handler
          : (handler as any)(input)

        return pipe(
          effect,
          Effect.map(codecs.output),
          Effect.catchAll((_) =>
            Effect.succeed(Either.flatMap(codecs.error(_), Either.left)),
          ),
        ) as Effect.Effect<
          RpcHandlers.Services<R["handlers"]>,
          never,
          Either.Either<RpcError, unknown>
        >
      }),
      Either.match(
        (error) =>
          Effect.succeed({
            _tag: "Error",
            error,
          } as RpcResponse),
        Effect.map(
          Either.match(
            (error): RpcResponse => ({
              _tag: "Error",
              error,
            }),
            (value): RpcResponse => ({
              _tag: "Success",
              value,
            }),
          ),
        ),
      ),
      Tracer.withSpan(`${router.options.spanPrefix}.${request._tag}`, {
        parent: {
          _tag: "ExternalSpan",
          name: request.spanName,
          spanId: request.spanId,
          traceId: request.traceId,
        },
      }),
    )
}

/** @internal */
export const handleSingleWithSchema = <R extends RpcRouter.Base>(
  router: R,
): ((
  request: RpcRequest.Payload,
) => Effect.Effect<
  Exclude<RpcHandlers.Services<R["handlers"]>, Tracer.Span>,
  never,
  readonly [RpcResponse, Option.Option<RpcSchema.Base>]
>) => {
  const handle = handleSingle(router)
  const schemaMap = methodSchemas(router.schema)
  return (request) =>
    Effect.map(handle(request), (response) => [
      response,
      Option.fromNullable(schemaMap[request._tag]),
    ])
}

/** @internal */
export const router = <
  S extends RpcService.DefinitionWithId,
  H extends RpcHandlers.FromService<S>,
>(
  schema: S,
  handlers: H,
  optionsPartial: Partial<RpcRouter.Options> = {},
): RpcRouter<S, H> => {
  const options: RpcRouter.Options = {
    spanPrefix: optionsPartial.spanPrefix ?? "RpcServer",
  }
  return {
    schema,
    handlers,
    undecoded: makeUndecodedClient(schema, handlers, options),
    options,
  }
}

/** @internal */
export const handler = <R extends RpcRouter.Base>(
  router: R,
): ((
  requests: unknown,
) => Effect.Effect<
  Exclude<RpcHandlers.Services<R["handlers"]>, Tracer.Span>,
  never,
  ReadonlyArray<RpcResponse>
>) => {
  const handler = handleSingle(router)

  return (u) =>
    Array.isArray(u)
      ? Effect.allPar(u.map(handler))
      : Effect.die(new Error("expected an array of requests"))
}

/** @internal */
export const handlerRaw = <R extends RpcRouter.Base>(router: R) => {
  const handlerMap = schemaHandlersMap(router.handlers)
  const inputEncoders = inputEncodeMap(router.schema)

  return <Req extends RpcRequestSchema.To<R["schema"]>>(
    request: Req,
  ): Req extends { _tag: infer M }
    ? RpcHandler.FromMethod<R["handlers"], M, Tracer.Span, RpcEncodeFailure>
    : never => {
    const handler = handlerMap[(request as RpcRequest.Payload)._tag]
    if (Effect.isEffect(handler)) {
      return handler as any
    }

    return Effect.flatMap(
      inputEncoders[(request as RpcRequest.Payload)._tag](
        (request as RpcRequest.Payload).input,
      ),
      handler as any,
    ) as any
  }
}

/** @internal */
export const makeUndecodedClient = <
  S extends RpcService.DefinitionWithId,
  H extends RpcHandlers.FromService<S>,
>(
  schemas: S,
  handlers: H,
  options: RpcRouter.Options,
): RpcUndecodedClient<H> =>
  Object.entries(handlers as RpcHandlers).reduce(
    (acc, [method, definition]) => {
      if ("handlers" in definition) {
        return {
          ...acc,
          [method]: makeUndecodedClient(
            schemas[method] as any,
            definition.handlers as any,
            options,
          ),
        }
      }

      const schema = schemas[method] as RpcSchema.Any

      if (Effect.isEffect(definition)) {
        return {
          ...acc,
          [method]: pipe(
            definition,
            Effect.flatMap(codec.encode(schema.output)),
            Tracer.withSpan(`${options.spanPrefix}.undecoded.${method}`),
          ),
        }
      }

      const decodeInput = codec.decodeEffect(Schema.to((schema as any).input))
      const encodeOutput = codec.encode(schema.output)

      return {
        ...acc,
        [method]: (input: unknown) =>
          pipe(
            decodeInput(input),
            Effect.flatMap(definition as RpcHandler.IO<any, any, any, any>),
            Effect.flatMap(encodeOutput),
            Tracer.withSpan(`${options.spanPrefix}.undecoded.${method}`),
          ),
      }
    },
    {} as any,
  )

import type { Context } from "@effect/data/Context"
import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Ref from "@effect/io/Ref"
import { Scope } from "@effect/io/Scope"
import * as Tracer from "@effect/io/Tracer"
import {
  RpcNotFound,
  RpcTransportError,
  type RpcEncodeFailure,
  type RpcError,
} from "@effect/rpc/Error"
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
export const handleSingle: {
  <R extends RpcRouter.WithSetup>(router: R): Effect.Effect<
    Scope,
    never,
    (
      request: unknown,
    ) => Effect.Effect<
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R> | Tracer.Span
      >,
      never,
      RpcResponse
    >
  >
  <R extends RpcRouter.WithoutSetup>(router: R): (
    request: unknown,
  ) => Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, Tracer.Span>,
    never,
    RpcResponse
  >
} = (router: RpcRouter.Base) => {
  const codecsMap = methodCodecs(router.schema)
  const handlerMap = schemaHandlersMap(router.handlers)
  const hasSetup = "__setup" in router.handlers

  const handler =
    (contextRef?: Ref.Ref<Option.Option<Context<unknown>>>, scope?: Scope) =>
    (request: RpcRequest.Payload) =>
      pipe(
        Either.Do(),
        Either.bind("codecs", () =>
          Either.fromNullable(codecsMap[request._tag], () =>
            RpcNotFound({ method: request._tag ?? "" }),
          ),
        ),
        Either.bind("handler", () =>
          Either.fromNullable(handlerMap[request._tag], () =>
            RpcNotFound({ method: request._tag }),
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

          if (request._tag === "__setup" && contextRef && scope) {
            return pipe(
              Ref.get(contextRef),
              Effect.flatMap(
                Option.match(
                  () =>
                    pipe(
                      Layer.isLayer(effect) ? Layer.build(effect) : effect,
                      Effect.tap((_) => Ref.set(contextRef, Option.some(_))),
                    ),
                  () => Effect.unit(),
                ),
              ),
              Effect.as(null),
              Effect.either,
              Effect.provideService(Scope, scope),
            ) as Effect.Effect<any, never, Either.Either<RpcError, unknown>>
          }

          return pipe(
            contextRef
              ? pipe(
                  Ref.get(contextRef),
                  Effect.flatMap(
                    Option.match(
                      () =>
                        Effect.fail(
                          RpcTransportError({ error: "__setup not called" }),
                        ),
                      (ctx) => Effect.provideSomeContext(effect, ctx),
                    ),
                  ),
                )
              : effect,
            Effect.map(codecs.output),
            Effect.catchAll((_) =>
              Effect.succeed(Either.flatMap(codecs.error(_), Either.left)),
            ),
          ) as Effect.Effect<any, never, Either.Either<RpcError, unknown>>
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

  if (!hasSetup) {
    return handler() as any
  }

  return Effect.map(
    Effect.zip(Ref.make(Option.none()), Effect.scope()),
    ([contextRef, scope]) => handler(contextRef, scope),
  )
}

/** @internal */
export const handleSingleWithSchema: {
  <R extends RpcRouter.WithSetup>(router: R): Effect.Effect<
    Scope,
    never,
    (
      request: unknown,
    ) => Effect.Effect<
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R> | Tracer.Span
      >,
      never,
      readonly [RpcResponse, Option.Option<RpcSchema.Base>]
    >
  >
  <R extends RpcRouter.WithoutSetup>(router: R): (
    request: unknown,
  ) => Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, Tracer.Span>,
    never,
    readonly [RpcResponse, Option.Option<RpcSchema.Base>]
  >
} = ((router: RpcRouter.Base) => {
  const handler = handleSingle(router)
  const schemaMap = methodSchemas(router.schema)

  const run =
    (
      handle: (
        request: unknown,
      ) => Effect.Effect<unknown, unknown, RpcResponse>,
    ) =>
    (request: RpcRequest.Payload) =>
      Effect.map(handle(request), (response) => [
        response,
        Option.fromNullable(schemaMap[request._tag]),
      ])

  if (Effect.isEffect(handler)) {
    return Effect.map(handler as any, run)
  }

  return run(handler as any)
}) as any

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
export const handler: {
  <R extends RpcRouter.WithSetup>(router: R): Effect.Effect<
    Scope,
    never,
    (
      request: unknown,
    ) => Effect.Effect<
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R> | Tracer.Span
      >,
      never,
      ReadonlyArray<RpcResponse>
    >
  >
  <R extends RpcRouter.WithoutSetup>(router: R): (
    request: unknown,
  ) => Effect.Effect<
    Exclude<RpcHandlers.Services<R["handlers"]>, Tracer.Span>,
    never,
    ReadonlyArray<RpcResponse>
  >
} = (router: RpcRouter.Base) => {
  const handler = handleSingle(router) as any

  const run =
    (handler: () => Effect.Effect<unknown, unknown, RpcResponse>) =>
    (u: Array<unknown>) =>
      Array.isArray(u)
        ? Effect.allPar(u.map(handler))
        : Effect.die(new Error("expected an array of requests"))

  if (Effect.isEffect(handler)) {
    return Effect.map(handler as any, run) as any
  }

  return run(handler) as any
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

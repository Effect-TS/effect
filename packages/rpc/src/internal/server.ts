import * as Schema from "@effect/schema/Schema"
import { identity } from "effect"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import type * as Runtime from "effect/Runtime"
import { Scope } from "effect/Scope"
import * as Tracer from "effect/Tracer"
import { type RpcEncodeFailure, type RpcError, RpcNotFound, RpcTransportError } from "../Error.js"
import type { RpcRequest, RpcResponse } from "../Resolver.js"
import type { RpcHandler, RpcHandlers, RpcRouter } from "../Router.js"
import type { RpcRequestSchema, RpcSchema, RpcService } from "../Schema.js"
import type { RpcUndecodedClient } from "../Server.js"
import * as codec from "./codec.js"
import { methodCodecs, methodSchemas, rawClientCodecs } from "./schema.js"

const schemaHandlersMap = <H extends RpcHandlers>(
  handlers: H,
  prefix = ""
): Record<string, RpcHandler.Any> =>
  Object.entries(handlers).reduce((acc, [method, definition]) => {
    if ("handlers" in definition) {
      return {
        ...acc,
        ...schemaHandlersMap(definition.handlers, `${prefix}${method}.`)
      }
    }
    return { ...acc, [`${prefix}${method}`]: definition }
  }, {})

/** @internal */
export const handleSingle: {
  <R extends RpcRouter.WithSetup>(
    router: R
  ): Effect.Effect<
    Scope,
    never,
    (
      request: unknown
    ) => Effect.Effect<
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R>
      >,
      never,
      RpcResponse
    >
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (
    request: unknown
  ) => Effect.Effect<
    RpcHandlers.Services<R["handlers"]> | Scope,
    never,
    RpcResponse
  >
} = (router: RpcRouter.Base) => {
  const codecsMap = methodCodecs(router.schema)
  const handlerMap = schemaHandlersMap(router.handlers)
  const hasSetup = "__setup" in router.handlers

  const handler = (
    runtimeRef?: Ref.Ref<Option.Option<Runtime.Runtime<unknown>>>,
    scope?: Scope
  ) =>
  (request: RpcRequest.Payload) => {
    const responseEffect = pipe(
      Effect.Do,
      Effect.bind(
        "codecs",
        () =>
          Either.fromNullable(
            codecsMap[request._tag],
            () => RpcNotFound({ method: request._tag ?? "" })
          )
      ),
      Effect.bind(
        "handler",
        () =>
          Either.fromNullable(
            handlerMap[request._tag],
            () => RpcNotFound({ method: request._tag })
          )
      ),
      Effect.bind(
        "input",
        ({ codecs }) => codecs.input ? codecs.input(request.input) : Effect.unit
      ),
      Effect.flatMap(({ codecs, handler, input }) => {
        const effect: Effect.Effect<any, unknown, unknown> = Effect.isEffect(
            handler
          )
          ? handler
          : (handler as any)(input)

        if (request._tag === "__setup" && runtimeRef && scope) {
          return pipe(
            Ref.get(runtimeRef),
            Effect.flatMap(
              Option.match({
                onNone: () =>
                  Effect.tap(
                    Layer.isLayer(effect)
                      ? Layer.toRuntime(effect)
                      : Effect.flatMap(
                        effect,
                        (context) => Effect.provide(Effect.runtime<unknown>(), context as Context.Context<unknown>)
                      ),
                    (_) => Ref.set(runtimeRef, Option.some(_))
                  ),
                onSome: () => Effect.unit
              })
            ),
            Effect.asUnit,
            Effect.either,
            Effect.provideService(Scope, scope)
          ) as Effect.Effect<any, never, Either.Either<RpcError, unknown>>
        }

        return Effect.matchEffect(effect, {
          onFailure: (error) => Effect.map(codecs.error(error), Either.left),
          onSuccess: (value) =>
            codecs.output ?
              Effect.map(codecs.output(value), Either.right) :
              Effect.succeed(Either.right(void 0))
        }) as Effect.Effect<any, RpcEncodeFailure, Either.Either<RpcError, unknown>>
      }),
      Effect.matchCause({
        onFailure: (cause) => ({
          _tag: "Error",
          error: Either.match(Cause.failureOrCause(cause), {
            onLeft: identity,
            onRight: (cause) => RpcTransportError({ error: Cause.pretty(cause) })
          })
        }),
        onSuccess: Either.match({
          onLeft: (error): RpcResponse => ({
            _tag: "Error",
            error
          }),
          onRight: (value): RpcResponse => ({
            _tag: "Success",
            value
          })
        })
      }),
      Effect.withSpan(`${router.options.spanPrefix}.${request._tag}`, {
        parent: Tracer.externalSpan({
          spanId: request.spanId,
          traceId: request.traceId,
          sampled: request.sampled
        })
      })
    )

    if (request._tag !== "__setup" && runtimeRef !== undefined) {
      return Effect.flatMap(
        Ref.get(runtimeRef),
        Option.match({
          onNone: () => Effect.fail(RpcTransportError({ error: "__setup not called" })),
          onSome: (runtime) => Effect.provide(responseEffect, runtime)
        })
      )
    }

    return responseEffect
  }

  if (!hasSetup) {
    return handler() as any
  }

  return Effect.map(
    Effect.zip(Ref.make(Option.none<Runtime.Runtime<unknown>>()), Effect.scope),
    ([runtimeRef, scope]) => handler(runtimeRef, scope)
  )
}

/** @internal */
export const handleSingleWithSchema: {
  <R extends RpcRouter.WithSetup>(
    router: R
  ): Effect.Effect<
    Scope,
    never,
    (
      request: unknown
    ) => Effect.Effect<
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R>
      >,
      never,
      readonly [RpcResponse, Option.Option<RpcSchema.Base>]
    >
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (
    request: unknown
  ) => Effect.Effect<
    RpcHandlers.Services<R["handlers"]>,
    never,
    readonly [RpcResponse, Option.Option<RpcSchema.Base>]
  >
} = ((router: RpcRouter.Base) => {
  const handler = handleSingle(router)
  const schemaMap = methodSchemas(router.schema)

  const run = (
    handle: (
      request: unknown
    ) => Effect.Effect<unknown, unknown, RpcResponse>
  ) =>
  (request: RpcRequest.Payload) =>
    Effect.map(handle(request), (response) => [
      response,
      Option.fromNullable(schemaMap[request._tag])
    ])

  if (Effect.isEffect(handler)) {
    return Effect.map(handler as any, run)
  }

  return run(handler as any)
}) as any

/** @internal */
export const router = <
  S extends RpcService.DefinitionWithId,
  H extends RpcHandlers.FromService<S>
>(
  schema: S,
  handlers: H,
  optionsPartial: Partial<RpcRouter.Options> = {}
): RpcRouter<S, H> => {
  const options: RpcRouter.Options = {
    spanPrefix: optionsPartial.spanPrefix ?? "RpcServer"
  }
  return {
    schema,
    handlers,
    undecoded: makeUndecodedClient(schema, handlers, options),
    options
  }
}

/** @internal */
export const handler: {
  <const R extends RpcRouter.WithSetup>(
    router: R
  ): Effect.Effect<
    Scope,
    never,
    (
      request: unknown
    ) => Effect.Effect<
      Exclude<
        RpcHandlers.Services<R["handlers"]>,
        RpcRouter.SetupServices<R>
      >,
      never,
      ReadonlyArray<RpcResponse>
    >
  >
  <R extends RpcRouter.WithoutSetup>(
    router: R
  ): (
    request: unknown
  ) => Effect.Effect<
    RpcHandlers.Services<R["handlers"]>,
    never,
    ReadonlyArray<RpcResponse>
  >
} = (router: RpcRouter.Base) => {
  const handler = handleSingle(router) as any

  const run = (handler: () => Effect.Effect<unknown, unknown, RpcResponse>) => (u: Array<unknown>) =>
    Array.isArray(u)
      ? Effect.all(u.map(handler), { concurrency: "unbounded" })
      : Effect.die(new Error("expected an array of requests"))

  if (Effect.isEffect(handler)) {
    return Effect.map(handler as any, run) as any
  }

  return run(handler) as any
}

/** @internal */
export const handlerRaw = <const R extends RpcRouter.Base>(router: R) => {
  const handlerMap = schemaHandlersMap(router.handlers)
  const encoders = rawClientCodecs(router.schema)

  return <Req extends RpcRequestSchema.To<R["schema"]>>(
    request: Req
  ): Req extends { _tag: infer M } ? RpcHandler.FromMethod<R["handlers"], M, never, RpcEncodeFailure>
    : never =>
  {
    const handler = handlerMap[(request as RpcRequest.Payload)._tag]
    const codecs = encoders[(request as RpcRequest.Payload)._tag]
    if (Effect.isEffect(handler)) {
      return handler as any
    }

    return Effect.flatMap(
      Effect.flatMap(
        codecs.input((request as RpcRequest.Payload).input),
        handler as any
      ),
      codecs.output
    ) as any
  }
}

/** @internal */
export const makeUndecodedClient = <
  const S extends RpcService.DefinitionWithId,
  const H extends RpcHandlers.FromService<S>
>(
  schemas: S,
  handlers: H,
  options: RpcRouter.Options
): RpcUndecodedClient<H> =>
  Object.entries(handlers as RpcHandlers).reduce(
    (acc, [method, definition]) => {
      if ("handlers" in definition) {
        return {
          ...acc,
          [method]: makeUndecodedClient(
            schemas[method] as any,
            definition.handlers as any,
            options
          )
        }
      }

      const schema = schemas[method] as RpcSchema.Any

      if (Effect.isEffect(definition)) {
        return {
          ...acc,
          [method]: pipe(
            definition,
            "output" in schema ?
              Effect.flatMap(codec.encode(schema.output)) :
              Effect.asUnit,
            Effect.withSpan(`${options.spanPrefix}.undecoded.${method}`)
          )
        }
      }

      const decodeInput = codec.decode(Schema.to((schema as any).input))
      const encodeOutput = "output" in schema
        ? codec.encode(schema.output)
        : (_: any) => Effect.unit

      return {
        ...acc,
        [method]: (input: unknown) =>
          pipe(
            decodeInput(input),
            Effect.flatMap(definition as RpcHandler.IO<any, any, any, any>),
            Effect.flatMap(encodeOutput),
            Effect.withSpan(`${options.spanPrefix}.undecoded.${method}`)
          )
      }
    },
    {} as any
  )

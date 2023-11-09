import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type { RpcHandler, RpcHandlers, RpcRouter } from "../Router.js"
import type { RpcService } from "../Schema.js"
import { makeUndecodedClient } from "./server.js"

/** @internal */
export const make = <
  const S extends RpcService.DefinitionWithId,
  const H extends RpcHandlers.FromService<S>
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

const provideHandlerEffect = (
  handler: RpcHandler.Any,
  tag: Tag<any, any>,
  effect: Effect.Effect<any, any, any>
) =>
  Effect.isEffect(handler)
    ? Effect.provideServiceEffect(handler, tag, effect)
    : (input: any) => {
      const effectOrLayer = (handler as Function)(input)
      return Effect.provideServiceEffect(
        Layer.isLayer(effectOrLayer)
          ? Layer.build(effectOrLayer)
          : effectOrLayer,
        tag,
        effect
      )
    }

/** @internal */
export const provideServiceEffect: {
  <
    const Router extends RpcRouter.Base,
    T extends Tag<any, any>,
    R,
    E extends RpcService.Errors<Router["schema"]>
  >(
    tag: T,
    effect: Effect.Effect<R, E, Tag.Service<T>>
  ): (self: Router) => RpcRouter.Provide<Router, Tag.Identifier<T>, R, E>
  <
    const Router extends RpcRouter.Base,
    T extends Tag<any, any>,
    R,
    E extends RpcService.Errors<Router["schema"]>
  >(
    self: Router,
    tag: T,
    effect: Effect.Effect<R, E, Tag.Service<T>>
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, R, E>
} = dual(
  3,
  <Router extends RpcRouter.Base, T extends Tag<any, any>, R, E>(
    self: Router,
    tag: T,
    effect: Effect.Effect<R, E, Tag.Service<T>>
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, R, E> => {
    return {
      ...self,
      handlers: Object.fromEntries(
        Object.entries(self.handlers).map(([method, handler]) =>
          "handlers" in handler
            ? [method, provideServiceEffect(handler as any, tag, effect)]
            : [method, provideHandlerEffect(handler, tag, effect)]
        )
      )
    } as any
  }
)

/** @internal */
export const provideServiceSync: {
  <T extends Tag<any, any>>(
    tag: T,
    service: LazyArg<Tag.Service<T>>
  ): <const Router extends RpcRouter.Base>(
    self: Router
  ) => RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
  <const Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: LazyArg<Tag.Service<T>>
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
} = dual(
  3,
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: LazyArg<Tag.Service<T>>
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never> => provideServiceEffect(self, tag, Effect.sync(service))
)

/** @internal */
export const provideService: {
  <T extends Tag<any, any>>(
    tag: T,
    service: Tag.Service<T>
  ): <const Router extends RpcRouter.Base>(
    self: Router
  ) => RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
  <const Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: Tag.Service<T>
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
} = dual(
  3,
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: Tag.Service<T>
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never> =>
    provideServiceEffect(self, tag, Effect.succeed(service))
)

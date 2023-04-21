import type { Tag } from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import type { RpcHandler, RpcHandlers, RpcRouter } from "@effect/rpc/Router"
import type { RpcService } from "@effect/rpc/Schema"
import { makeUndecodedClient } from "@effect/rpc/internal/server"
import type { LazyArg } from "@effect/data/Function"
import { dual } from "@effect/data/Function"

/** @internal */
export const make = <
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

const provideHandlerEffect = (
  handler: RpcHandler.Any,
  tag: Tag<any, any>,
  effect: Effect.Effect<any, any, any>,
) =>
  Effect.isEffect(handler)
    ? Effect.provideServiceEffect(handler, tag, effect)
    : (input: any) =>
        Effect.provideServiceEffect((handler as Function)(input), tag, effect)

/** @internal */
export const provideServiceEffect: {
  <
    Router extends RpcRouter.Base,
    T extends Tag<any, any>,
    R,
    E extends RpcService.Errors<Router["schema"]>,
  >(
    tag: T,
    effect: Effect.Effect<R, E, Tag.Service<T>>,
  ): (self: Router) => RpcRouter.Provide<Router, Tag.Identifier<T>, R, E>
  <
    Router extends RpcRouter.Base,
    T extends Tag<any, any>,
    R,
    E extends RpcService.Errors<Router["schema"]>,
  >(
    self: Router,
    tag: T,
    effect: Effect.Effect<R, E, Tag.Service<T>>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, R, E>
} = dual(
  3,
  <Router extends RpcRouter.Base, T extends Tag<any, any>, R, E>(
    self: Router,
    tag: T,
    effect: Effect.Effect<R, E, Tag.Service<T>>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, R, E> => {
    return {
      ...self,
      handlers: Object.fromEntries(
        Object.entries(self.handlers).map(([method, handler]) =>
          "handlers" in handler
            ? [method, provideServiceEffect(handler as any, tag, effect)]
            : [method, provideHandlerEffect(handler, tag, effect)],
        ),
      ),
    } as any
  },
)

/** @internal */
export const provideServiceSync: {
  <T extends Tag<any, any>>(tag: T, service: LazyArg<Tag.Service<T>>): <
    Router extends RpcRouter.Base,
  >(
    self: Router,
  ) => RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: LazyArg<Tag.Service<T>>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
} = dual(
  3,
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: LazyArg<Tag.Service<T>>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never> =>
    provideServiceEffect(self, tag, Effect.sync(service)),
)

/** @internal */
export const provideService: {
  <T extends Tag<any, any>>(tag: T, service: Tag.Service<T>): <
    Router extends RpcRouter.Base,
  >(
    self: Router,
  ) => RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: Tag.Service<T>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never>
} = dual(
  3,
  <Router extends RpcRouter.Base, T extends Tag<any, any>>(
    self: Router,
    tag: T,
    service: Tag.Service<T>,
  ): RpcRouter.Provide<Router, Tag.Identifier<T>, never, never> =>
    provideServiceEffect(self, tag, Effect.succeed(service)),
)

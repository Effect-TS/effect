import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import type { HttpApp, PreResponseHandler } from "../HttpApp.js"

/** @internal */
export const currentPreResponseHandlers: FiberRef.FiberRef<Option.Option<PreResponseHandler>> = globalValue(
  Symbol.for("@effect/platform/HttpApp/preResponseHandlers"),
  () => FiberRef.unsafeMake<Option.Option<PreResponseHandler>>(Option.none())
)

/** @internal */
export const appendPreResponseHandler: (handler: PreResponseHandler) => Effect.Effect<void> = (
  handler: PreResponseHandler
) =>
  FiberRef.update(
    currentPreResponseHandlers,
    Option.match({
      onNone: () => Option.some(handler),
      onSome: (prev) =>
        Option.some((request, response) =>
          Effect.flatMap(prev(request, response), (response) => handler(request, response))
        )
    })
  )

/** @internal */
export const withPreResponseHandler = dual<
  (handler: PreResponseHandler) => <A, E, R>(self: HttpApp<A, E, R>) => HttpApp<A, E, R>,
  <A, E, R>(self: HttpApp<A, E, R>, handler: PreResponseHandler) => HttpApp<A, E, R>
>(2, (self, handler) =>
  Effect.locallyWith(
    self,
    currentPreResponseHandlers,
    Option.match({
      onNone: () => Option.some(handler),
      onSome: (prev) =>
        Option.some((request, response) =>
          Effect.flatMap(prev(request, response), (response) => handler(request, response))
        )
    })
  ))

import * as Effect from "../../Effect.ts"
import type { PreResponseHandler } from "../HttpEffect.ts"
import { type HttpServerRequest, RequestToken } from "../HttpServerRequest.ts"

/**
 * @internal
 */
export const requestPreResponseHandlers = new WeakMap<object, PreResponseHandler>()

/**
 * @internal
 */
export const appendPreResponseHandlerUnsafe = (request: HttpServerRequest, handler: PreResponseHandler): void => {
  const token = request[RequestToken]
  const prev = requestPreResponseHandlers.get(token)
  const next: PreResponseHandler = prev ?
    (request, response) => Effect.flatMap(prev(request, response), (response) => handler(request, response))
    : handler
  requestPreResponseHandlers.set(token, next)
}

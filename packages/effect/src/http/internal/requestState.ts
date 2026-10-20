import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import type { PreResponseHandler } from "../HttpEffect.ts"

/**
 * Mutable state owned by the root that handles a single server request.
 *
 * Request roots allocate it once per server request and store it under
 * `RequestStateKey`. `modify` copies and wrapping requests share it, so they
 * share a single "consumed" flag for the body.
 *
 * @internal
 */
export class RequestState {
  readonly _tag = "RequestToken"
  preResponseHandler: PreResponseHandler | undefined = undefined
  loggerDisabled = false
  // How the body was first read, or `undefined` while it is unread.
  bodyRead: "buffered" | "stream" | undefined = undefined
  // Cached buffered reads, shared by `modify` copies.
  bodyReads: Map<string, Effect.Effect<any, any, any>> | undefined = undefined
  responded = false
}

/**
 * Property under which a server request stores its `RequestState`.
 *
 * @internal
 */
export const RequestStateKey = "~effect/http/HttpServerRequest/RequestToken"

/**
 * @internal
 */
export const fromRequest = (request: object): RequestState | undefined =>
  (request as { readonly [RequestStateKey]?: RequestState })[RequestStateKey]

/**
 * Provided by request roots alongside `HttpServerRequest`. It has no default,
 * so writes outside a request do not reach shared state.
 *
 * @internal
 */
export const CurrentRequestState = Context.Service<RequestState>("effect/http/HttpEffect/CurrentRequestState")

/**
 * @internal
 */
export const appendPreResponseHandlerUnsafe = (context: Context.Context<never>, handler: PreResponseHandler): void => {
  const state = Context.getOrUndefined(context, CurrentRequestState)
  if (state === undefined) return
  const prev = state.preResponseHandler
  state.preResponseHandler = prev ?
    (request, response) => Effect.flatMap(prev(request, response), (response) => handler(request, response))
    : handler
}

const alreadyRead =
  "The request body was already read, for example by middleware that buffered it, and cannot be read again"

/**
 * Marks the body of `request` as read. Returns the defect message when the
 * body was already consumed or the response has finished.
 *
 * @internal
 */
export const claimBody = (request: object, kind: "buffered" | "stream"): string | undefined => {
  const state = fromRequest(request)
  if (state === undefined) return undefined
  if (state.bodyRead === "buffered") return alreadyRead
  if (state.bodyRead === "stream") {
    return "The request body stream was already consumed and cannot be run a second time, so a retried or redirected upload cannot replay it"
  }
  if (state.responded) {
    return "The request body was read after the response finished. It can be read only while the request is in flight"
  }
  // A Web body read outside Effect counts as consumed.
  if ((request as { readonly source?: { readonly bodyUsed?: unknown } }).source?.bodyUsed === true) {
    return alreadyRead
  }
  state.bodyRead = kind
  return undefined
}

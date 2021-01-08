import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import type * as Q from "@effect-ts/core/Effect/Queue"
import { literal, pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import type { _A } from "@effect-ts/core/Utils"
import type { IncomingMessage, ServerResponse } from "http"

/**
 * The context of a request
 */
export type RequestContext = {
  readonly req: IncomingMessage
  readonly res: ServerResponse
}

/**
 * Environment Service to hold the Request Queue
 */
export interface RequestQueue {
  readonly _tag: "@app/RequestQueue"
  readonly requestQueue: Q.Queue<RequestContext>
}

/**
 * Tag to access and provide the RequestQueue
 */
export const RequestQueue = tag<RequestQueue>()

/**
 * this is supposed to be called with an already constructed queue that will be closed
 * in case the process is either interrupted or ends for any reason
 */
export const GlobalRequestQueue = (requestQueue: Q.Queue<RequestContext>) =>
  L.fromManaged(RequestQueue)(
    pipe(
      T.succeed({ _tag: literal("@app/RequestQueue"), requestQueue }),
      M.makeExit(({ requestQueue }) => requestQueue.shutdown)
    )
  )

/**
 * Access takeRequest from environment and use it
 */
export const takeRequest = T.accessServiceM(RequestQueue)(
  ({ requestQueue }) => requestQueue.take
)

/**
 * Returns an effect that will poll indefinately the request queue
 * forking each process `f` in a new child fiber
 */
export const processRequests = <R, E, A>(
  f: (a: { req: IncomingMessage; res: ServerResponse }) => T.Effect<R, E, A>
) =>
  pipe(
    // poll from the request queue waiting in case no requests are present
    takeRequest,
    // fork each request in it's own fiber and start processing
    // here we are forking inside the parent scope so in case the
    // parent is interrupted each of the child will also trigger
    // interruption
    T.chain((r) => T.fork(f(r))),
    // loop forever
    T.forever
  )

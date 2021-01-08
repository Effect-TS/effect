import * as T from "@effect-ts/core/Effect"
import * as P from "@effect-ts/core/Effect/Promise"
import * as Q from "@effect-ts/core/Effect/Queue"
import { pipe } from "@effect-ts/core/Function"
import * as R from "@effect-ts/node/Runtime"
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"

import { main } from "./program"
import { LiveAuth } from "./program/Auth"
import type { RequestContext } from "./program/RequestQueue"
import { GlobalRequestQueue } from "./program/RequestQueue"

/**
 * Given the lambda handler is global we need to store the queue in a global variable
 */
const requestQueue = Q.unsafeMakeUnbounded<RequestContext>()

/**
 * As soon as the file loads we run the main process
 */
pipe(
  main,
  // we use the LiveAuth and the GlobalRequestQueue layer passing the global queue
  T.provideSomeLayer(LiveAuth["+++"](GlobalRequestQueue(requestQueue))),
  // we run the main process, this will listen to process.on(exit) and interrupt correctly
  R.runMain
)

/**
 * The main exposed handler
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> =>
  pipe(
    P.make<never, APIGatewayProxyResult>(),
    T.tap((res) => requestQueue.offer({ event, res })),
    T.chain(P.await),
    R.runPromise
  )

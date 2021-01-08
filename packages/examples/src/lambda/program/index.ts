import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import type { APIGatewayProxyResult } from "aws-lambda"

import { login } from "./Auth"
import { processRequests } from "./RequestQueue"

/**
 * The type of this is `T.Effect<Has<RequestQueue> & Has<AuthService> & Has<Clock>, never, never>`
 *
 * So it can run as long as we provide a RequestQueue and an AuthService
 */
export const main = processRequests((event) =>
  // do stuff with a request...
  pipe(
    login,
    T.chain((token) =>
      T.effectTotal(
        (): APIGatewayProxyResult => {
          if (token === "service_token") {
            return {
              statusCode: 200,
              body: JSON.stringify({ response: "ok", event })
            }
          } else {
            return {
              statusCode: 401,
              body: JSON.stringify({ error: "not authenticated" })
            }
          }
        }
      )
    ),
    // simulate load...
    T.delay(1000)
  )
)

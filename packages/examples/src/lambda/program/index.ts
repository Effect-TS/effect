import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import { login } from "./Auth"
import { processRequests } from "./RequestQueue"

/**
 * The type of this is `T.Effect<Has<RequestQueue> & Has<AuthService> & Has<Clock>, never, never>`
 *
 * So it can run as long as we provide a RequestQueue and an AuthService
 */
export const main = processRequests(({ res }) =>
  // do stuff with a request...
  pipe(
    login,
    T.chain((token) =>
      T.effectTotal(() => {
        if (token === "service_token") {
          res.write(`yeah!`)
        } else {
          res.statusCode = 401
        }
        res.end()
      })
    ),
    // simulate load...
    T.delay(1000)
  )
)

import { expressM } from "../resources/expressM"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as H from "@matechs/http-client"
import * as J from "@matechs/test-jest"

/* istanbul ignore file */

export const get404Spec = J.testM(
  "get 404",
  M.use(expressM(4016), () =>
    T.Do()
      .bindL("get", () =>
        T.result(
          pipe(
            H.get("http://127.0.0.1:4016/"),
            T.mapError(
              H.foldHttpError(
                (_) => 0,
                ({ status }) => status
              )
            )
          )
        )
      )
      .return(({ get }) => {
        J.assert.deepStrictEqual(Ex.isRaise(get), true)
        J.assert.deepStrictEqual(Ex.isRaise(get) && get.error, 404)
      })
  )
)

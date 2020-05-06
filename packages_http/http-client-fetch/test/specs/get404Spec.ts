import * as H from "@matechs/http-client"
import { T, Ex, M, pipe } from "@matechs/prelude"
import * as J from "@matechs/test-jest"

import { expressM } from "../resources/expressM"

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

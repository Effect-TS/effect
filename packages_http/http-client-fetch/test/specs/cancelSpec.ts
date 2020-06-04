import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as H from "@matechs/http-client"
import * as J from "@matechs/test-jest"

/* istanbul ignore file */

export const cancelSpec = J.testM(
  "cancel",
  pipe(
    T.fork(H.get("https://jsonplaceholder.typicode.com/todos/1")),
    T.chain((f) => f.interrupt),
    T.map((res) => {
      J.assert.deepStrictEqual(res && Ex.isInterrupt(res), true)
    })
  )
)

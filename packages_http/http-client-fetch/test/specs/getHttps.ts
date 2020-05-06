import * as H from "@matechs/http-client"
import { T, Ex, O } from "@matechs/prelude"
import * as J from "@matechs/test-jest"

/* istanbul ignore file */

export const getHttpsSpec = J.testM(
  "get https",
  T.Do()
    .bindL("get", () => T.result(H.get("https://jsonplaceholder.typicode.com/todos/1")))
    .return(({ get }) => {
      J.assert.deepStrictEqual(Ex.isDone(get), true)
      J.assert.deepStrictEqual(
        Ex.isDone(get) && get.value.body,
        O.some({
          userId: 1,
          id: 1,
          title: "delectus aut autem",
          completed: false
        })
      )
    })
)

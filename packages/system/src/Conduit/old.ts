import { pretty } from "../Cause"
import * as T from "../Effect"
import { pipe } from "../Function"
import * as M from "../Managed"
import * as L from "../Persistent/List"
import * as S from "../Stream"

console.time("stream")

const stream = pipe(
  S.managed(
    M.makeExit_(
      T.effectTotal(() => {
        //console.log("open 1")
        return 1
      }),
      () =>
        T.effectTotal(() => {
          //console.log("close 1")
        })
    )
  ),
  S.forever,
  S.take(100000)
)

pipe(
  stream,
  S.runList,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.size(l))
    })
  ),
  T.runPromiseExit
).then((x) => {
  console.timeEnd("stream")
  if (x._tag === "Failure") {
    console.log(pretty(x.cause))
  }
})

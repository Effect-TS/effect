import * as T from "../Effect"
import { pipe } from "../Function"
import * as L from "../Persistent/List"
import * as S from "./Stream"

pipe(
  S.iterate(1, (n) => n + 1),
  S.takeN(2),
  S.runCollect,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(l))
    })
  ),
  T.runPromise
)

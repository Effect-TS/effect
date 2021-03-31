import * as T from "../Effect"
import { pipe } from "../Function"
import * as L from "../Persistent/List"
import * as S from "./conduit"

pipe(
  S.succeedMany(1, 2, 3, 4, 5),
  S.runCollect,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(l))
    })
  ),
  T.runPromise
)

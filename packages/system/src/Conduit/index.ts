import * as T from "../Effect"
import { pipe } from "../Function"
import * as L from "../Persistent/List"
import * as S from "./conduit"

pipe(
  S.yieldMany(1, 2, 3, 4, 5),
  S.fuse(S.consumeToList()),
  S.runConduit,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(l))
    })
  ),
  T.runPromise
)

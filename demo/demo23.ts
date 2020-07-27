import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Stream"

pipe(
  S.fromArray([0, 1, 2]),
  S.mapM((n) =>
    pipe(
      T.effectTotal(() => {
        console.log(`process: ${n}`)
      }),
      T.chain(() => T.effectTotal(() => n + 1))
    )
  ),
  S.runCollect,
  T.chain((ns) =>
    T.effectTotal(() => {
      console.log(`final: ${JSON.stringify(ns)}`)
    })
  ),
  T.runMain
)

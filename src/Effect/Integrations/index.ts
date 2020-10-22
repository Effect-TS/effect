import * as T from "@effect-ts/system/Effect"
import { some } from "@effect-ts/system/Option"

import * as A from "../../Async"

function asyncToEffectIntegration() {
  if (A.currentIntegration.get._tag === "None") {
    A.currentIntegration.set(
      some(<R, E, A>(self: A.Async<R, E, A>) =>
        T.accessM((r: R) =>
          T.effectAsyncInterrupt<R, E, A>((cb) => {
            const int = A.runAsyncEnv(self, r, (ex) => {
              if (ex._tag === "Success") {
                cb(T.succeed(ex.a))
              } else if (ex._tag === "Failure") {
                cb(T.fail(ex.e))
              } else {
                cb(T.interrupt)
              }
            })
            return T.effectTotal(() => {
              int()
            })
          })
        )
      )
    )
  }
}

asyncToEffectIntegration()

import * as A from "../src/Array"
import * as T from "../src/EffectAsync"
import * as E from "../src/Either"
import { pipe } from "../src/Function"
import { nextRange } from "../src/Random"
import { makeSemaphore, withPermit } from "../src/Semaphore"

pipe(
  makeSemaphore(3),
  T.chain((r) =>
    pipe(
      10,
      A.makeBy((n) => `item: ${n}`),
      A.separateWithKeysF(T.ApplicativePar)((s, k) =>
        pipe(
          nextRange(2000, 5000),
          T.chain((d) =>
            pipe(
              T.access((r: { n: number }) =>
                k > 5
                  ? E.left(`s: {${s}} l: ${k + r.n}`)
                  : E.right(`s: {${s}} r: ${k - r.n}`)
              ),
              T.delay(d),
              withPermit(r)
            )
          )
        )
      ),
      T.provide({ n: 100 })
    )
  ),
  T.runPromise
).then(console.log)

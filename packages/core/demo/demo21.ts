import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"

export class MyService {
  readonly open = T.effectTotal(() => {
    console.log("open")
  })
  readonly close = T.effectTotal(() => {
    console.log("close")
  })
  readonly hi = T.effectTotal(() => {
    console.log("hi")
  })
}

export const HasMyService = T.has(MyService)

export const hi = T.accessServiceM(HasMyService)((c) => c.hi)

export const myService = L.service(HasMyService)
  .prepare(T.effectTotal(() => new MyService()))
  .open((c) => c.open)
  .release((c) => c.close)

export const env = pipe(
  L.allPar(L.memo(myService), L.memo(myService), L.memo(myService)),
  L.using(L.memoMap),
  L.main
)

pipe(hi, T.provideSomeLayer(env), T.runMain)

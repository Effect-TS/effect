import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"

export class MyService {
  readonly open = pipe(
    T.effectTotal(() => {
      console.log("open")
    }),
    T.delay(200)
  )
  readonly close = pipe(
    T.effectTotal(() => {
      console.log("close")
    }),
    T.delay(200)
  )
  readonly hi = pipe(
    T.effectTotal(() => {
      console.log("hi")
    }),
    T.delay(200)
  )
}

export const HasMyService = T.has(MyService)

export const hi = T.accessServiceM(HasMyService)((c) => c.hi)

export const myService = L.service(HasMyService)
  .prepare(T.effectTotal(() => new MyService()))
  .open((c) => c.open)
  .release((c) => c.close)
  .memo()

export const env = pipe(L.allPar(myService, myService, myService), L.main)

pipe(hi, T.provideSomeLayer(env), T.runMain)

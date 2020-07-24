import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"
import * as R from "../src/next/Runtime"

export class Config {
  readonly foo: string = "bar"
}

export const HasConfig = T.has(Config)

export const printFoo = T.accessServiceM(HasConfig)((c) =>
  T.effectTotal(() => {
    console.log(c.foo)
  })
)

export const layer = L.service(HasConfig)
  .prepare(
    T.delay_(
      T.effectTotal(() => new Config()),
      100
    )
  )
  .release(() =>
    T.effectTotal(() => {
      console.log("release")
    })
  )

export const { runPromise } = R.globalRuntime(layer)

runPromise(printFoo)
runPromise(printFoo)
runPromise(printFoo)

import { pipe } from "@effect-ts/system/Function"
import { has } from "@effect-ts/system/Has"

import * as DSL from "../../src/Prelude/DSL"
import * as X from "../../src/Pure"

test("09", () => {
  class MyServiceImpl {
    hello(message: string) {
      return X.sync(() => {
        console.log(`Yeah: ${message}`)
      })
    }
  }

  const MyService = has(MyServiceImpl)

  const F = {
    ...X.Monad,
    ...X.Access,
    ...X.Provide
  }

  const accessServiceM = DSL.accessServiceMF(F)
  const provideService = DSL.provideServiceF(F)

  const program = accessServiceM(MyService)((_) => _.hello("hello!"))

  pipe(program, provideService(MyService)(new MyServiceImpl()), X.runIO)
})

import { pipe } from "@effect-ts/system/Function"
import { tag } from "@effect-ts/system/Has"

import * as DSL from "../../src/Prelude/DSL/index.js"
import * as X from "../../src/XPure/index.js"

test("09", () => {
  const MyServiceId = Symbol()
  class MyServiceImpl {
    hello(message: string) {
      return X.succeedWith(() => {
        console.log(`Yeah: ${message}`)
      })
    }
  }

  const MyService = tag<MyServiceImpl>(MyServiceId)

  const F = {
    ...X.Monad,
    ...X.Access,
    ...X.Provide
  }

  const accessServiceM = DSL.accessServiceMF(F)
  const provideService = DSL.provideServiceF(F)

  const program = accessServiceM(MyService)((_) => _.hello("hello!"))

  pipe(program, provideService(MyService)(new MyServiceImpl()), X.run)
})

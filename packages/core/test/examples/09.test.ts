import { pipe } from "@effect-ts/system/Function"
import type { Has } from "@effect-ts/system/Has"
import { tag } from "@effect-ts/system/Has"

import * as DSL from "../../src/Prelude/DSL/index.js"
import * as X from "../../src/XPure/XReader/index.js"

test("09", () => {
  const MyServiceId = Symbol()
  class MyServiceImpl {
    hello(message: string) {
      return X.succeedWith(() => `Yeah: ${message}`)
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

  const program: X.XReader<Has<MyServiceImpl>, string> = accessServiceM(MyService)(
    (_) => _.hello("hello!")
  )

  expect(pipe(program, provideService(MyService)(new MyServiceImpl()), X.run)).toEqual(
    "Yeah: hello!"
  )
})

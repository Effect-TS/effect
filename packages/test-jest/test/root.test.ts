import * as fc from "fast-check"

import { testM, run, suite, mockedTestM, expect, property, arb } from "../src"

import * as T from "@matechs/core/Effect"

run(
  testM(
    "simple root",
    T.sync(() => expect(2).toBe(2))
  )
)()

const x = property(100)({
  a: arb(fc.integer())
})

run(
  suite("jest mock")(
    mockedTestM("test using mocked console")(() => ({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      info: jest.spyOn(console, "info").mockImplementation(() => {})
    }))(({ useMockM }) =>
      T.Do()
        .do(
          T.sync(() => {
            console.info("ok")
          })
        )
        .do(
          useMockM(({ info }) =>
            T.sync(() => {
              expect(info.mock.calls).toEqual([["ok"]])
            })
          )
        )
        .done()
    )
  )
)()

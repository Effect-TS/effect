import { left } from "@effect-ts/system/Either"
import { pipe } from "@effect-ts/system/Function"
import { has } from "@effect-ts/system/Has"

import * as T from "../../src/XPure/XEffect"

describe("XEffect", () => {
  it("access", () => {
    expect(
      pipe(
        T.access((_: number) => _),
        T.provideAll(1),
        T.run
      )
    ).toEqual(1)
  })
  it("accessM", () => {
    expect(
      pipe(
        T.accessM((_: number) => T.fail(_)),
        T.provideAll(1),
        T.runEither
      )
    ).toEqual(left(1))
  })
  it("accessServiceM/provideService", () => {
    interface Service {
      n: number
    }
    const service = has<Service>()
    expect(
      pipe(
        T.accessServiceM(service)((x) => T.succeed(x.n)),
        T.provideService(service)({ n: 1 }),
        T.run
      )
    ).toEqual(1)
  })
})

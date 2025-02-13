import { flow, identity, Option, pipe } from "effect"
import { describe, it } from "tstyche"

describe("Function", () => {
  describe("pipe", () => {
    it("We should only have one error for the missing definition", () => {
      const _x = (): number =>
        pipe(
          1,
          // @ts-expect-error
          add(1),
          identity
        )

      const _y = (): (n: number) => number =>
        flow(
          // @ts-expect-error
          add(1),
          identity
        )

      const _z = (): number =>
        Option.some(1).pipe(
          // @ts-expect-error
          add(1),
          identity
        )
    })
  })
})

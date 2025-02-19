import { hole, Micro } from "effect"
import { describe, expect, it } from "tstyche"

describe("Micro", () => {
  it("catchCauseIf", () => {
    expect(
      hole<Micro.Micro<number, string | number, "a">>().pipe(Micro.catchCauseIf(
        (cause): cause is Micro.MicroCause<string> => true,
        (cause) => {
          expect(cause).type.toBe<Micro.MicroCause<string>>()
          return hole<Micro.Micro<Date, boolean, "b">>()
        }
      ))
    ).type.toBe<Micro.Micro<number | Date, number | boolean, "a" | "b">>()

    expect(Micro.catchCauseIf(
      hole<Micro.Micro<number, string | number, "a">>(),
      (cause): cause is Micro.MicroCause<string> => true,
      (cause) => {
        expect(cause).type.toBe<Micro.MicroCause<string>>()
        return hole<Micro.Micro<Date, boolean, "b">>()
      }
    )).type.toBe<Micro.Micro<number | Date, number | boolean, "a" | "b">>()
  })
})

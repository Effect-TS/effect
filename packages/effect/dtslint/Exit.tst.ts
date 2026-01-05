import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"
import { describe, expect, it } from "tstyche"

declare const number$string: Exit.Exit<number, string>
declare const stringOrNumber$string: Exit.Exit<string | number, string>

describe("Exit", () => {
  it("exists", () => {
    if (Exit.exists(stringOrNumber$string, Predicate.isString)) {
      expect(stringOrNumber$string).type.toBe<Exit.Exit<string, never>>()
    }
    if (pipe(stringOrNumber$string, Exit.exists(Predicate.isString))) {
      // @tstyche fixme -- This doesn't work but it should
      expect(stringOrNumber$string).type.toBe<Exit.Exit<string, never>>()
    }
    if (Exit.exists(Predicate.isString)(stringOrNumber$string)) {
      expect(stringOrNumber$string).type.toBe<Exit.Exit<string, never>>()
    }

    if (
      pipe(
        number$string,
        Exit.exists((n) => {
          expect(n).type.toBe<number>()
          return true
        })
      )
    ) {
      expect(number$string).type.toBe<Exit.Exit<number, string>>()
    }

    if (
      pipe(
        number$string,
        Exit.exists((_sn: string | number) => true)
      )
    ) {
      expect(number$string).type.toBe<Exit.Exit<number, string>>()
    }
  })
})

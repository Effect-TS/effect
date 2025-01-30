import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("Map", () => {
  it("description", () => {
    strictEqual(
      String(S.Map({ key: S.String, value: S.Number })),
      "(ReadonlyArray<readonly [string, number]> <-> Map<string, number>)"
    )
  })
})

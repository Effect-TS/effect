import { assert, describe, it } from "@effect/vitest"
import * as Statement from "effect/unstable/sql/Statement"

describe("Statement", () => {
  it("defaultTransforms ignores inherited properties", () => {
    const row = Object.create({ inherited: 1 })
    row.own = 2

    const nested = Statement.defaultTransforms((key) => key)
    const flat = Statement.defaultTransforms((key) => key, false)

    assert.deepStrictEqual(nested.object(row), { own: 2 })
    assert.deepStrictEqual(nested.array([row]), [{ own: 2 }])
    assert.deepStrictEqual(flat.array([row]), [{ own: 2 }])
  })
})

import { assert, it } from "@effect/vitest"

import { AuthPersistence } from "@effect/auth-persistence"

it("decodes native PostgreSQL int8 values without losing integer precision", () => {
  const table = AuthPersistence.table({
    name: "integers",
    columns: { value: { name: "value", type: "integer" } },
    unique: []
  })

  const column = table.columns.value

  assert.strictEqual(column.decode(9_007_199_254_740_991n), Number.MAX_SAFE_INTEGER)

  assert.propertyVal(
    assert.throws(() => column.decode(9_007_199_254_740_992n)),
    "_tag",
    "PersistenceMappingError"
  )
})

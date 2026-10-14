import * as Statement from "effect/sql/Statement"
import * as Str from "effect/String"
import assert from "node:assert/strict"

const names = ["id", "user_id", "created_at", "organization_member_id", "field2_value"]

export const snakeToCamel = () => ({
  run: () => names.map(Str.snakeToCamel),
  validate: (result: unknown) =>
    assert.deepEqual(result, ["id", "userId", "createdAt", "organizationMemberId", "field2Value"])
})

export const snakeToPascal = () => ({
  run: () => names.map(Str.snakeToPascal),
  validate: (result: unknown) =>
    assert.deepEqual(result, ["Id", "UserId", "CreatedAt", "OrganizationMemberId", "Field2Value"])
})

export const noCase = () => ({
  run: () => names.map((name) => Str.noCase(name)),
  validate: (result: unknown) =>
    assert.deepEqual(result, ["id", "user id", "created at", "organization member id", "field 2 value"])
})

export const sqlRows = () => {
  const transform = Statement.defaultTransforms(Str.snakeToCamel).array
  const rows = Array.from({ length: 100 }, (_, id) => ({
    user_id: id,
    created_at: "2026-01-01",
    profile_data: { display_name: "Ada" }
  }))
  const expected = rows.map((row) => ({
    userId: row.user_id,
    createdAt: "2026-01-01",
    profileData: { displayName: "Ada" }
  }))
  return {
    run: () => transform(rows),
    validate: (result: unknown) => assert.deepEqual(result, expected)
  }
}

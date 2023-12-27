import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema/exports", () => {
  it("exports", () => {
    expect(S.parse).exist
    expect(S.parseSync).exist
    expect(S.parseOption).exist
    expect(S.parseEither).exist

    expect(S.decode).exist
    expect(S.decodeSync).exist
    expect(S.decodeOption).exist
    expect(S.decodeEither).exist

    expect(S.encode).exist
    expect(S.encodeSync).exist
    expect(S.encodeOption).exist
    expect(S.encodeEither).exist

    expect(S.validate).exist
    expect(S.validateSync).exist
    expect(S.validateOption).exist
    expect(S.validateEither).exist

    expect(S.GreaterThanBigintTypeId).exist
    expect(S.GreaterThanOrEqualToBigintTypeId).exist
    expect(S.LessThanBigintTypeId).exist
    expect(S.LessThanOrEqualToBigintTypeId).exist
    expect(S.BetweenBigintTypeId).exist
    expect(S.BrandTypeId).exist
    expect(S.FiniteTypeId).exist
    expect(S.GreaterThanTypeId).exist
    expect(S.GreaterThanOrEqualToTypeId).exist
    expect(S.MultipleOfTypeId).exist
    expect(S.IntTypeId).exist
    expect(S.LessThanTypeId).exist
    expect(S.LessThanOrEqualToTypeId).exist
    expect(S.BetweenTypeId).exist
    expect(S.NonNaNTypeId).exist
    expect(S.InstanceOfTypeId).exist
    expect(S.MinItemsTypeId).exist
    expect(S.MaxItemsTypeId).exist
    expect(S.ItemsCountTypeId).exist
    expect(S.TrimmedTypeId).exist
    expect(S.PatternTypeId).exist
    expect(S.StartsWithTypeId).exist
    expect(S.EndsWithTypeId).exist
    expect(S.IncludesTypeId).exist
    expect(S.UUIDTypeId).exist
    expect(S.ULIDTypeId).exist
  })
})

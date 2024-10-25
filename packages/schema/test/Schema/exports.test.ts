import * as S from "@effect/schema/Schema"
import { expect, it } from "vitest"

it("exports", () => {
  expect(S.decodeUnknown).exist
  expect(S.decodeUnknownSync).exist
  expect(S.decodeUnknownOption).exist
  expect(S.decodeUnknownEither).exist

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

  expect(S.GreaterThanBigIntTypeId).exist
  expect(S.GreaterThanOrEqualToBigIntTypeId).exist
  expect(S.LessThanBigIntTypeId).exist
  expect(S.LessThanOrEqualToBigIntTypeId).exist
  expect(S.BetweenBigIntTypeId).exist
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

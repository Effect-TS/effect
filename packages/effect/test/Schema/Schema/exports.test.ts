import * as S from "effect/Schema"
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

  expect(S.GreaterThanBigIntSchemaId).exist
  expect(S.GreaterThanOrEqualToBigIntSchemaId).exist
  expect(S.LessThanBigIntSchemaId).exist
  expect(S.LessThanOrEqualToBigIntSchemaId).exist
  expect(S.BetweenBigIntSchemaId).exist
  expect(S.BrandSchemaId).exist
  expect(S.FiniteSchemaId).exist
  expect(S.GreaterThanSchemaId).exist
  expect(S.GreaterThanOrEqualToSchemaId).exist
  expect(S.MultipleOfSchemaId).exist
  expect(S.IntSchemaId).exist
  expect(S.LessThanSchemaId).exist
  expect(S.LessThanOrEqualToSchemaId).exist
  expect(S.BetweenSchemaId).exist
  expect(S.NonNaNSchemaId).exist
  expect(S.InstanceOfSchemaId).exist
  expect(S.MinItemsSchemaId).exist
  expect(S.MaxItemsSchemaId).exist
  expect(S.ItemsCountSchemaId).exist
  expect(S.TrimmedSchemaId).exist
  expect(S.PatternSchemaId).exist
  expect(S.StartsWithSchemaId).exist
  expect(S.EndsWithSchemaId).exist
  expect(S.IncludesSchemaId).exist
  expect(S.UUIDSchemaId).exist
  expect(S.ULIDSchemaId).exist
})

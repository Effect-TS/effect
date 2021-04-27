// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema/primitives"
import { brand } from "./brand"
import type { NonEmptyBrand } from "./nonEmpty"
import { nonEmpty } from "./nonEmpty"
import { string } from "./string"

export type NonEmptyString = string & NonEmptyBrand

export const nonEmptyStringIdentifier = Symbol.for(
  "@effect-ts/schema/ids/nonEmptyString"
)

export const nonEmptyString = pipe(
  string,
  S.arbitrary((FC) => FC.string({ minLength: 1 })),
  nonEmpty,
  brand((_) => _ as NonEmptyString),
  S.mapApi((_) => ({})),
  S.identified(nonEmptyStringIdentifier, {})
)

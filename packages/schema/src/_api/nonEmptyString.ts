// tracing: off

import { pipe } from "@effect-ts/core/Function"

import { arbitrary, mapApi } from "../_schema/primitives"
import { brand } from "./brand"
import type { NonEmptyBrand } from "./nonEmpty"
import { nonEmpty } from "./nonEmpty"
import { string } from "./string"

export type NonEmptyString = string & NonEmptyBrand

export const nonEmptyString = pipe(
  string,
  arbitrary((FC) => FC.string({ minLength: 1 })),
  nonEmpty,
  brand((_) => _ as NonEmptyString),
  mapApi((_) => ({}))
)

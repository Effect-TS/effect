import * as Schema from "@effect/schema/Schema"

/** @internal */
export const IntegerFromString = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.annotations({
    identifier: "IntegerFromString"
  })
)

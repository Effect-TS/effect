import * as Schema from "effect/Schema"

/** @internal */
export const IntegerFromString = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.annotations({
    identifier: "IntegerFromString"
  })
)

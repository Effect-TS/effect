import * as Schema from "effect/Schema"

export const Athlete = Schema.Struct({
  id: Schema.Int.check(Schema.isGreaterThan(0)),
  firstname: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  lastname: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  profile: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
})

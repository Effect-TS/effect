import * as Schema from "effect/Schema"

export class ReleaseError extends Schema.TaggedError<ReleaseError>()("ReleaseError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}

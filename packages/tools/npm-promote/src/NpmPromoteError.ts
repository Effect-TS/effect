import * as Schema from "effect/Schema"

export class NpmPromoteError extends Schema.TaggedError<NpmPromoteError>()("NpmPromoteError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}

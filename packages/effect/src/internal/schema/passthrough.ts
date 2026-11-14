import * as Schema from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"

export const passthroughLink = Schema.link()(Schema.Any, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.passthrough()
})

import * as Headers from "../http/Headers.ts"
import * as Schema from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"

// Keep headers branded at runtime while encoding only their string entries.
export const HeadersSchema = Schema.Record(Schema.String, Schema.String).pipe(
  Schema.decodeTo(Schema.declare<Headers.Headers>(Headers.isHeaders), {
    decode: SchemaGetter.transform(Headers.fromInput),
    encode: SchemaGetter.transform((headers) => ({ ...headers }))
  })
)

/**
 * Schema for the comma-separated WebSocket sub-protocol list carried by the
 * `Sec-WebSocket-Protocol` header.
 *
 * To read the protocols requested by the current server request, see
 * `HttpSocketProtocols` in `effect/http`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as S from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"

/**
 * Schema for the `Sec-WebSocket-Protocol` header value.
 *
 * **Details**
 *
 * Decoding splits the header on commas, trims each protocol name and drops
 * empty tokens, so `"a, ,b"` decodes to `["a", "b"]`. Encoding joins the
 * protocol names with commas.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const Schema = S.String.pipe(
  S.decodeTo(S.Array(S.String), {
    decode: SchemaGetter.transform((header) =>
      header.split(",").map((protocol) => protocol.trim()).filter((protocol) => protocol !== "")
    ),
    encode: SchemaGetter.transform((protocols) => protocols.join(","))
  })
)

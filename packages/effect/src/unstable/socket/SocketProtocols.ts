/**
 * Schema for the WebSocket sub-protocol list carried by the
 * `Sec-WebSocket-Protocol` header.
 *
 * Clients advertise the sub-protocols they understand through the
 * `Sec-WebSocket-Protocol` request header as a comma-separated list. This
 * module exposes a schema for converting between the header string and an
 * array of protocol names.
 *
 * To read the negotiated protocols from the current server request, see
 * `HttpSocketProtocols` in `effect/unstable/http`.
 *
 * @since 4.0.0
 */
import * as S from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"

/**
 * Schema for the `Sec-WebSocket-Protocol` header value.
 *
 * **Details**
 *
 * Decoding splits the comma-separated header into an array of trimmed
 * protocol names, dropping empty tokens (so `"a,,b"` and `"a, ,b"` both
 * decode to `["a", "b"]`). Encoding joins the array back into a single header
 * value.
 *
 * @category schemas
 * @since 4.0.0
 */
export const Schema = S.String.pipe(
  S.decodeTo(S.Array(S.String), {
    decode: SchemaGetter.split({ separator: "," }).pipe(
      SchemaGetter.map((tokens) => tokens.map((token) => token.trim()).filter((token) => token !== ""))
    ),
    encode: SchemaGetter.transform((arr) => arr.join(","))
  })
)

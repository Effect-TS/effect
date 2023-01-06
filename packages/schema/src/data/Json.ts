/**
 * @since 1.0.0
 */
import type { Json } from "@fp-ts/data/Json"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const inline: S.Schema<Json> = I.lazy(() =>
  I.union(
    I._null,
    I.string,
    I.number,
    I.boolean,
    I.array(inline),
    I.record(I.string, inline)
  )
)

/**
 * @since 1.0.0
 */
export const json: S.Schema<Json> = I.typeAlias([], inline, {
  [H.DecoderTypeAliasHookId]: H.typeAliasHook(() => Decoder),
  [H.GuardTypeAliasHookId]: H.typeAliasHook(() => Guard),
  [H.EncoderTypeAliasHookId]: H.typeAliasHook(() => Encoder),
  [H.PrettyTypeAliasHookId]: H.typeAliasHook(() => Pretty),
  [H.ArbitraryTypeAliasHookId]: H.typeAliasHook(() => Arbitrary)
})

const Guard = I.makeGuard<Json>(json, I.isJson)

const Decoder = I.fromRefinement<Json>(json, I.isJson, (u) => DE.type("Json", u))

const Encoder = I.makeEncoder<unknown, Json>(json, DE.success)

const Arbitrary = I.makeArbitrary<Json>(json, (fc) => fc.jsonValue().map((json) => json as Json))

const Pretty = I.makePretty<Json>(json, (json) => JSON.stringify(json))

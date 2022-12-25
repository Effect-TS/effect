/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
import * as AH from "@fp-ts/schema/annotation/ArbitraryHooks"
import * as DH from "@fp-ts/schema/annotation/DecoderHooks"
import * as EH from "@fp-ts/schema/annotation/EncoderHooks"
import * as GH from "@fp-ts/schema/annotation/GuardHooks"
import * as PH from "@fp-ts/schema/annotation/PrettyHooks"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

const JsonSchema: S.Schema<Json> = I.lazy(() =>
  I.union(
    I.literal(null),
    I.string,
    I.number,
    I.boolean,
    I.array(JsonSchema),
    I.record(I.string, JsonSchema)
  )
)

/**
 * @since 1.0.0
 */
export const json: S.Schema<Json> = I.typeAlias([], JsonSchema, {
  [DH.TypeAliasHookId]: DH.typeAliasHook(() => Decoder),
  [GH.TypeAliasHookId]: GH.typeAliasHook(() => Guard),
  [EH.TypeAliasHookId]: EH.typeAliasHook(() => Encoder),
  [PH.TypeAliasHookId]: PH.typeAliasHook(() => Pretty),
  [AH.TypeAliasHookId]: AH.typeAliasHook(() => Arbitrary)
})

const Guard = I.makeGuard<Json>(json, I.isJson)

const Decoder = I.fromRefinement<Json>(json, I.isJson, (u) => DE.type("Json", u))

const Encoder = I.makeEncoder<unknown, Json>(json, identity)

const Arbitrary = I.makeArbitrary<Json>(json, (fc) => fc.jsonValue().map((json) => json as Json))

const Pretty = I.makePretty<Json>(json, (json) => JSON.stringify(json))

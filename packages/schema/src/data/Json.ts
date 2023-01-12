/**
 * @since 1.0.0
 */
import type { Json } from "@fp-ts/data/Json"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const json: S.Schema<Json> = I.lazy(() =>
  I.union(
    I._null,
    I.string,
    I.number,
    I.boolean,
    I.array(json),
    I.record(I.string, json)
  ), {
  [H.ArbitraryHookId]: H.hook(() => Arbitrary)
})

const Arbitrary = I.makeArbitrary<Json>(json, (fc) => fc.jsonValue().map((json) => json as Json))

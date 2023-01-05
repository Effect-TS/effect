import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/RefinementHook"
import { make } from "@fp-ts/schema/Arbitrary"
import * as S from "@fp-ts/schema/Schema"

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUUID = (s: string): s is string => uuidRegex.test(s)

/**
 * @since 1.0.0
 */
export const UUID: S.Schema<string> = pipe(
  S.string,
  S.filter(isUUID, { type: "UUID" }, {
    [H.ArbitraryRefinementHookId]: H.refinementHook(() => make(UUID, (fc) => fc.uuid()))
  })
)

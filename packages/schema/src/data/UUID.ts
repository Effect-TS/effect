import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/RefinementHook"
import { make } from "@fp-ts/schema/Arbitrary"
import * as S from "@fp-ts/schema/Schema"

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @since 1.0.0
 */
export const UUID: S.Schema<string> = pipe(
  S.string,
  S.pattern(uuidRegex, { type: "UUID" }, {
    [H.ArbitraryRefinementHookId]: H.refinementHook(() => make(UUID, (fc) => fc.uuid()))
  })
)

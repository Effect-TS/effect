/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import { CustomId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import { make } from "@fp-ts/schema/Arbitrary"
import * as S from "@fp-ts/schema/Schema"

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @since 1.0.0
 */
export const UUID: S.Schema<string> = pipe(
  S.string,
  S.pattern(uuidRegex),
  S.annotations({
    [CustomId]: { type: "UUID" },
    [H.ArbitraryHookId]: H.hook(() => make(UUID, (fc) => fc.uuid()))
  })
)

import { single } from "../../Array"
import type { Effect } from "../../Effect"
import { map } from "../../Effect"
import { flow } from "../../Function"
import type { Option } from "../../Option"
import type { Stream } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <S, R, E, A>(
  fa: Effect<S, R, Option<E>, A>
) => Stream<S, R, E, A> = flow(map(single), repeatEffectChunkOption)

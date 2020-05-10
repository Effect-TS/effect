import { Cause, Exit } from "../Exit"
import { NonEmptyArray } from "../NonEmptyArray"
import { some } from "../Option"

export function combineFinalizerExit<E, A>(
  fiberExit: Exit<E, A>,
  releaseExit: Exit<E, unknown>
): Exit<E, A> {
  if (fiberExit._tag === "Done" && releaseExit._tag === "Done") {
    return fiberExit
  } else if (fiberExit._tag === "Done") {
    return releaseExit as Cause<E>
  } else if (releaseExit._tag === "Done") {
    return fiberExit
  } else {
    return {
      ...fiberExit,
      remaining: some(
        fiberExit.remaining._tag === "Some"
          ? ([...fiberExit.remaining.value, releaseExit] as NonEmptyArray<Cause<any>>)
          : ([releaseExit] as NonEmptyArray<Cause<any>>)
      )
    }
  }
}

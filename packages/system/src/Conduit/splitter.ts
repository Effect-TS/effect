import * as T from "../Effect"
import { pipe } from "../Function"
import * as L from "../Persistent/List"
import * as Channel from "./Channel"
import * as Pipeline from "./Pipeline"
import * as S from "./Stream"

export function separate(
  split: string,
  state = ""
): Pipeline.Pipeline<unknown, never, string, string, void> {
  const splits = state.split(split)
  if (splits.length > 1) {
    const newState = splits.pop()!
    return Channel.chain_(S.fromIterable(splits), () => separate(split, newState))
  }
  return Channel.needInput(
    (i: string) => separate(split, state + i),
    () => S.fromIterable(splits)
  )
}

pipe(
  S.writeMany("a|b|c", "|d", "e|", "f"),
  Pipeline.fuse(separate("|")),
  S.runList,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(l))
    })
  ),
  T.runPromise
)

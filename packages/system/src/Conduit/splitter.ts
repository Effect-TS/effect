import * as T from "../Effect"
import { pipe } from "../Function"
import * as L from "../Persistent/List"
import * as Channel from "./Channel"
import * as S from "./Stream"

export function split(
  separator: string,
  state = ""
): Channel.Transducer<unknown, never, string, string> {
  const splits = state.split(separator)
  if (splits.length > 1) {
    const newState = splits.pop()!
    return Channel.chain_(Channel.writeIterable(splits), () =>
      split(separator, newState)
    )
  }
  return Channel.needInput(
    (i: string) => split(separator, state + i),
    () => Channel.writeIterable(splits)
  )
}

export function group(
  size: number,
  state: L.List<string> = L.empty()
): Channel.Transducer<unknown, never, string, L.List<string>> {
  if (state.length === size) {
    return Channel.chain_(Channel.write(state), () => group(size, L.empty()))
  }
  return Channel.needInput(
    (i: string) => group(size, L.append_(state, i)),
    () => Channel.write(state)
  )
}

pipe(
  S.writeMany("a|b|c", "|d", "e|", "f"),
  S.combine(split("|")["|>"](Channel.combine(group(2)))),
  S.runList,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(L.map_(l, L.toArray)))
    })
  ),
  T.runPromise
)

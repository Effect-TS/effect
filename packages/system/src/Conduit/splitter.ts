import * as T from "../Effect"
import { pipe } from "../Function"
import * as L from "../Persistent/List"
import { _R } from "../Utils"
import * as Channel from "./Channel"
import * as S from "./Stream"

export function split(separator: string) {
  function loop(state: string): Channel.Transducer<unknown, never, string, string> {
    const splits = state.split(separator)
    if (splits.length > 1) {
      const newState = splits.pop()!
      return Channel.chain_(Channel.writeIterable(splits), () => loop(newState))
    }
    return Channel.needInput(
      (i: string) => loop(state + i),
      () => Channel.writeIterable(splits)
    )
  }
  return loop("")
}

export function group(size: number) {
  function loop(
    state: L.List<string>
  ): Channel.Transducer<unknown, never, string, L.List<string>> {
    if (state.length === size) {
      return Channel.chain_(Channel.write(state), () => loop(L.empty()))
    }
    return Channel.needInput(
      (i: string) => loop(L.append_(state, i)),
      () => Channel.write(state)
    )
  }
  return loop(L.empty())
}

pipe(
  S.writeMany("a|b|c", "|d", "e|", "f")[".|"](split("|")[".|"](group(2))),
  S.runList,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(L.map_(l, L.toArray)))
    })
  ),
  T.runPromise
)

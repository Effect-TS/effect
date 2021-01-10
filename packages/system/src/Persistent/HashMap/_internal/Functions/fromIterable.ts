// copyright https://github.com/frptools

import { ChangeFlag } from "../../../_internal/Core/ChangeFlag"
import { commit } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { setKeyValue } from "../Primitives"
import { empty } from "./empty"

export function fromIterable<K, V>(iterable: Iterable<readonly [K, V]>): HashMap<K, V> {
  const map = <HashMap<K, V>>empty<K, V>(true)
  let current: IteratorResult<readonly [K, V]>
  const it = iterable[Symbol.iterator]()

  while (!(current = it.next()).done) {
    const entry = current.value
    const change = ChangeFlag.get()
    setKeyValue(entry[0], entry[1], change, map)
    change.release()
  }

  return commit(map)
}

// copyright https://github.com/frptools

import { ChangeFlag } from "../../../_internal/Core/ChangeFlag"
import { commit } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { setKeyValue } from "../Primitives"
import { empty } from "./empty"

export function fromObject<V>(object: {
  readonly [key: string]: V
}): HashMap<string, V> {
  const keys = Object.keys(object)

  const map = <HashMap<string, V>>empty<string, V>(true)

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = object[key]

    const change = ChangeFlag.get()
    setKeyValue(keys[i], value, change, map)
    change.release()
  }

  return commit(map)
}

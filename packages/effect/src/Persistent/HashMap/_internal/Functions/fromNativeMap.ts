// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"
import { fromIterable } from "./fromIterable"

export function fromNativeMap<K, V>(map: ReadonlyMap<K, V>): HashMap<K, V> {
  return fromIterable(map)
}

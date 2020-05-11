import type { Done } from "./Exit"

export function done<A>(v: A): Done<A> {
  return {
    _tag: "Done",
    value: v
  }
}

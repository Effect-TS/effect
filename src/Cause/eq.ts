import { equalsFiberID } from "../Fiber/id"
import { Stack } from "../Stack"
import type { Cause } from "./cause"

export function equalsCause<E>(x: Cause<E>, y: Cause<E>): boolean {
  if (
    x === y ||
    (x._tag === "Traced" && x.cause === y) ||
    (y._tag === "Traced" && x === y.cause) ||
    (x._tag === "Traced" && y._tag === "Traced" && x.cause === y.cause)
  ) {
    return true
  }
  type K = {
    x: Cause<E>
    y: Cause<E>
  }
  // eslint-disable-next-line prefer-const
  let current: K | undefined = { x, y }
  // eslint-disable-next-line prefer-const
  let causes: Stack<K> | undefined = undefined

  while (current) {
    if (current.x._tag === "Traced") {
      current = { x: current.x.cause, y: current.y }
    }
    if (current.y._tag === "Traced") {
      current = { x: current.x, y: current.y.cause }
    }
    switch (current.x._tag) {
      case "Fail": {
        if (!(current.y._tag === "Fail" && current.x.value === current.y.value)) {
          return false
        }
        current = undefined
        break
      }
      case "Die": {
        if (!(current.y._tag === "Die" && current.x.value === current.y.value)) {
          return false
        }
        current = undefined
        break
      }
      case "Empty": {
        if (!(current.y._tag === "Empty")) {
          return false
        }
        current = undefined
        break
      }
      case "Interrupt": {
        if (
          !(
            current.y._tag === "Interrupt" &&
            equalsFiberID(current.x.fiberId, current.y.fiberId)
          )
        ) {
          return false
        }
        current = undefined
        break
      }
      case "Both": {
        if (!(current.y._tag === "Both")) {
          return false
        }
        causes = new Stack(
          {
            x: current.x.right,
            y: current.y.right
          },
          causes
        )
        current = {
          x: current.x.left,
          y: current.y.left
        }
        break
      }
      case "Then": {
        if (!(current.y._tag === "Then")) {
          return false
        }
        causes = new Stack(
          {
            x: current.x.right,
            y: current.y.right
          },
          causes
        )
        current = {
          x: current.x.left,
          y: current.y.left
        }
        break
      }
      case "Traced": {
        throw new Error("BUG!")
      }
    }
    if (!current && causes) {
      current = causes.value
      causes = causes.previous
    }
  }
  return true
}

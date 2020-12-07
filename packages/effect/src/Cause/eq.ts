/**
 * tracing: off
 */
import { equalsFiberID } from "../Fiber/id"
import * as S from "../Sync"
import type { Cause } from "./cause"

/**
 * This is unsafe, if we make it safe it kills perf because Cause.isEmpty uses this
 */
export function equalsCause<E>(x: Cause<E>, y: Cause<E>): boolean {
  switch (x._tag) {
    case "Fail": {
      return y._tag === "Fail" && x.value === y.value
    }
    case "Empty": {
      return y._tag === "Empty"
    }
    case "Die": {
      return (
        y._tag === "Die" &&
        ((x.value instanceof Error &&
          y.value instanceof Error &&
          x.value.name === y.value.name &&
          x.value.message === y.value.message) ||
          x.value === y.value)
      )
    }
    case "Interrupt": {
      return y._tag === "Interrupt" && equalsFiberID(x.fiberId, y.fiberId)
    }
    case "Both": {
      return (
        y._tag === "Both" &&
        equalsCause(x.left, y.left) &&
        equalsCause(x.right, y.right)
      )
    }
    case "Then": {
      return (
        y._tag === "Then" &&
        equalsCause(x.left, y.left) &&
        equalsCause(x.right, y.right)
      )
    }
    case "Traced": {
      return equalsCause(x.cause, y)
    }
  }
}

export function equalsCauseSafe<E>(x: Cause<E>, y: Cause<E>): S.UIO<boolean> {
  return S.gen(function* (_) {
    switch (x._tag) {
      case "Fail": {
        return y._tag === "Fail" && x.value === y.value
      }
      case "Empty": {
        return y._tag === "Empty"
      }
      case "Die": {
        return (
          y._tag === "Die" &&
          ((x.value instanceof Error &&
            y.value instanceof Error &&
            x.value.name === y.value.name &&
            x.value.message === y.value.message) ||
            x.value === y.value)
        )
      }
      case "Interrupt": {
        return y._tag === "Interrupt" && equalsFiberID(x.fiberId, y.fiberId)
      }
      case "Both": {
        return (
          y._tag === "Both" &&
          (yield* _(equalsCauseSafe(x.left, y.left))) &&
          (yield* _(equalsCauseSafe(x.right, y.right)))
        )
      }
      case "Then": {
        return (
          y._tag === "Then" &&
          (yield* _(equalsCauseSafe(x.left, y.left))) &&
          (yield* _(equalsCauseSafe(x.right, y.right)))
        )
      }
      case "Traced": {
        return yield* _(equalsCauseSafe(x.cause, y))
      }
    }
  })
}

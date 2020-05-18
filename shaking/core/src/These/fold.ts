import type { These } from "fp-ts/lib/These"

export function fold<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B,
  onBoth: (e: E, a: A) => B
): (fa: These<E, A>) => B {
  return (fa) => {
    switch (fa._tag) {
      case "Left":
        return onLeft(fa.left)
      case "Right":
        return onRight(fa.right)
      case "Both":
        return onBoth(fa.left, fa.right)
    }
  }
}

import { isEmpty } from "./isEmpty"

/**
 * Break an array into its initial elements and the last element
 *
 * @since 2.5.0
 */
export function foldRight<A, B>(
  onNil: () => B,
  onCons: (init: ReadonlyArray<A>, last: A) => B
): (as: ReadonlyArray<A>) => B {
  return (as) =>
    isEmpty(as) ? onNil() : onCons(as.slice(0, as.length - 1), as[as.length - 1])
}

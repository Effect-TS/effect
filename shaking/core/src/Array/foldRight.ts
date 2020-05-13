import { foldRight as foldRight_1 } from "../Readonly/Array/foldRight"

/**
 * Break an array into its initial elements and the last element
 *
 * @since 2.0.0
 */
export const foldRight: <A, B>(
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
) => (as: Array<A>) => B = foldRight_1 as any

/**
 * Fixed-length comparison without early byte exits. JavaScript/JIT gives no hard timing guarantee.
 *
 * @internal
 */
export const equalBytes = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false
  let difference = 0

  for (let index = 0; index < left.length; index++) difference |= left[index]! ^ right[index]!

  return difference === 0
}

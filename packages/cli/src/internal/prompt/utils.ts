/** @internal */
export const displayRange = (cursor: number, total: number, maxVisible?: number) => {
  const max = maxVisible || total
  let startIndex = Math.min(total - max, cursor - Math.floor(max / 2))
  if (startIndex < 0) {
    startIndex = 0
  }
  const endIndex = Math.min(startIndex + max, total)
  return { startIndex, endIndex }
}

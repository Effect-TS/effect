/**
 * Get 32 bit hash of string.
 *
 * Based on:
 * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 */
export function hash(str: any) {
  if (typeof str === "number") return str
  if (typeof str !== "string") str += ""

  let hash = 0
  for (let i = 0, len = str.length; i < len; ++i) {
    const c = str.charCodeAt(i)
    hash = ((hash << 5) - hash + c) | 0
  }
  return hash
}

/**
 * Discord's limit on `content`, in code points, inclusive.
 *
 * @internal
 */
export const messageLength = 2000

/**
 * Code points, which is what Discord counts: a recorded probe took 2,000
 * astral emoji (4,000 UTF-16 units) and refused 1,999 letters and a flag.
 *
 * @internal
 */
export const codePoints = (text: string): number => {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) i++
    }
    count++
  }
  return count
}

/**
 * Cuts `text` to at most `max` code points.
 *
 * @internal
 */
export const cut = (text: string, max: number): string => {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    if (count === max) return text.slice(0, i)
    const code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) i++
    }
    count++
  }
  return text
}

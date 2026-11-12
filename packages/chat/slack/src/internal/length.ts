import { blocksCost } from "./emoji.ts"

/** `msg_too_long`: code points of `markdown_text` as sent, inclusive. @internal */
export const messageLength = 12_000

/** `msg_blocks_too_long`: Slack's count with every emoji as its shortcode, inclusive. @internal */
export const blocksLength = 13_200

/** @internal */
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

const lessThan = (text: string): number => {
  let count = 0
  for (let i = text.indexOf("<"); i !== -1; i = text.indexOf("<", i + 1)) count++
  return count
}

/**
 * What a Markdown string costs against `messageLength`, as an upper bound
 * that adds up. It is the larger of two counts: code points plus three for
 * every `<`, which may be sent as `&lt;`, and Slack's emoji-as-shortcode
 * count scaled from 13,200 to 12,000.
 *
 * @internal
 */
export const measure = (markdown: string): number =>
  Math.max(
    codePoints(markdown) + 3 * lessThan(markdown),
    Math.ceil(blocksCost(markdown) * 10 / 11)
  )

/** @internal */
export { blocksCost }

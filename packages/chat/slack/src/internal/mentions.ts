import type { Mention } from "effect/chat/ChatMessage"

type Kind = Mention["kind"]

interface Target {
  readonly kind: Kind
  readonly id: string
}

/** A mention token in `text`, as Slack writes it. */
const tokenPattern =
  /<(@([UW][A-Z0-9]+)|!subteam\^([A-Z0-9]+)|#(C[A-Z0-9]+|G[A-Z0-9]+)|!(here|channel|everyone))(\|[^<>]*)?>/g

/**
 * Parses one token, `<@U123>`, `<!subteam^S123|@team>`, `<#C123|name>` or
 * `<!here>`, as the whole of `slice`.
 *
 * @internal
 */
export const parseToken = (slice: string): Target | undefined => {
  tokenPattern.lastIndex = 0
  const match = tokenPattern.exec(slice)
  if (match === null || match.index !== 0 || match[0].length !== slice.length) return undefined
  return targetOf(match)
}

const targetOf = (match: RegExpExecArray): Target => {
  const [, , user, group, channel, broadcast] = match
  if (user !== undefined) return { kind: "user", id: user }
  if (group !== undefined) return { kind: "role", id: group }
  if (channel !== undefined) return { kind: "channel", id: channel }
  return { kind: "broadcast", id: broadcast! }
}

interface Token extends Target {
  readonly start: number
  readonly end: number
}

const tokens = (text: string, skipCode: boolean): Array<Token> => {
  const code: Array<readonly [number, number]> = []
  if (skipCode) {
    const codePattern = /```[\s\S]*?```|`[^`\n]+`/g
    for (let match = codePattern.exec(text); match !== null; match = codePattern.exec(text)) {
      code.push([match.index, match.index + match[0].length])
    }
  }
  const found: Array<Token> = []
  tokenPattern.lastIndex = 0
  for (let match = tokenPattern.exec(text); match !== null; match = tokenPattern.exec(text)) {
    const start = match.index
    if (code.some(([from, to]) => start >= from && start < to)) continue
    found.push({ ...targetOf(match), start, end: start + match[0].length })
  }
  return found
}

const isObject = (u: unknown): u is Record<string, unknown> => typeof u === "object" && u !== null && !Array.isArray(u)

interface Item extends Target {
  readonly real: boolean
}

/**
 * The items of a message's `rich_text` blocks that a token in `text` can
 * stand for, in order. A `user`, `usergroup`, `channel` or `broadcast`
 * element is a real mention, unless it has code style or sits in a
 * preformatted section. A token-shaped string in text elements (adjacent
 * ones joined) is a literal, as is a code-styled element. `undefined` when
 * the message has no `rich_text` block.
 */
const richTextItems = (blocks: unknown): Array<Item> | undefined => {
  if (!Array.isArray(blocks)) return undefined
  const rich = blocks.filter((block) => isObject(block) && block.type === "rich_text")
  if (rich.length === 0) return undefined
  const items: Array<Item> = []
  let pending = ""
  const flushText = () => {
    if (pending === "") return
    for (const token of tokens(pending, false)) items.push({ kind: token.kind, id: token.id, real: false })
    pending = ""
  }
  const walk = (element: unknown, inCode: boolean): void => {
    if (!isObject(element)) return
    const code = inCode || element.type === "rich_text_preformatted"
    const style = element.style
    const literal = code || (isObject(style) && style.code === true)
    let target: Target | undefined
    switch (element.type) {
      case "text":
        if (typeof element.text === "string") pending += element.text
        return
      case "user":
        if (typeof element.user_id === "string") target = { kind: "user", id: element.user_id }
        break
      case "usergroup":
        if (typeof element.usergroup_id === "string") target = { kind: "role", id: element.usergroup_id }
        break
      case "channel":
        if (typeof element.channel_id === "string") target = { kind: "channel", id: element.channel_id }
        break
      case "broadcast":
        if (typeof element.range === "string") target = { kind: "broadcast", id: element.range }
        break
    }
    if (target !== undefined) {
      flushText()
      items.push({ ...target, real: !literal })
      return
    }
    if (Array.isArray(element.elements)) {
      flushText()
      for (const child of element.elements) walk(child, code)
      flushText()
    }
  }
  for (const block of rich) walk(block, false)
  flushText()
  return items
}

/**
 * The mentions of a message with offsets into `text`.
 *
 * - With a `rich_text` block, the mentions are its real mention elements.
 *   The tokens in `text` are walked in order against the block's items: a
 *   token takes the next item it equals, and only a real item makes it a
 *   mention. When a real item is passed over without a token, the text scan
 *   below is used instead.
 * - Without one, `text` is scanned, skipping backtick code spans and fences.
 *   That covers Block Kit posts, attachment-only posts and system messages.
 *
 * @internal
 */
export const extract = (
  text: string,
  blocks: unknown,
  botUserId: string
): Array<Mention> => {
  const toMention = (token: Token): Mention => ({
    kind: token.kind,
    id: token.id,
    start: token.start,
    end: token.end,
    isSelf: token.kind === "user" && token.id === botUserId
  })
  const items = richTextItems(blocks)
  if (items !== undefined) {
    const matched: Array<Mention> = []
    let next = 0
    let complete = true
    for (const token of tokens(text, false)) {
      let found = next
      while (found < items.length && !(items[found].kind === token.kind && items[found].id === token.id)) found++
      if (found === items.length) continue
      if (items.slice(next, found).some((item) => item.real)) complete = false
      if (items[found].real) matched.push(toMention(token))
      next = found + 1
    }
    if (items.slice(next).some((item) => item.real)) complete = false
    if (complete) return matched
  }
  return tokens(text, true).map(toMention)
}

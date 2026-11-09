/**
 * The browser host's head sync: it diffs each merged `Head.Head` against the
 * document, owning only marked tags plus `<title>` and `lang` / `dir`.
 */
import * as Head from "../../Head.ts"

type Warn = (message: string) => void

const ldType = "application/ld+json"

/** A tag's signature: its name, its attributes but the marker, and a script's text. */
const signatureOf = (element: Element): string => {
  const attributes: Array<string> = []
  for (const attribute of element.attributes) {
    if (attribute.name !== Head.marker) attributes.push(`${attribute.name}=${attribute.value}`)
  }
  attributes.sort()
  const text = element.localName === "script" ? element.textContent ?? "" : ""
  return `${element.localName}\u0000${attributes.join("\u0000")}\u0000${text}`
}

interface Wanted {
  readonly tag: "meta" | "link" | "script"
  readonly attributes: ReadonlyArray<readonly [string, string]>
  readonly text: string
  readonly signature: string
}

const wanted = (tag: Wanted["tag"], attributes: ReadonlyArray<readonly [string, string]>, text: string): Wanted => ({
  tag,
  attributes,
  text,
  signature: `${tag}\u0000${attributes.map(([name, value]) => `${name}=${value}`).sort().join("\u0000")}\u0000${text}`
})

const wantedOf = (head: Head.Head): Array<Wanted> => [
  ...head.meta.map((entry) => wanted("meta", Head.attributes(entry), "")),
  ...head.links.map((entry) => wanted("link", Head.attributes(entry), "")),
  ...head.jsonLd.map((entry) => wanted("script", [["type", ldType]], entry.json))
]

const quote = (value: string): string => value.replace(/["\\]/g, (char) => `\\${char}`)

/** The attribute names the marker on `<html>` or `<body>` lists. */
const listed = (element: Element): ReadonlyArray<string> =>
  (element.getAttribute(Head.marker) ?? "").split(/[\t\n\f\r ]+/).filter((name) => name !== "")

interface Owner {
  readonly element: Element
  /** The shell's values of the attributes the framework took over, captured before the first write. */
  readonly original: Map<string, string | null>
  tokens: ReadonlySet<string>
  data: ReadonlySet<string>
}

/**
 * Makes the `head` member of the DOM host.
 *
 * @internal
 */
export const make = (document: Document, warn: Warn): (head: Head.Head) => void => {
  const root = document.documentElement
  const html: Owner = { element: root, original: new Map(), tokens: new Set(), data: new Set() }
  const body: Owner | undefined = document.body === null
    ? undefined
    : { element: document.body, original: new Map(), tokens: new Set(), data: new Set() }
  // Captured at startup, before any entry takes the singletons over. What the server marked as the
  // framework's has no shell value to go back to.
  const serverSet = new Set([
    ...listed(root).map((name) => `html ${name}`),
    ...(body ? listed(body.element).map((name) => `body ${name}`) : [])
  ])
  const shellValue = (owner: Owner, name: string) =>
    serverSet.has(`${owner.element.localName} ${name}`) ? null : owner.element.getAttribute(name)
  const titleElement = document.querySelector("title")
  const originalTitle = titleElement !== null && titleElement.hasAttribute(Head.marker) ? "" : document.title
  for (const name of ["lang", "dir"]) html.original.set(name, shellValue(html, name))
  let owned: Map<string, Array<Element>> | undefined
  let titleOwned = false

  const index = () => {
    // Hydration: the server's marked tags are indexed, so a first flush that wants them changes nothing.
    const out = new Map<string, Array<Element>>()
    for (
      const element of document.head.querySelectorAll(
        `meta[${Head.marker}], link[${Head.marker}], script[${Head.marker}]`
      )
    ) {
      const signature = signatureOf(element)
      const list = out.get(signature)
      if (list === undefined) out.set(signature, [element])
      else list.push(element)
    }
    return out
  }

  const checkShell = (head: Head.Head) => {
    // Attributes are compared directly rather than through selectors built from entry values.
    const shellTags = [...document.head.children].filter((element) => !element.hasAttribute(Head.marker))
    const unmarked = (tag: string, attributes: ReadonlyArray<readonly [string, string]>) =>
      shellTags.some((element) =>
        element.localName === tag && attributes.every(([name, value]) => element.getAttribute(name) === value)
      )
    const describe = (tag: string, attributes: ReadonlyArray<readonly [string, string]>) =>
      tag + attributes.map(([name, value]) => `[${name}="${quote(value)}"]`).join("")
    const duplicates = (tag: string, attributes: ReadonlyArray<readonly [string, string]>) => {
      if (unmarked(tag, attributes)) {
        warn(`Head: the shell has its own ${describe(tag, attributes)}, which a head entry also sets`)
      }
    }
    for (const entry of head.meta) {
      duplicates("meta", [entry.name !== undefined ? ["name", entry.name] : ["property", entry.property ?? ""]])
    }
    for (const entry of head.links) {
      duplicates(
        "link",
        entry.attributes.rel === "canonical"
          ? [["rel", "canonical"]]
          : [["rel", entry.attributes.rel], ["href", entry.attributes.href]]
      )
    }
    if (head.jsonLd.length > 0 && unmarked("script", [["type", ldType]])) {
      warn("Head: the shell has a static JSON-LD block alongside the head's JSON-LD entries")
    }
    if (head.title !== undefined) {
      const first = document.querySelector("title")
      if (
        first !== null && !first.hasAttribute(Head.marker) && document.querySelector(`title[${Head.marker}]`) !== null
      ) {
        warn("Head: an unmarked <title> comes before the marked one, so the browser shows the shell's")
      }
    }
    const lang = html.original.get("lang")
    if (head.html.lang !== undefined && lang != null && lang !== head.html.lang && !listed(root).includes("lang")) {
      warn(`Head: the shell's lang="${lang}" disagrees with the head's "${head.html.lang}"`)
    }
    // An attribute the server listed in the marker must hold what the head wants: HTML keeps the first
    // copy of a duplicated attribute, so the shell's own copy shadows it.
    const missing = (owner: Owner | undefined, want: Head.Head["body"]) => {
      if (owner === undefined) return
      const names = listed(owner.element)
      if (names.includes("class")) {
        const tokens = want.class.filter((token) => !owner.element.classList.contains(token))
        if (tokens.length > 0) {
          warn(`Head: <${owner.element.localName}> is missing the class tokens ${tokens.join(" ")} the marker lists`)
        }
      }
      for (const [name, value] of Object.entries(want.data)) {
        if (names.includes(name) && owner.element.getAttribute(name) !== value) {
          warn(`Head: <${owner.element.localName}> ${name} doesn't hold the value the marker lists`)
        }
      }
    }
    missing(html, head.html)
    missing(body, head.body)
  }

  /** Sets `name`, or restores the shell's value once the framework no longer sets it. */
  const attribute = (owner: Owner, name: string, value: string | undefined) => {
    const element = owner.element
    if (value !== undefined) {
      if (!owner.original.has(name)) owner.original.set(name, shellValue(owner, name))
      if (element.getAttribute(name) !== value) element.setAttribute(name, value)
      return true
    }
    if (!owner.original.has(name)) return false
    const original = owner.original.get(name) ?? null
    if (name !== "lang" && name !== "dir") owner.original.delete(name)
    if (original === null) element.removeAttribute(name)
    else if (element.getAttribute(name) !== original) element.setAttribute(name, original)
    return false
  }

  const element = (owner: Owner | undefined, want: Head.Head["body"], extra: ReadonlyArray<string>) => {
    if (owner === undefined) return
    const set: Array<string> = [...extra]
    // Class tokens are owned once an entry contributes them, and removed once none does.
    const tokens = new Set(want.class)
    for (const token of owner.tokens) if (!tokens.has(token)) owner.element.classList.remove(token)
    for (const token of tokens) if (!owner.element.classList.contains(token)) owner.element.classList.add(token)
    owner.tokens = tokens
    if (tokens.size > 0) set.push("class")
    const data = new Set(Object.keys(want.data))
    for (const name of owner.data) if (!data.has(name)) attribute(owner, name, undefined)
    for (const name of data) attribute(owner, name, want.data[name])
    owner.data = data
    set.push(...data)
    const marker = set.join(" ")
    if (marker === "") owner.element.removeAttribute(Head.marker)
    else if (owner.element.getAttribute(Head.marker) !== marker) owner.element.setAttribute(Head.marker, marker)
  }

  return (head) => {
    if (owned === undefined) {
      checkShell(head)
      owned = index()
    }

    if (head.title !== undefined) {
      titleOwned = true
      if (document.title !== head.title) document.title = head.title
    } else if (titleOwned) {
      titleOwned = false
      if (document.title !== originalTitle) document.title = originalTitle
    }

    const extra: Array<string> = []
    if (attribute(html, "lang", head.html.lang)) extra.push("lang")
    if (attribute(html, "dir", head.html.dir)) extra.push("dir")
    element(html, head.html, extra)
    element(body, head.body, [])

    const next = new Map<string, Array<Element>>()
    const tags: Array<Element> = []
    for (const want of wantedOf(head)) {
      let tag = owned.get(want.signature)?.shift()
      if (tag === undefined) {
        tag = document.createElement(want.tag)
        for (const [name, value] of want.attributes) tag.setAttribute(name, value)
        tag.setAttribute(Head.marker, "")
        if (want.text !== "") tag.textContent = want.text
      }
      tags.push(tag)
      const list = next.get(want.signature)
      if (list === undefined) next.set(want.signature, [tag])
      else list.push(tag)
    }
    for (const stale of owned.values()) for (const tag of stale) tag.remove()
    owned = next
    // The managed tags follow the merged order, which decides stylesheet precedence. A reused tag
    // that's already in order stays where it is; the others are placed after the previous one.
    let previous: Element | undefined
    for (const tag of tags) {
      const inOrder = tag.isConnected &&
        (previous === undefined || (previous.compareDocumentPosition(tag) & tag.DOCUMENT_POSITION_FOLLOWING) !== 0)
      if (!inOrder) {
        const before = previous !== undefined
          ? previous.nextSibling
          : tags.find((other) => other !== tag && other.isConnected) ?? null
        document.head.insertBefore(tag, before)
      }
      previous = tag
    }
  }
}

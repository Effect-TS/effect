/**
 * Server HTML: the tree, the head tags and the `<html>` / `<body>` attributes
 * as escaped strings.
 */
import * as Head from "effect/ui/Head"
import type * as Renderer from "effect/ui/Renderer"
import * as markers from "./markers.ts"

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

const voidTags: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr"
])

/** Elements whose first newline the HTML parser drops. */
const newlineTags: ReadonlySet<string> = new Set(["pre", "textarea", "listing"])

const escapeText = (text: string): string =>
  text.replace(/[&<>]/g, (char) => char === "&" ? "&amp;" : char === "<" ? "&lt;" : "&gt;")

const escapeAttribute = (value: string): string =>
  value.replace(/[&"<>]/g, (char) => char === "&" ? "&amp;" : char === "\"" ? "&quot;" : char === "<" ? "&lt;" : "&gt;")

type ServerNode = Renderer.ServerNode
type ServerElement = Extract<ServerNode, { readonly _tag: "Element" }>

const textOf = (nodes: ReadonlyArray<ServerNode>): string =>
  nodes.map((node) => node._tag === "Text" ? node.text : textOf(node.children)).join("")

/**
 * An element's attributes, with its controlled properties written as the
 * attributes that give the same initial state. Other properties are set when
 * the client adopts the element.
 */
const elementAttributes = (node: ServerElement, selectValue: string | undefined): Map<string, string> => {
  const out = new Map(Object.entries(node.attrs))
  for (const [name, value] of Object.entries(node.props)) {
    switch (name) {
      case "value":
        if (node.tag !== "textarea" && node.tag !== "select" && value !== undefined) out.set("value", String(value))
        break
      case "checked":
      case "selected":
      case "open":
        if (value === true) out.set(name, "")
        else out.delete(name)
        break
    }
  }
  if (node.tag === "option" && selectValue !== undefined && !Object.hasOwn(node.props, "selected")) {
    const value = node.attrs.value ?? textOf(node.children)
    if (value === selectValue) out.set("selected", "")
  }
  return out
}

/** @internal */
export const toHtml = (nodes: ReadonlyArray<ServerNode>, selectValue?: string): string => {
  let out = ""
  for (const node of nodes) {
    switch (node._tag) {
      case "Text":
        out += escapeText(node.text)
        break
      case "Range":
        out += markers.open(node.path) + toHtml(node.children, selectValue) + markers.close(node.path)
        break
      case "Element": {
        out += `<${node.tag}`
        for (const [name, value] of elementAttributes(node, selectValue)) {
          out += value === "" ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`
        }
        out += ">"
        if (voidTags.has(node.tag)) break
        const value = node.props.value
        let inner = node.tag === "textarea" && node.children.length === 0 && value !== undefined
          ? escapeText(String(value))
          : toHtml(
            node.children,
            node.tag === "select" && value !== undefined
              ? String(value)
              : node.tag === "option" || node.tag === "optgroup"
              ? selectValue
              : undefined
          )
        if (newlineTags.has(node.tag) && inner.startsWith("\n")) inner = `\n${inner}`
        out += `${inner}</${node.tag}>`
        break
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

const tag = (name: string, pairs: ReadonlyArray<readonly [string, string]>): string =>
  `<${name}${pairs.map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("")} ${Head.marker}>`

/** @internal */
export const headTags = (head: Head.Head): string => {
  let out = head.title === undefined ? "" : `<title ${Head.marker}>${escapeText(head.title)}</title>`
  for (const entry of head.meta) out += tag("meta", Head.attributes(entry))
  for (const entry of head.links) out += tag("link", Head.attributes(entry))
  // The JSON is canonical, with `<` escaped, so it can't end the script.
  for (const entry of head.jsonLd) out += `${tag("script", [["type", "application/ld+json"]])}${entry.json}</script>`
  return out
}

/** The attributes the head sets on `<html>`, in the order the browser host lists them in the marker. */
/** @internal */
export const htmlOwned = (head: Head.Head): ReadonlyArray<readonly [string, string]> => [
  ...(head.html.lang === undefined ? [] : [["lang", head.html.lang] as const]),
  ...(head.html.dir === undefined ? [] : [["dir", head.html.dir] as const]),
  ...bodyOwned({ ...head, body: head.html })
]

/** @internal */
export const bodyOwned = (head: Head.Head): ReadonlyArray<readonly [string, string]> => [
  ...(head.body.class.length === 0 ? [] : [["class", head.body.class.join(" ")] as const]),
  ...Object.entries(head.body.data)
]

/** Escaped attributes, plus the marker listing their names; empty when the head sets none. */
/** @internal */
export const attributes = (pairs: ReadonlyArray<readonly [string, string]>): string =>
  pairs.length === 0 ? "" : [
    ...pairs.map(([name, value]) => `${name}="${escapeAttribute(value)}"`),
    `${Head.marker}="${pairs.map(([name]) => name).join(" ")}"`
  ].join(" ")

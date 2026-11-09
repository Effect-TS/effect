/**
 * Queries by ARIA role and accessible name, computed from tags and
 * attributes, so a test finds elements the way assistive technology does.
 *
 * The same queries run over a story's view value, a `TestHost` tree and a
 * real DOM tree. `role` is a `Query` locator, so it combines with
 * `Query.inside` on the first two. On the DOM, `click`, `input`, `keyDown`
 * and `submit` act as the user would, through real DOM events.
 *
 * Hidden elements (`hidden`, `aria-hidden="true"`, `<input type="hidden">`)
 * and everything inside them are left out unless `hidden: true` is passed.
 *
 * **Example** (Finding a button by its name)
 *
 * ```ts import.meta.vitest
 * import { HtmlQuery } from "@effect/ui-html/testing"
 *
 * const tree = {
 *   tag: "form",
 *   children: [
 *     { tag: "label", attrs: { for: "new" }, children: [{ text: "New todo" }] },
 *     { tag: "input", attrs: { id: "new" } },
 *     { tag: "button", attrs: { type: "submit" }, children: [{ text: "Add" }] }
 *   ]
 * }
 *
 * console.log(HtmlQuery.getByRole(tree, "button", { name: "Add" }) === tree.children[2]) // true
 * console.log(HtmlQuery.nameOf(tree, HtmlQuery.getByRole(tree, "textbox"))) // "New todo"
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import type * as Query from "effect/ui/testing/Query"

// ---------------------------------------------------------------------------
// trees
// ---------------------------------------------------------------------------

/** One way to read a tree: the structural `Query.Node` shape or the DOM. */
interface Reader<N> {
  readonly isElement: (node: N) => boolean
  readonly tag: (node: N) => string
  readonly attr: (node: N, name: string) => string | undefined
  readonly prop: (node: N, name: string) => unknown
  readonly children: (node: N) => ReadonlyArray<N>
  /** The text of a text node, or `undefined` for anything else. */
  readonly text: (node: N) => string | undefined
}

const isDom = (node: unknown): node is globalThis.Node =>
  typeof node === "object" && node !== null && typeof (node as { nodeType?: unknown }).nodeType === "number"

const domReader: Reader<globalThis.Node> = {
  isElement: (node) => node.nodeType === 1,
  tag: (node) => (node as globalThis.Element).localName,
  attr: (node, name) =>
    node.nodeType === 1 ? ((node as globalThis.Element).getAttribute(name) ?? undefined) : undefined,
  prop: (node, name) => (node as any)[name],
  children: (node) => Array.from(node.childNodes),
  text: (node) => node.nodeType === 3 ? (node as globalThis.Text).data : undefined
}

const structuralReader: Reader<Query.Node> = {
  isElement: (node) => node.tag !== undefined,
  tag: (node) => node.tag!,
  attr: (node, name) => node.attrs?.[name],
  prop: (node, name) => (node as { readonly props?: Readonly<Record<string, unknown>> }).props?.[name],
  children: (node) => node.children ?? [],
  text: (node) => node.tag === undefined ? node.text : undefined
}

const readerOf = (node: unknown): Reader<any> => isDom(node) ? domReader : structuralReader

// ---------------------------------------------------------------------------
// roles
// ---------------------------------------------------------------------------

/** Elements under which `header` and `footer` lose their landmark role. */
const sectioning: ReadonlySet<string> = new Set(["article", "aside", "main", "nav", "section"])

const fixedRoles: Readonly<Record<string, string>> = {
  article: "article",
  aside: "complementary",
  blockquote: "blockquote",
  button: "button",
  caption: "caption",
  code: "code",
  datalist: "listbox",
  dd: "definition",
  del: "deletion",
  details: "group",
  dfn: "term",
  dialog: "dialog",
  dt: "term",
  em: "emphasis",
  fieldset: "group",
  figure: "figure",
  form: "form",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  hr: "separator",
  ins: "insertion",
  li: "listitem",
  main: "main",
  menu: "list",
  meter: "meter",
  nav: "navigation",
  ol: "list",
  optgroup: "group",
  option: "option",
  output: "status",
  p: "paragraph",
  progress: "progressbar",
  search: "search",
  strong: "strong",
  sub: "subscript",
  sup: "superscript",
  table: "table",
  tbody: "rowgroup",
  td: "cell",
  textarea: "textbox",
  tfoot: "rowgroup",
  thead: "rowgroup",
  time: "time",
  tr: "row",
  ul: "list"
}

const inputRole = (type: string, hasList: boolean): string | undefined => {
  switch (type) {
    case "button":
    case "image":
    case "reset":
    case "submit":
      return "button"
    case "checkbox":
      return "checkbox"
    case "radio":
      return "radio"
    case "range":
      return "slider"
    case "number":
      return "spinbutton"
    case "search":
      return hasList ? "combobox" : "searchbox"
    case "":
    case "email":
    case "tel":
    case "text":
    case "url":
      return hasList ? "combobox" : "textbox"
    default:
      return undefined
  }
}

/** Roles whose accessible name comes from their content when nothing else names them. */
const nameFromContent: ReadonlySet<string> = new Set([
  "button",
  "cell",
  "checkbox",
  "columnheader",
  "gridcell",
  "heading",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "row",
  "rowheader",
  "switch",
  "tab",
  "tooltip",
  "treeitem"
])

// ---------------------------------------------------------------------------
// the index of a tree
// ---------------------------------------------------------------------------

interface Entry<N> {
  readonly node: N
  readonly role: string | undefined
  readonly hidden: boolean
  /** The `label` elements this element sits inside, innermost first. */
  readonly labels: ReadonlyArray<N>
  readonly inSection: boolean
}

interface Index<N> {
  readonly reader: Reader<N>
  readonly entries: ReadonlyArray<Entry<N>>
  readonly byNode: Map<N, Entry<N>>
  readonly byId: Map<string, N>
  readonly labelsFor: Map<string, Array<N>>
}

const isHidden = <N>(reader: Reader<N>, node: N): boolean =>
  reader.attr(node, "hidden") !== undefined ||
  reader.attr(node, "aria-hidden") === "true" ||
  (reader.tag(node) === "input" && (reader.attr(node, "type") ?? "").toLowerCase() === "hidden") ||
  reader.tag(node) === "template"

const implicitRole = <N>(reader: Reader<N>, node: N, inSection: boolean): string | undefined => {
  const tag = reader.tag(node)
  switch (tag) {
    case "a":
    case "area":
      return reader.attr(node, "href") !== undefined ? "link" : undefined
    case "header":
      return inSection ? undefined : "banner"
    case "footer":
      return inSection ? undefined : "contentinfo"
    case "img":
      return reader.attr(node, "alt") === "" ? "presentation" : "img"
    case "input":
      return inputRole((reader.attr(node, "type") ?? "").toLowerCase(), reader.attr(node, "list") !== undefined)
    case "select": {
      const size = Number(reader.attr(node, "size") ?? "1")
      return reader.attr(node, "multiple") !== undefined || size > 1 ? "listbox" : "combobox"
    }
    case "section":
      return reader.attr(node, "aria-label") !== undefined || reader.attr(node, "aria-labelledby") !== undefined ||
          reader.attr(node, "title") !== undefined
        ? "region"
        : undefined
    case "th":
      return reader.attr(node, "scope") === "row" ? "rowheader" : "columnheader"
    default:
      return fixedRoles[tag]
  }
}

const buildIndex = <N>(root: N): Index<N> => {
  const reader = readerOf(root) as Reader<N>
  const index: Index<N> = {
    reader,
    entries: [],
    byNode: new Map(),
    byId: new Map(),
    labelsFor: new Map()
  }
  const entries = index.entries as Array<Entry<N>>
  const walk = (node: N, hidden: boolean, labels: ReadonlyArray<N>, inSection: boolean) => {
    if (!reader.isElement(node)) return
    const tag = reader.tag(node)
    const isHiddenHere = hidden || isHidden(reader, node)
    const explicit = reader.attr(node, "role")?.trim().split(/\s+/)[0]
    const entry: Entry<N> = {
      node,
      role: explicit !== undefined && explicit !== "" ? explicit : implicitRole(reader, node, inSection),
      hidden: isHiddenHere,
      labels,
      inSection
    }
    entries.push(entry)
    index.byNode.set(node, entry)
    const id = reader.attr(node, "id")
    if (id !== undefined && !index.byId.has(id)) index.byId.set(id, node)
    if (tag === "label") {
      const target = reader.attr(node, "for")
      if (target !== undefined) {
        const list = index.labelsFor.get(target) ?? []
        list.push(node)
        index.labelsFor.set(target, list)
      }
    }
    const childLabels = tag === "label" ? [node, ...labels] : labels
    const childSection = inSection || sectioning.has(tag)
    for (const child of reader.children(node)) walk(child, isHiddenHere, childLabels, childSection)
  }
  walk(root, false, [], false)
  return index
}

// ---------------------------------------------------------------------------
// accessible names
// ---------------------------------------------------------------------------

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim()

const phrasing: ReadonlySet<string> = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "code",
  "data",
  "del",
  "dfn",
  "em",
  "i",
  "ins",
  "kbd",
  "label",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var"
])

/** The text an element contributes as content: its text, with hidden parts and controls left out. */
const contentText = <N>(index: Index<N>, node: N, skip: N | undefined, includeHidden: boolean): string => {
  const { reader } = index
  const text = reader.text(node)
  if (text !== undefined) return text
  if (!reader.isElement(node) || node === skip) return ""
  if (!includeHidden && isHidden(reader, node)) return ""
  const tag = reader.tag(node)
  if (tag === "br") return " "
  if (tag === "img") return reader.attr(node, "alt") ?? ""
  if (tag === "input" || tag === "select" || tag === "textarea") return ""
  const label = reader.attr(node, "aria-label")
  const inner = label !== undefined && label.trim() !== ""
    ? label
    : reader.children(node).map((child) => contentText(index, child, skip, includeHidden)).join("")
  return phrasing.has(tag) ? inner : ` ${inner} `
}

const textOfIds = <N>(index: Index<N>, ids: string): string =>
  normalize(
    ids.trim().split(/\s+/).map((id) => {
      const node = index.byId.get(id)
      return node === undefined ? "" : contentText(index, node, undefined, true)
    }).join(" ")
  )

const firstChildText = <N>(index: Index<N>, node: N, tag: string): string | undefined => {
  const child = index.reader.children(node).find((c) => index.reader.isElement(c) && index.reader.tag(c) === tag)
  return child === undefined ? undefined : normalize(contentText(index, child, undefined, false))
}

const computeName = <N>(index: Index<N>, entry: Entry<N>): string => {
  const { reader } = index
  const node = entry.node
  const labelledBy = reader.attr(node, "aria-labelledby")
  if (labelledBy !== undefined && labelledBy.trim() !== "") {
    const name = textOfIds(index, labelledBy)
    if (name !== "") return name
  }
  const label = reader.attr(node, "aria-label")
  if (label !== undefined && label.trim() !== "") return normalize(label)
  const tag = reader.tag(node)
  const type = (reader.attr(node, "type") ?? "").toLowerCase()
  if (tag === "input" && (type === "button" || type === "submit" || type === "reset")) {
    const value = reader.attr(node, "value") ?? (reader.prop(node, "value") as string | undefined)
    if (value !== undefined && value !== "") return normalize(value)
    return type === "submit" ? "Submit" : type === "reset" ? "Reset" : ""
  }
  if (tag === "input" && type === "image") return normalize(reader.attr(node, "alt") ?? "")
  if (tag === "input" || tag === "select" || tag === "textarea" || tag === "meter" || tag === "progress") {
    const id = reader.attr(node, "id")
    const labels = [...(id === undefined ? [] : index.labelsFor.get(id) ?? []), ...entry.labels]
    const fromLabels = normalize(labels.map((l) => contentText(index, l, node, false)).join(" "))
    if (fromLabels !== "") return fromLabels
  }
  if (tag === "img" || tag === "area") {
    const alt = reader.attr(node, "alt")
    if (alt !== undefined && alt.trim() !== "") return normalize(alt)
  }
  if (tag === "fieldset") {
    const legend = firstChildText(index, node, "legend")
    if (legend !== undefined && legend !== "") return legend
  }
  if (tag === "table") {
    const caption = firstChildText(index, node, "caption")
    if (caption !== undefined && caption !== "") return caption
  }
  if (tag === "figure") {
    const caption = firstChildText(index, node, "figcaption")
    if (caption !== undefined && caption !== "") return caption
  }
  if (entry.role !== undefined && nameFromContent.has(entry.role)) {
    const content = normalize(contentText(index, node, undefined, false))
    if (content !== "") return content
  }
  const title = reader.attr(node, "title")
  if (title !== undefined && title.trim() !== "") return normalize(title)
  if (tag === "input" || tag === "textarea") {
    const placeholder = reader.attr(node, "placeholder")
    if (placeholder !== undefined) return normalize(placeholder)
  }
  return ""
}

const isChecked = <N>(reader: Reader<N>, node: N): boolean | undefined => {
  const aria = reader.attr(node, "aria-checked")
  if (aria !== undefined) return aria === "true"
  if (reader.tag(node) !== "input") return undefined
  const prop = reader.prop(node, "checked")
  if (typeof prop === "boolean") return prop
  return reader.attr(node, "checked") !== undefined
}

const levelOf = <N>(reader: Reader<N>, node: N): number | undefined => {
  const aria = reader.attr(node, "aria-level")
  if (aria !== undefined) return Number(aria)
  const match = /^h([1-6])$/.exec(reader.tag(node))
  return match === null ? undefined : Number(match[1])
}

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------

/**
 * What a role query matches besides the role.
 *
 * **Details**
 *
 * `name` matches the accessible name exactly (after collapsing whitespace),
 * or tests it with a RegExp. `checked` matches a checkbox or radio button's
 * live state, and `level` a heading's. `hidden: true` includes hidden
 * elements.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface RoleOptions {
  readonly name?: string | RegExp | undefined
  readonly checked?: boolean | undefined
  readonly level?: number | undefined
  readonly hidden?: boolean | undefined
}

const describeOptions = (role: string, options: RoleOptions | undefined): string => {
  const parts = [`role ${JSON.stringify(role)}`]
  if (options?.name !== undefined) {
    parts.push(`name ${typeof options.name === "string" ? JSON.stringify(options.name) : String(options.name)}`)
  }
  if (options?.checked !== undefined) parts.push(`checked ${options.checked}`)
  if (options?.level !== undefined) parts.push(`level ${options.level}`)
  return parts.join(", ")
}

const select = <N>(index: Index<N>, role: string, options: RoleOptions | undefined): Array<N> => {
  const out: Array<N> = []
  for (const entry of index.entries) {
    if (entry.role !== role) continue
    if (entry.hidden && options?.hidden !== true) continue
    if (options?.checked !== undefined && isChecked(index.reader, entry.node) !== options.checked) continue
    if (options?.level !== undefined && levelOf(index.reader, entry.node) !== options.level) continue
    if (options?.name !== undefined) {
      const name = computeName(index, entry)
      if (typeof options.name === "string" ? name !== normalize(options.name) : !options.name.test(name)) continue
    }
    out.push(entry.node)
  }
  return out
}

/**
 * Every element under `root`, `root` included, with role `role` and matching
 * `options`, in document order.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const queryAllByRole: {
  (root: globalThis.Node, role: string, options?: RoleOptions): ReadonlyArray<HTMLElement>
  <N extends Query.Node>(root: N, role: string, options?: RoleOptions): ReadonlyArray<N>
} = (root: any, role: string, options?: RoleOptions): ReadonlyArray<any> => select(buildIndex(root), role, options)

/**
 * The one element under `root` with role `role` and matching `options`.
 * Throws when there's none or several, listing the roles and names there are.
 *
 * @stability experimental
 * @category queries
 * @since 4.1.3
 */
export const getByRole: {
  (root: globalThis.Node, role: string, options?: RoleOptions): HTMLElement
  <N extends Query.Node>(root: N, role: string, options?: RoleOptions): N
} = (root: any, role: string, options?: RoleOptions): any => {
  const index = buildIndex(root)
  const found = select(index, role, options)
  if (found.length === 1) return found[0]
  if (found.length > 1) {
    throw new Error(`HtmlQuery: ${found.length} elements have ${describeOptions(role, options)}`)
  }
  throw new Error(`HtmlQuery: nothing has ${describeOptions(role, options)}. Roles here:\n${describeIndex(index)}`)
}

const describeIndex = <N>(index: Index<N>): string => {
  const lines = index.entries
    .filter((entry) => entry.role !== undefined && !entry.hidden)
    .map((entry) => `  ${entry.role} ${JSON.stringify(computeName(index, entry))}`)
  return lines.length === 0 ? "  (none)" : lines.join("\n")
}

/**
 * The role of `node`: its `role` attribute, else the implicit role of its tag
 * and attributes, else `undefined`. `root` is the tree it's in, which decides
 * the role of `header` and `footer`.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.3
 */
export const roleOf: {
  (root: globalThis.Node, node: globalThis.Node): string | undefined
  <N extends Query.Node>(root: N, node: N): string | undefined
} = (root: any, node: any): string | undefined => buildIndex(root).byNode.get(node)?.role

/**
 * The accessible name of `node`, computed within `root`: from
 * `aria-labelledby`, `aria-label`, its labels, `alt`, a `legend` or `caption`,
 * its content for roles named by their content, then `title` and
 * `placeholder`.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.3
 */
export const nameOf: {
  (root: globalThis.Node, node: globalThis.Node): string
  <N extends Query.Node>(root: N, node: N): string
} = (root: any, node: any): string => {
  const index = buildIndex(root)
  const entry = index.byNode.get(node)
  return entry === undefined ? "" : computeName(index, entry)
}

/**
 * A `Query` locator for elements with role `role` and matching `options`, to
 * combine with `Query.inside` and the other locators.
 *
 * @stability experimental
 * @category locators
 * @since 4.1.3
 */
export const role = (role: string, options?: RoleOptions): Query.Locator => ({
  description: describeOptions(role, options),
  all: (root) => select(buildIndex(root), role, options)
})

// ---------------------------------------------------------------------------
// acting on the DOM
// ---------------------------------------------------------------------------

/**
 * Clicks `element` as the user would: a button submits its form, and a
 * checkbox or radio button changes and fires `input` and `change`.
 *
 * @stability experimental
 * @category actions
 * @since 4.1.3
 */
export const click = (element: globalThis.Element): void => {
  ;(element as HTMLElement).click()
}

/**
 * Types into a text field as the user would: replaces its value with `value`
 * and fires `input`, then `change`.
 *
 * @stability experimental
 * @category actions
 * @since 4.1.3
 */
export const input = (element: globalThis.Element, value: string): void => {
  const field = element as HTMLInputElement
  const view = field.ownerDocument.defaultView
  field.value = value
  const make = (name: string) =>
    view !== null && typeof view.InputEvent === "function"
      ? new view.InputEvent(name, { bubbles: true, data: value, inputType: "insertText" })
      : new (view?.Event ?? Event)(name, { bubbles: true })
  field.dispatchEvent(make("input"))
  field.dispatchEvent(new (view?.Event ?? Event)("change", { bubbles: true }))
}

/**
 * Presses `key` on `element`: fires `keydown`, then `keyup`.
 *
 * @stability experimental
 * @category actions
 * @since 4.1.3
 */
export const keyDown = (
  element: globalThis.Element,
  key: string,
  modifiers?: {
    readonly shift?: boolean | undefined
    readonly ctrl?: boolean | undefined
    readonly alt?: boolean | undefined
    readonly meta?: boolean | undefined
  }
): void => {
  const view = element.ownerDocument.defaultView
  const Keyboard = view?.KeyboardEvent ?? KeyboardEvent
  const init = {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: modifiers?.shift === true,
    ctrlKey: modifiers?.ctrl === true,
    altKey: modifiers?.alt === true,
    metaKey: modifiers?.meta === true
  }
  element.dispatchEvent(new Keyboard("keydown", init))
  element.dispatchEvent(new Keyboard("keyup", init))
}

/**
 * Submits `form`, or the form `element` belongs to, as pressing Enter in it
 * would.
 *
 * @stability experimental
 * @category actions
 * @since 4.1.3
 */
export const submit = (element: globalThis.Element): void => {
  const form = element.localName === "form"
    ? element as HTMLFormElement
    : (element as HTMLInputElement).form ?? element.closest("form")
  if (form === null) throw new Error("HtmlQuery.submit: the element isn't in a form")
  if (typeof form.requestSubmit === "function") form.requestSubmit()
  else {
    const view = form.ownerDocument.defaultView
    form.dispatchEvent(new (view?.Event ?? Event)("submit", { bubbles: true, cancelable: true }))
  }
}

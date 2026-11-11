/**
 * Document head: the title, meta and link tags, JSON-LD blocks, and the
 * `lang`, `dir`, `class` and `data-*` attributes of `<html>` and `<body>`.
 *
 * Any component can contribute head entries through a pure `head` option,
 * a function of its Model. Entries belong to their instance and live and die
 * with it. On every flush where an instance with `head` rendered, the runtime
 * collects the entries of the mounted tree in document order and merges them
 * into one `Head`, which the host applies: the browser host diffs it against
 * the document, the server renderer will print it, and `TestHost` exposes it.
 *
 * **Merge rules**
 *
 * - The later entry wins per identity, so a descendant overrides its
 *   ancestors and, between siblings, the later one wins.
 * - The title, `lang`, `dir` and `<link rel="canonical">` are single slots.
 *   A meta tag is identified by its `key`, else its `name` or `property`; a
 *   link by its `key`, else `rel` plus `href`; a JSON-LD block by its `key`,
 *   else its canonical form.
 * - `class` tokens are unioned in the order they were first contributed, and
 *   `data-*` attributes have one slot per name.
 * - A `titleTemplate` applies to a title set by a descendant, never to its own
 *   instance's title. The winning title passes through its ancestors'
 *   templates outward, nearest first.
 *
 * **Example** (A layout template and a page title)
 *
 * ```ts import.meta.vitest
 * import { Head } from "effect/ui"
 *
 * const head = Head.merge({
 *   entries: [Head.titleTemplate((title) => `${title} · App`), Head.lang("en")],
 *   children: [{
 *     entries: [Head.titleTemplate((title) => `${title} · People`), Head.title("People")],
 *     children: [{ entries: [Head.title("Ada"), Head.meta({ name: "description", content: "Ada's page" })], children: [] }]
 *   }]
 * })
 *
 * head.title // => "Ada · People · App"
 * head.html.lang // => "en"
 * head.meta.map((meta) => meta.content) // => ["Ada's page"]
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */

/**
 * One head entry, as a component's `head` option returns it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Entry =
  | Title
  | TitleTemplate
  | Meta
  | Link
  | Lang
  | Dir
  | JsonLd
  | HtmlClass
  | BodyClass
  | HtmlData
  | BodyData

/**
 * The document title.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Title {
  readonly _tag: "Title"
  readonly text: string
}

/**
 * Wraps the title set by a descendant.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface TitleTemplate {
  readonly _tag: "TitleTemplate"
  readonly apply: (title: string) => string
}

/**
 * A `<meta>` tag, named by `name` or by `property`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Meta {
  readonly _tag: "Meta"
  readonly name: string | undefined
  readonly property: string | undefined
  readonly content: string
  readonly key: string | undefined
}

/**
 * The attributes a `<link>` tag may have.
 *
 * **Details**
 *
 * Links have no `nonce` and no event attributes.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface LinkAttributes {
  readonly rel: string
  readonly href: string
  readonly hreflang?: string | undefined
  readonly type?: string | undefined
  readonly media?: string | undefined
  readonly as?: string | undefined
  readonly sizes?: string | undefined
  readonly crossorigin?: string | undefined
  readonly imagesrcset?: string | undefined
  readonly imagesizes?: string | undefined
}

/**
 * A `<link>` tag.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Link {
  readonly _tag: "Link"
  readonly attributes: LinkAttributes
  readonly key: string | undefined
}

/**
 * The `lang` attribute of `<html>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Lang {
  readonly _tag: "Lang"
  readonly code: string
}

/**
 * The `dir` attribute of `<html>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Dir {
  readonly _tag: "Dir"
  readonly dir: "ltr" | "rtl"
}

/**
 * A JSON-LD block, rendered as `<script type="application/ld+json">`.
 *
 * **Details**
 *
 * `json` is the canonical form: keys sorted recursively, undefined properties
 * dropped, and `<` escaped as `\u003c`, so it's safe inside a script tag and
 * two equal values always print the same.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface JsonLd {
  readonly _tag: "JsonLd"
  readonly value: object
  readonly json: string
  readonly key: string | undefined
}

/**
 * Class tokens for `<html>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface HtmlClass {
  readonly _tag: "HtmlClass"
  readonly tokens: ReadonlyArray<string>
}

/**
 * Class tokens for `<body>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface BodyClass {
  readonly _tag: "BodyClass"
  readonly tokens: ReadonlyArray<string>
}

/**
 * A `data-*` attribute of `<html>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface HtmlData {
  readonly _tag: "HtmlData"
  readonly name: `data-${string}`
  readonly value: string
}

/**
 * A `data-*` attribute of `<body>`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface BodyData {
  readonly _tag: "BodyData"
  readonly name: `data-${string}`
  readonly value: string
}

/**
 * A `data-*` attribute name. `data-eui` is the framework's marker, so it's
 * excluded.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type DataName<N extends string> = N extends "data-eui" ? never : N extends `data-${string}` ? N : never

/**
 * What a JSON-LD block accepts: an object whose properties aren't functions,
 * dates, bigints or symbols. Deeper levels are checked when the entry is
 * built.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type JsonLdValue<A extends object> =
  & A
  & { readonly [K in keyof A]: A[K] extends Function | Date | bigint | symbol ? never : A[K] }

/**
 * The marker attribute on every head tag the framework writes.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.5
 */
export const marker = "data-eui"

/**
 * Sets the document title.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const title = (text: string): Title => ({ _tag: "Title", text })

/**
 * Wraps the title a descendant sets, such as `(title) => \`\${title} · App\``.
 *
 * **Details**
 *
 * It never applies to a title set by its own instance. Templates chain
 * outward: the nearest ancestor's applies first.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const titleTemplate = (apply: (title: string) => string): TitleTemplate => ({ _tag: "TitleTemplate", apply })

/**
 * Adds a `<meta>` tag, named by `name` or by `property`.
 *
 * **Details**
 *
 * Its identity is `key`, else the `name` or `property`. `http-equiv` meta tags
 * and `<meta charset>` belong to the shell and aren't entries.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const meta = (
  options:
    | { readonly name: string; readonly content: string; readonly key?: string | undefined }
    | { readonly property: string; readonly content: string; readonly key?: string | undefined }
): Meta => ({
  _tag: "Meta",
  name: "name" in options ? options.name : undefined,
  property: "property" in options ? options.property : undefined,
  content: options.content,
  key: options.key
})

/**
 * Adds a `<link>` tag.
 *
 * **Details**
 *
 * `rel="canonical"` is a single slot. Other links are identified by `key`,
 * else by `rel` plus `href`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const link = (options: LinkAttributes & { readonly key?: string | undefined }): Link => {
  const { key, ...attributes } = options
  return { _tag: "Link", attributes, key }
}

/**
 * Sets the `lang` attribute of `<html>`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const lang = (code: string): Lang => ({ _tag: "Lang", code })

/**
 * Sets the `dir` attribute of `<html>`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const dir = (dir: "ltr" | "rtl"): Dir => ({ _tag: "Dir", dir })

/**
 * Adds a JSON-LD block.
 *
 * **Details**
 *
 * The value is an object, never a top-level array: use `@graph` for several
 * nodes. It's identified by `key`, else by its canonical form, and the host
 * rewrites a block only when its canonical form changes.
 *
 * The type rejects functions, dates, bigints and symbols one level deep. When
 * the entry is built, deeper levels are checked too: an object whose prototype
 * isn't `Object.prototype` or `null` (a `Date`, `Map`, `Option` or class
 * instance), or an array holding `NaN`, `Infinity` or `undefined`, throws an
 * error naming its JSON path. In a `head` option that fails the instance.
 * The check runs in every build, not only in development: `effect` has no
 * development switch, and it shares the walk the canonical serialisation
 * makes anyway.
 *
 * **Example** (Describing a person)
 *
 * ```ts import.meta.vitest
 * import { Head } from "effect/ui"
 *
 * const entry = Head.jsonLd({ "@context": "https://schema.org", "@type": "Person", name: "Ada <Lovelace>" })
 *
 * entry.json // => '{"@context":"https://schema.org","@type":"Person","name":"Ada \\u003cLovelace>"}'
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const jsonLd = <const A extends object>(
  value: JsonLdValue<A>,
  options?: { readonly key?: string | undefined }
): JsonLd => {
  if (Array.isArray(value)) throw new Error("Head.jsonLd takes an object, not an array. Use @graph for several nodes.")
  return { _tag: "JsonLd", value, json: canonicalJson(value), key: options?.key }
}

const splitTokens = (tokens: string | ReadonlyArray<string>): ReadonlyArray<string> =>
  (typeof tokens === "string" ? [tokens] : tokens).flatMap((token) => token.split(/[\t\n\f\r ]+/)).filter((t) =>
    t !== ""
  )

/**
 * Adds class tokens to `<html>`. Strings are split on ASCII whitespace.
 *
 * **Details**
 *
 * A token becomes the framework's once any entry contributes it, and the
 * browser host removes it once no entry does, even if it was in the shell.
 * Tokens no entry ever contributed are never touched.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const htmlClass = (tokens: string | ReadonlyArray<string>): HtmlClass => ({
  _tag: "HtmlClass",
  tokens: splitTokens(tokens)
})

/**
 * Adds class tokens to `<body>`. Strings are split on ASCII whitespace.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const bodyClass = (tokens: string | ReadonlyArray<string>): BodyClass => ({
  _tag: "BodyClass",
  tokens: splitTokens(tokens)
})

const checkDataName = (name: string) => {
  if (name === marker) throw new Error(`${marker} is the framework's marker and can't be set from head`)
}

/**
 * Sets a `data-*` attribute of `<html>`. `""` means present and empty.
 *
 * **Details**
 *
 * When the last entry for a name goes away, the browser host removes the
 * attribute, or restores the value the shell had.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const htmlData = <const N extends string>(name: N & DataName<N>, value: string): HtmlData => {
  checkDataName(name)
  return { _tag: "HtmlData", name: name as `data-${string}`, value }
}

/**
 * Sets a `data-*` attribute of `<body>`. `""` means present and empty.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const bodyData = <const N extends string>(name: N & DataName<N>, value: string): BodyData => {
  checkDataName(name)
  return { _tag: "BodyData", name: name as `data-${string}`, value }
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

const pathOf = (path: string, key: string | number): string =>
  typeof key === "number"
    ? `${path}[${key}]`
    : /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`

const canonical = (value: unknown, path: string): unknown => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return value
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item === undefined || (typeof item === "number" && !Number.isFinite(item))) {
        throw new Error(`Head.jsonLd: ${pathOf(path, index)} is ${String(item)}, which JSON can't hold`)
      }
      return canonical(item, pathOf(path, index))
    })
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) {
      const name = proto?.constructor?.name
      throw new Error(`Head.jsonLd: ${path} is a${name === undefined ? "n object" : ` ${name}`}, not a plain object`)
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key]
      if (item === undefined) continue
      out[key] = canonical(item, pathOf(path, key))
    }
    return out
  }
  throw new Error(`Head.jsonLd: ${path} is a ${typeof value}, which JSON can't hold`)
}

/**
 * The canonical JSON of a value: keys sorted recursively, undefined
 * properties dropped and `<` escaped as `\u003c`.
 *
 * @stability experimental
 * @category utils
 * @since 4.1.5
 */
export const canonicalJson = (value: object): string => JSON.stringify(canonical(value, "$")).replaceAll("<", "\\u003c")

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * The merged head of a tree, ready for a host.
 *
 * **Details**
 *
 * `title` has the templates applied. `meta`, `links` and `jsonLd` hold one
 * entry per identity, in the order each identity was first contributed, with
 * the value of the last entry. `html` and `body` hold the attributes set on
 * those elements; `class` lists tokens in the order they were first
 * contributed.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Head {
  readonly title: string | undefined
  readonly meta: ReadonlyArray<Meta>
  readonly links: ReadonlyArray<Link>
  readonly jsonLd: ReadonlyArray<JsonLd>
  readonly html: {
    readonly lang: string | undefined
    readonly dir: "ltr" | "rtl" | undefined
    readonly class: ReadonlyArray<string>
    readonly data: Readonly<Record<string, string>>
  }
  readonly body: {
    readonly class: ReadonlyArray<string>
    readonly data: Readonly<Record<string, string>>
  }
}

/**
 * The head with no entries.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.5
 */
export const empty: Head = {
  title: undefined,
  meta: [],
  links: [],
  jsonLd: [],
  html: { lang: undefined, dir: undefined, class: [], data: {} },
  body: { class: [], data: {} }
}

/**
 * The entries of a tree of instances: each instance's own entries and its
 * children, in document order.
 *
 * **Details**
 *
 * `onError` is called when one of the node's own title templates throws.
 * The merge then skips that template. Without `onError` the error is
 * rethrown.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Tree {
  readonly entries: ReadonlyArray<Entry>
  readonly children: ReadonlyArray<Tree>
  readonly onError?: ((error: unknown) => void) | undefined
}

/**
 * The identity of a meta, link or JSON-LD entry: two entries with the same
 * identity fill the same slot.
 *
 * @stability experimental
 * @category utils
 * @since 4.1.5
 */
export const identity = (entry: Meta | Link | JsonLd): string => {
  switch (entry._tag) {
    case "Meta":
      return entry.key !== undefined
        ? `meta key:${entry.key}`
        : entry.name !== undefined
        ? `meta name:${entry.name}`
        : `meta property:${entry.property}`
    case "Link":
      return entry.attributes.rel === "canonical"
        ? "link canonical"
        : entry.key !== undefined
        ? `link key:${entry.key}`
        : `link ${entry.attributes.rel} ${entry.attributes.href}`
    case "JsonLd":
      return entry.key !== undefined ? `jsonld key:${entry.key}` : `jsonld ${entry.json}`
  }
}

/**
 * The attributes of a meta or link tag, in a stable order, without the
 * marker.
 *
 * @stability experimental
 * @category utils
 * @since 4.1.5
 */
export const attributes = (entry: Meta | Link): ReadonlyArray<readonly [string, string]> => {
  if (entry._tag === "Meta") {
    return [
      entry.name !== undefined ? ["name", entry.name] as const : ["property", entry.property!] as const,
      ["content", entry.content]
    ]
  }
  const out: Array<readonly [string, string]> = []
  for (const [name, value] of Object.entries(entry.attributes)) {
    if (value !== undefined) out.push([name, value])
  }
  return out
}

interface Template {
  readonly apply: (title: string) => string
  readonly node: Tree
}

const applyTemplate = (text: string, template: Template): string => {
  try {
    return template.apply(text)
  } catch (error) {
    if (template.node.onError === undefined) throw error
    template.node.onError(error)
    return text
  }
}

/**
 * Merges a tree's entries into one `Head`.
 *
 * **Details**
 *
 * Entries are read in pre-order, so the later entry wins per identity. The
 * winning title passes through the `titleTemplate` of each ancestor of the
 * instance that set it, nearest first. An instance's own template never
 * applies to its own title, and when an instance has several templates the
 * last one counts. A template that throws is reported to its node's
 * `onError` and skipped.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.5
 */
export const merge = (tree: Tree): Head => {
  let title: { readonly text: string; readonly templates: ReadonlyArray<Template> } | undefined
  const meta = new Map<string, Meta>()
  const links = new Map<string, Link>()
  const json = new Map<string, JsonLd>()
  let lang: string | undefined
  let dirValue: "ltr" | "rtl" | undefined
  const htmlClasses = new Set<string>()
  const bodyClasses = new Set<string>()
  const htmlDataMap = new Map<string, string>()
  const bodyDataMap = new Map<string, string>()
  const visit = (node: Tree, templates: ReadonlyArray<Template>) => {
    let own: Template | undefined
    for (const entry of node.entries) {
      switch (entry._tag) {
        case "Title":
          title = { text: entry.text, templates }
          break
        case "TitleTemplate":
          own = { apply: entry.apply, node }
          break
        case "Meta":
          meta.set(identity(entry), entry)
          break
        case "Link":
          links.set(identity(entry), entry)
          break
        case "JsonLd":
          json.set(identity(entry), entry)
          break
        case "Lang":
          lang = entry.code
          break
        case "Dir":
          dirValue = entry.dir
          break
        case "HtmlClass":
          for (const token of entry.tokens) htmlClasses.add(token)
          break
        case "BodyClass":
          for (const token of entry.tokens) bodyClasses.add(token)
          break
        case "HtmlData":
          htmlDataMap.set(entry.name, entry.value)
          break
        case "BodyData":
          bodyDataMap.set(entry.name, entry.value)
          break
      }
    }
    const inner = own === undefined ? templates : [own, ...templates]
    for (const child of node.children) visit(child, inner)
  }
  visit(tree, [])
  return {
    title: title === undefined ? undefined : title.templates.reduce(applyTemplate, title.text),
    meta: [...meta.values()],
    links: [...links.values()],
    jsonLd: [...json.values()],
    html: { lang, dir: dirValue, class: [...htmlClasses], data: Object.fromEntries(htmlDataMap) },
    body: { class: [...bodyClasses], data: Object.fromEntries(bodyDataMap) }
  }
}

---
title: HtmlQuery.ts
nav_order: 10
parent: Modules
---

## HtmlQuery.ts overview

Queries by ARIA role and accessible name, computed from tags and
attributes, so a test finds elements the way assistive technology does.

The same queries run over a story's view value, a `TestHost` tree and a
real DOM tree. `role` is a `Query` locator, so it combines with
`Query.inside` on the first two. On the DOM, `click`, `input`, `keyDown`
and `submit` act as the user would, through real DOM events.

Hidden elements (`hidden`, `aria-hidden="true"`, `<input type="hidden">`)
and everything inside them are left out unless `hidden: true` is passed.

On a structural tree a match is typed `Query.Node`, since it can be any
node of the tree. On `TestHost`, `root.all(HtmlQuery.role(...))` keeps the
host's node type. On the DOM a match is an `HTMLElement`.

**Example** (Finding a button by its name)

```ts
import { HtmlQuery } from "@effect/ui-html/testing"

const tree = {
  tag: "form",
  children: [
    { tag: "label", attrs: { for: "new" }, children: [{ text: "New todo" }] },
    { tag: "input", attrs: { id: "new" } },
    { tag: "button", attrs: { type: "submit" }, children: [{ text: "Add" }] }
  ]
}

console.log(HtmlQuery.getByRole(tree, "button", { name: "Add" }) === tree.children[2]) // true
console.log(HtmlQuery.nameOf(tree, HtmlQuery.getByRole(tree, "textbox"))) // "New todo"
```

Since v4.1.3

---

## Exports Grouped by Category

- [actions](#actions)
  - [click](#click)
  - [input](#input)
  - [keyDown](#keydown)
  - [submit](#submit)
- [getters](#getters)
  - [nameOf](#nameof)
  - [roleOf](#roleof)
- [locators](#locators)
  - [role](#role)
- [models](#models)
  - [RoleOptions (interface)](#roleoptions-interface)
- [queries](#queries)
  - [getByRole](#getbyrole)
  - [queryAllByRole](#queryallbyrole)

---

# actions

## click

Clicks `element` as the user would: a button submits its form, and a
checkbox or radio button changes and fires `input` and `change`.

**Signature**

```ts
declare const click: (element: globalThis.Element) => void
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L580)

Since v4.1.3

## input

Types into a text field as the user would: replaces its value with `value`
and fires `input`, then `change`.

**Signature**

```ts
declare const input: (element: globalThis.Element, value: string) => void
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L592)

Since v4.1.3

## keyDown

Presses `key` on `element`: fires `keydown`, then `keyup`.

**Signature**

```ts
declare const keyDown: (
  element: globalThis.Element,
  key: string,
  modifiers?: {
    readonly shift?: boolean | undefined
    readonly ctrl?: boolean | undefined
    readonly alt?: boolean | undefined
    readonly meta?: boolean | undefined
  }
) => void
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L611)

Since v4.1.3

## submit

Submits `form`, or the form `element` belongs to, as pressing Enter in it
would.

**Signature**

```ts
declare const submit: (element: globalThis.Element) => void
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L644)

Since v4.1.3

# getters

## nameOf

The accessible name of `node`, computed within `root`: from
`aria-labelledby`, `aria-label`, its labels, `alt`, a `legend` or `caption`,
its content for roles named by their content, then `title` and
`placeholder`.

**Signature**

```ts
declare const nameOf: {
  (root: globalThis.Node, node: globalThis.Node): string
  (root: Query.Node, node: Query.Node): string
}
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L546)

Since v4.1.3

## roleOf

The role of `node`: its `role` attribute, else the implicit role of its tag
and attributes, else `undefined`. `root` is the tree it's in, which decides
the role of `header` and `footer`.

**Signature**

```ts
declare const roleOf: {
  (root: globalThis.Node, node: globalThis.Node): string | undefined
  (root: Query.Node, node: Query.Node): string | undefined
}
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L531)

Since v4.1.3

# locators

## role

A `Query` locator for elements with role `role` and matching `options`, to
combine with `Query.inside` and the other locators.

**Signature**

```ts
declare const role: (role: string, options?: RoleOptions) => Query.Locator
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L563)

Since v4.1.3

# models

## RoleOptions (interface)

What a role query matches besides the role.

**Details**

`name` matches the accessible name exactly (after collapsing whitespace),
or tests it with a RegExp. `checked` matches a checkbox or radio button's
live state, and `level` a heading's. `hidden: true` includes hidden
elements.

**Signature**

```ts
export interface RoleOptions {
  readonly name?: string | RegExp | undefined
  readonly checked?: boolean | undefined
  readonly level?: number | undefined
  readonly hidden?: boolean | undefined
}
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L448)

Since v4.1.3

# queries

## getByRole

The one element under `root` with role `role` and matching `options`.
Throws when there's none or several, listing the roles and names there are.

**Signature**

```ts
declare const getByRole: {
  (root: globalThis.Node, role: string, options?: RoleOptions): HTMLElement
  (root: Query.Node, role: string, options?: RoleOptions): Query.Node
}
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L502)

Since v4.1.3

## queryAllByRole

Every element under `root`, `root` included, with role `role` and matching
`options`, in document order.

**Signature**

```ts
declare const queryAllByRole: {
  (root: globalThis.Node, role: string, options?: RoleOptions): ReadonlyArray<HTMLElement>
  (root: Query.Node, role: string, options?: RoleOptions): ReadonlyArray<Query.Node>
}
```

[Source](https://effect.website/blob/main/src/HtmlQuery.ts#L489)

Since v4.1.3

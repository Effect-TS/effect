---
title: index.ts
nav_order: 11
parent: Modules
---

## index.ts overview

Test helpers for `@effect/ui-html`: `HtmlQuery`, and `ssr`, which renders
on the server, hydrates and checks the two agree.

Since v4.1.3

---

## Exports Grouped by Category

- [re-exports](#re-exports)
  - [ssr](#ssr)
- [utils](#utils)
  - [HtmlQuery (namespace export)](#htmlquery-namespace-export)
  - [Ssr (namespace export)](#ssr-namespace-export)

---

# re-exports

## ssr

**Signature**

```ts
declare const ssr: <Name extends string, Props, Model, Msg, Events, R, V extends Elements>(
  component: Component<Name, Props, Model, Msg, Events, R, V> & HtmlRoot<V>,
  props: Props,
  options?: { readonly budget?: Input | undefined }
) => Effect<Ssr<Model, Msg>, SsrError, Exclude<R, Host> | Scope>
```

[Source](https://effect.website/blob/main/src/index.ts#L15)

Since v4.1.3

# utils

## HtmlQuery (namespace export)

Re-exports all named exports from the "./HtmlQuery.ts" module as `HtmlQuery`.

**Signature**

```ts
export * as HtmlQuery from "./HtmlQuery.ts"
```

[Source](https://effect.website/blob/main/src/index.ts#L24)

Since v4.1.3

## Ssr (namespace export)

Re-exports all named exports from the "./Ssr.ts" module as `Ssr`.

**Signature**

```ts
export * as Ssr from "./Ssr.ts"
```

[Source](https://effect.website/blob/main/src/index.ts#L30)

Since v4.1.3

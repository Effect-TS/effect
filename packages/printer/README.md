# Pretty Printer for Effect-TS

- [Pretty Printer for Effect-TS](#pretty-printer-for-effect-ts)
  - [Installation](#installation)
    - [`@effect/printer`](#effectprinter)
  - [Overview](#overview)
  - [Simple Example](#simple-example)
  - [General Workflow](#general-workflow)
  - [How the Layout Works](#how-the-layout-works)
    - [Available Width](#available-width)
    - [Grouping](#grouping)
  - [Things the Pretty Printer Cannot Do](#things-the-pretty-printer-cannot-do)
  - [Helpful Tips](#helpful-tips)
    - [Which kind of annotation should I use?](#which-kind-of-annotation-should-i-use)
  - [Acknowledgements](#acknowledgements)

## Installation

### `@effect/printer`

```bash
npm install @effect/printer
```

```bash
pnpm install @effect/printer
```

```bash
yarn add @effect/printer
```
```bash
deno add npm:@effect/printer
```
```bash
bun add @effect/printer
```

## Overview

This module defines a pretty printer to format text in a flexible and convenient way. The idea is to combine a `Doc`ument out of many small components, then using a layouter to convert it to an easily renderable `DocStream`, which can then be rendered to a variety of formats.

The document consists of several parts:
 1. Just below is some general information about the library
 2. The actual library with extensive documentation and examples

## Simple Example

As a simple demonstration, let's use `@effect/printer` to pretty-print the following simple Haskell type definition.

```haskell
example :: Int -> Bool -> Char -> IO ()
```

First, let's setup the imports we need:

```ts
import * as Doc from "@effect/printer/Doc"
import * as Array from "effect/Array"
import { pipe } from "effect/Function"
```

Next, we intersperse the `"->"` character between our types and add a leading `"::"` character:

```ts
const prettyTypes = (types: ReadonlyArray<string>): Doc.Doc<never> => {
  const symbolDocuments = pipe(
    Array.makeBy(types.length - 1, () => Doc.text("->")),
    Array.prepend(Doc.text("::"))
  )
  const typeDocuments = types.map(Doc.text)
  const documents = pipe(
    Array.zipWith(
      symbolDocuments,
      typeDocuments,
      (left, right) => Doc.catWithSpace(left, right)
    )
  )
  return Doc.align(Doc.seps(documents))
}
```

The `seps` function is one way of concatenating documents, but there are many others (e.g. `vsep`, `cat` and `fillSep`, etc.). In our example, `seps` is used to space-separate all documents if there is space remaining in the current line, and newlines if the remaining line is too short.

Next, we prepend the name to the type,

```ts
const prettyDeclaration = (
  name: string,
  types: ReadonlyArray<string>
): Doc.Doc<never> => Doc.catWithSpace(Doc.text(name), prettyTypes(types))
```

Now we can define a document that contains some type signature:

```ts
const name = "example"
const types = ["Int", "Bool", "Char", "IO ()"]
const doc: Doc.Doc<never> = prettyDeclaration(name, types)
```

This document can now be printed! And as a bonus, it automatically adapts to available space.

If the page is wide enough (`80` characters in this case), the definitions are space-separated.

```ts
const rendered = Doc.render(doc, { style: 'pretty' })
console.log(rendered)
// example :: Int -> Bool -> Char -> IO ()
```

If we narrow the page width to only `20` characters, the same document renders vertically aligned:

```ts
const rendered = Doc.render(doc, { style: 'pretty', options: { lineWidth: 20 } })
console.log(rendered)
// example :: Int
//         -> Bool
//         -> Char
//         -> IO ()
```

Speaking of alignment, had we not used the `align` combinators, the `"->"` would be at the beginning of each line, and not beneath the `"::"`.

## General Workflow

```text
╔══════════╗
║          ║                         ╭────────────────────╮
║          ║                         │ vsep, pretty, <+>, │
║          ║                         │ nest, align, …     │
║          ║                         ╰─────────┬──────────╯
║          ║                                   │
║  Create  ║                                   │
║          ║                                   │
║          ║                                   ▽
║          ║                         ╭───────────────────╮
║          ║                         │        Doc        │
╠══════════╣                         │  (rich document)  │
║          ║                         ╰─────────┬─────────╯
║          ║                                   │
║          ║                                   │ Layout algorithms
║  Layout  ║                                   │ e.g. Layout.pretty
║          ║                                   ▽
║          ║                         ╭───────────────────╮
║          ║                         │     DocStream     │
╠══════════╣                         │ (simple document) │
║          ║                         ╰─────────┬─────────╯
║          ║                                   │
║          ║                                   ├─────────────────────────────╮
║          ║                                   │                             │ treeForm
║          ║                                   │                             ▽
║          ║                                   │                     ╭───────────────╮
║          ║                                   │                     │    DocTree    │
║  Render  ║                                   │                     ╰───────┬───────╯
║          ║                                   │                             │
║          ║               ╭───────────────────┼─────────────────╮  ╭────────┴────────╮
║          ║               │                   │                 │  │                 │
║          ║               ▽                   ▽                 ▽  ▽                 ▽
║          ║       ╭───────────────╮   ╭───────────────╮   ╭───────────────╮   ╭───────────────╮
║          ║       │ ANSI terminal │   │  Plain Text   │   │ other/custom  │   │     HTML      │
║          ║       ╰───────────────╯   ╰───────────────╯   ╰───────────────╯   ╰───────────────╯
║          ║
╚══════════╝
```

## How the Layout Works

There are two key concepts to laying a document out: the available width, and grouping.

### Available Width

The layout algorithm will try to avoid exceeding the maximum width of the `Doc`ument by inserting line breaks where possible. The available layout combinators make it fairly straightforward to specify where, and under what circumstances, such a line break may be inserted by the layout algorithm (for example via the `seps` function).

There is also the concept of ribbon width. The ribbon is the part of a line that is printed (i.e. the line length without the leading indentation). The layout algorithms take a ribbon fraction argument, which specifies how much of a line should be filled before trying to break it up. A ribbon width of 0.5 in a document of width 80 will result in the layout algorithm trying to avoid exceeding `0.5 * 80 = 40` (ignoring current indentation depth).

### Grouping

A document can be `group`ed, which tells the layout algorithm that it should attempt to collapse it to a single line. If the result does not fit within the constraints (given by page and ribbon widths), the document is rendered unaltered. This allows fallback renderings, so that we get nice results even when the original document would exceed the layout constraints.

## Things the Pretty Printer Cannot Do

Due to how the Wadler/Leijen algorithm is designed, a couple of things are unsupported right now, with a high possibility of having no sensible implementation without significantly changing the layout algorithm. In particular, this includes:

- Leading symbols instead of just spaces for indentation (as used by the Linux tree tool, for example)
- Multi-column layouts, in particular tables with multiple cells of equal width adjacent to each other

## Helpful Tips

### Which kind of annotation should I use?

TL;DR - Use semantic annotations for `Doc`, and after laying out the `Doc, only then map to backend-specific annotations.

For example, suppose you want to pretty-print some programming language code. If you want keywords to be red, you should annotate the `Doc` with a type that has a `Keyword` field (without any notion of color), and then after laying out the document, convert the annotations to map `Keyword` to `Red` (using `DocStream.reAnnotate`). The alternative (which is not recommended) is directly annotating the `Doc` with `Red`.

While both versions would work equally well, and would create identical output, the recommended way has two significant advantages: modularity and extensibility.

**Modularity**: Changing the color of `Keyword`s after laying out a `Doc`ument means that there is only one modification needed (namely the call to `DocStream.reAnnotate`) should the color of `Keyword`s need to be changed in the future. If you have directly annotated `Doc`uments with the color `Red`, a full text search/replacement would be required should the color need to be changed.

**Extensibility**: Adding a different rendering of a `Keyword` in the recommended version is as simple as adding a variant of `DocStream.reAnnotate` to convert the `Doc` annotation to something else. On the other hand, let's assume you have `Red` as an annotation in the `Doc` and the backend you would like to implement does not have the notion of color  (think of plain text or a website where red doesn’t work well with the rest of the style). You now need to worry what to map *redness* to, which in this case has no canonical answer. Should it be omitted? What does *red* mean in the context of the new backend? Additionally, consider the case where keywords and variables have already been annotated as red, but you want to change only the color of variables.

## Acknowledgements

This package is a port of https://github.com/quchen/prettyprinter

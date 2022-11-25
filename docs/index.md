---
title: Introduction
permalink: /
nav_order: 1
has_children: false
has_toc: false
---

## The Effect Ecosystem Package

To be used as a prelude when developing apps, it includes
a selected portion of ecosystem packages that have been identified
as the most common needed in most of the apps regardless
of the runtime (Node, Browser, Deno, Bun, etc).

The user is expected to further install and use additional libraries
such as "@effect/node" to integrate with specific runtimes and / or
frameworks such as "@effect/express".

Includes modules from:

- "@fp-ts/core"
- "@fp-ts/data"
- "@fp-ts/schema" (tbd)
- "@fp-ts/optic"
- "@effect/io"
- "@effect/stm" (tbd)
- "@effect/stream" (tbd)

Note: don't use this package when developing libraries, prefer targeting
individual dependencies.

For the list of available modules look into: [index](https://effect-ts.github.io/effect/modules/index.ts.html)

Some of the modules may be extended, for example [Fiber](https://effect-ts.github.io/effect/modules/Fiber.ts.html), to include sub-modules, in such cases you may find independent documentations in [Modules](https://effect-ts.github.io/effect/docs/modules)

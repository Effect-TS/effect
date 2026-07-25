# @effect/docgen

## 0.5.2

### Patch Changes

- 3b595aa: Remove duplicate logger

## 0.5.1

### Patch Changes

- 0b3b34e: Typecheck examples deeply nested within namespaces

## 0.5.0

### Minor Changes

- 8a0eb55: Support custom code fences when rendering examples

## 0.4.7

### Patch Changes

- e3ae139: Typecheck namespace examples

## 0.4.6

### Patch Changes

- fcd5649: Support examples enclosed in Extended Markdown [code blocks](https://www.markdownguide.org/extended-syntax/#fenced-code-blocks)
- 95f136e: Support deeply nested namespaces.

  Previously, the docgen would fail with a `[Markdown] Unsupported namespace nesting: 4` error. With this change all namespace headers at depth level 3 and above would be rendered using H4 elements.

## 0.4.5

### Patch Changes

- 8959440: Fixes the type checking and execution of examples on Windows

## 0.4.4

### Patch Changes

- 00ce7a0: upgrade ts-morph to 23.0.0
- 5b888e5: srcDir and outDir fields in docgen.json are currently ignored. With this patch, they are taken into account

## 0.4.3

### Patch Changes

- 7add2b9: update dependencies

## 0.4.2

### Patch Changes

- 619a0e3: use @effect/markdown-toc instead of github dependency

## 0.4.1

### Patch Changes

- b9bfab0: add reporting of `tsc` and `tsx` errors, closes #66

## 0.4.0

### Minor Changes

- 5fbec18: update effect

### Patch Changes

- 08e8347: use ConfigProvider to load configuration for docgen

## 0.3.8

### Patch Changes

- 8abf24f: Core: do not swallow examples errors

## 0.3.7

### Patch Changes

- 2573662: update effect

## 0.3.6

### Patch Changes

- d58b355: chore: add defaults to `schema.json`

## 0.3.5

### Patch Changes

- bcaf971: fix glob pattern on windows

## 0.3.4

### Patch Changes

- 4e72aee: Re-added schema.json

## 0.3.3

### Patch Changes

- 3ee6dd1: Improve error output when spawning child process fails
- 73a1d93: build with tsup

## 0.3.2

### Patch Changes

- 16fc976: Updated dependencies

## 0.3.1

### Patch Changes

- b799243: add `--no-examples` option

## 0.3.0

### Minor Changes

- e08edb1: Modernized and switched to a `tsc` and `tsx` based setup with support for `NodeNext` module resolution.

## 0.2.1

### Patch Changes

- 2677b9d: updated effect
- 743ce06: change theme default

## 0.2.0

### Minor Changes

- ecd00a5: update effect and add effect/platform-node dependency

## 0.1.8

### Patch Changes

- 5411c71: Support for parsing "export \* as namespace"

## 0.1.7

### Patch Changes

- b94de9f: add support for `export * from ...`

## 0.1.6

### Patch Changes

- 172ac81: Fix parsing regression caused by compilerOptions parsing

## 0.1.5

### Patch Changes

- 85301ea: Add support for resolving compilerOptions from tsconfig files

## 0.1.4

### Patch Changes

- 8be0092: add support for namespaces
- 8be0092: BugFix: remove stale modules from /docs folder

## 0.1.3

### Patch Changes

- d8006f3: patch markdown-toc to prevent duplicate links
- 514f73f: update to effect framework package

## 0.1.2

### Patch Changes

- 115b996: fix formatting of the \_config.yml output by docgen
- 115b996: upgrade dependencies

## 0.1.1

### Patch Changes

- 2a909a1: fix config handling

## 0.1.0

### Minor Changes

- eb5ef08: rename docs-ts.json to docgen.json

## 0.0.3

### Patch Changes

- d139f78: ignore internal classes

## 0.0.2

### Patch Changes

- 4e88501: fix shebang line

## 0.0.1

### Patch Changes

- 4faa066: add initial code

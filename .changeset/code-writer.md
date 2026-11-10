---
"effect": patch
---

Add the `CodeWriter` module (unstable) for code generators that write TypeScript modules.

- Write code with the `CodeWriter.code` template.
- Request imports with `importNamespace` / `importNamed` / `importDefault`. These return symbols, and an import is printed only if printed code uses it. It becomes `import type` when every use is type-only; named imports of one module share a statement, with `type` modifiers on type-only specifiers. `importSideEffect` adds `import "…"`.
- Re-export with `reexport` / `reexportAll`. `exportedNames` lists what the module exports.
- `declare` gives your own declarations free names and records every rename. Nested `scope`s hold local names. `identifier` turns input into valid local identifiers.

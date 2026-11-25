---
"effect": patch
---

The code that generates TypeScript for built-in schemas and checks now lives in `Codegen`. This makes bundles smaller for apps that use `Schema` without generating code.

- If you previously read `annotations.toCode` from a built-in, pass its representation to `Codegen.Module.addSchemas` and call `module.print()` to get the TypeScript source.
- Custom types can still define `toCode`. If you change a built-in's representation ID, provide your own `toCode` to tell the generator what to write.
- The generator uses the arguments recorded when you create a schema or check. If you later change a `Date` used as a bound, the generated code uses the original date.

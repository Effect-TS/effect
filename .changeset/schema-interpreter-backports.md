---
"effect": patch
---

Align Schema construction and parsing semantics, simplify parse options, accept inherited declared fields, and move Union settings into a node-local options object.

### Breaking changes

- `Class.make`, `Class.makeOption`, and `Class.makeEffect` now return an existing instance unchanged. This avoids duplicate initialization and makes the construction APIs consistent. Use `new MyClass(input)` when a distinct instance is required.

- `Literal(0)` and `Literal(-0)` continue to accept either signed zero, but decoding and encoding now preserve the input sign. Add an explicit transformation when a canonical sign is required.

- `parseOptions` annotations no longer affect parsing. Options passed when creating or calling a decoder, encoder, or constructor adapter now apply to the complete operation. Move operation-wide settings from annotations to the relevant parser API.

- `propertyOrder` has been removed from `ParseOptions` because preserving input order required a separate, rarely used object reconstruction path. Schema parsing no longer guarantees that decoded object keys follow their input order. Remove the option and apply any required presentation or serialization order after parsing.

- `concurrency` has been removed from `ParseOptions` because its scope across nested composite schemas and Union candidates was ambiguous. Composite schema children are now parsed sequentially. There is no equivalent option for concurrent children within one schema; remove the option and combine independent parser calls with Effect concurrency operators instead.

- `onExcessProperty: "preserve"` has been removed because it allowed unvalidated values absent from the schema type to cross the parsing boundary. Model additional properties with `Record` or `StructWithRest`; `"ignore"` and `"error"` remain available.

- Declared `Struct` fields may now be inherited and are copied to own properties in the output. Dynamic `Record` index signatures remain own-only, while finite literal record keys are declared and may be inherited. The `__proto__` field remains own-only. Check ownership before parsing when every declared field must be own.

- `SchemaAST.Union.mode` moved to `SchemaAST.Union.options?.mode` so node-local constructor settings live in one options object instead of special top-level fields. An absent value defaults to `"anyOf"`. `SchemaRepresentation.Union` now serializes `{ options: { mode: "oneOf" } }`; update direct AST access and regenerate or migrate persisted representation documents. The public `Schema.Union(members, { mode })` call is unchanged.

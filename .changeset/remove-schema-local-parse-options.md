---
"effect": patch
---

Remove schema-local parse options and schema parsing concurrency.

### Breaking changes

- The `parseOptions` annotation no longer configures parsing. Pass options when creating or calling a decoder, encoder, or type guard instead. Those options apply throughout the parse; nested schema annotations cannot override them. The old key remains accepted as unrecognized custom metadata but has no parsing effect.
- `SchemaAST.ParseOptions` no longer accepts `concurrency`. Composite schemas parse their children sequentially, including asynchronous transformations and middleware. If independent parsing operations need to run concurrently, compose them explicitly with Effect concurrency combinators. Transformations and middleware can still manage concurrency within their own effects.

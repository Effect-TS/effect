---
"effect": minor
---

Add `Statement.withConnection` so drivers can run statements through the core execution path. It applies the current `CurrentTransformer`, compiles the statement with its own compiler, opens the statement span with the given operation as its method, follows `SpanPropagationEnabled` for propagation and connection wait time, and uses the enclosing transaction's connection when there is one. The callback also receives the row transform the statement would apply.

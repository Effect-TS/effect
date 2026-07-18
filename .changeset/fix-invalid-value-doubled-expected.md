---
"effect": patch
---

Fix doubled `Expected: Expected ...` prefixes in CLI `InvalidValue` error messages, closes #6312.

`Primitive.choice` now fails with a bare description of the accepted values, and `CliError.InvalidValue` no longer prepends its own `Expected:` label when the underlying failure message (e.g. a schema decode message) already reads as a complete `Expected ...` sentence.

Before:

```
Invalid value for flag --size: "bogus". Expected: Expected "small" | "medium" | "large", got "bogus"
```

After:

```
Invalid value for flag --size: "bogus". Expected: "small" | "medium" | "large"
```

Schema-backed primitives (`integer`, `float`, `boolean`, `date`) keep their full schema decode sentence, so the decoded actual is still shown after `got`:

```
Invalid value for flag --count: "3.14". Expected an integer, got 3.14
```

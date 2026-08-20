---
"effect": patch
---

Hide a value-taking flag from fish completion once it has been typed, as already happened for boolean flags.

Applying the same `__fish_contains_opt` dedup verbatim would have suppressed the flag's value completions too, since the same `complete` entry provides both; the condition makes an exception while the previous token is the flag itself, i.e. while fish is completing its value.

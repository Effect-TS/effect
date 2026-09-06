---
"effect": patch
---

Fix `Primitive.keyValuePair` in `effect/unstable/cli`, and the `Flag.keyValuePair` and `Param.keyValuePair` built on it, rejecting any pair whose value contains `=`. The pair is now split at the first `=`, so `--env DATABASE_URL=postgres://user:pass@host/db?sslmode=require` and `--env TOKEN=YWJjZA==` parse instead of failing with `Invalid key=value format`. Pairs with no `=`, an empty key, or an empty value are still rejected.

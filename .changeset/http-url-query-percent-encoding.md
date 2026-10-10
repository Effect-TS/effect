---
"effect": patch
---

Encode spaces in `Url` query parameters as `%20` instead of `+`.

`Url.make`, `Url.setUrlParams` and `Url.modifyUrlParams` previously serialized the
query with the `application/x-www-form-urlencoded` rules, which write a space as
`+`. Reading such a query back with `URLSearchParams` decodes `+` as a space
again, but the URL a caller observes changed in between: a `?foo=bar%20baz` that
was never touched came back as `?foo=bar+baz`. All three writers now route
through one encoder that percent-encodes spaces, so a literal `+` in a value is
written as `%2B` and a space as `%20` no matter which entry point built the URL.

The query is normalized rather than copied through byte-for-byte — reading the
parameters back through `URLSearchParams` also percent-encodes `,` and `/`, and
drops a trailing `=` from a valueless parameter.

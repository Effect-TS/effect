---
"@effect/platform": patch
---

simplify HttpApi path regex for parameters

HttpApi path parameters now only support the following syntax:

`:parameterName`

Conditional parameters are no longer supported (i.e. using `?` etc after the
parameter name).

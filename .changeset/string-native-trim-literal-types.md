---
"effect": patch
---

Correct `String.TrimStart`, `String.TrimEnd`, `String.Trim` and their function result types to recognize the complete ECMAScript whitespace and line terminator set, including vertical tab, form feed, non-breaking spaces and the byte order mark. Literal results now match the strings already returned by the native methods. Accepted inputs and runtime behavior are unchanged.

Callers relying on the previous, incorrect untrimmed literal types must update those assumptions. For example, `String.trim("\vhello\f")` now has type `"hello"`, not `"\vhello\f"`.

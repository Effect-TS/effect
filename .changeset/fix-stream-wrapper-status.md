---
"effect": patch
---

Honor status annotations on WithHeaders stream responses in HttpApiBuilder, preserving wrapper precedence and preventing response-header encoding failures when the wrapper and inner stream statuses differ.

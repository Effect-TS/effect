---
"effect": patch
---

Fix six `effect/ui` gaps: `onMount` may send nothing and can take an input it sees change, `head` gets props, `HtmlQuery.value` and `HtmlQuery.checked` read field values, state holding a `Schema.Redacted` is never serialised, and `View.Input` keeps requirements.

### Breaking changes

- `make({ head })` is now `head(model, props, loaded)`. Add the `props` parameter to a `head` that reads `loaded`.
- A component whose Model or loader Schemas hold a `Schema.Redacted` is no longer hydrated or restored from history. Move the secret into a leaf component or a service.
- `View.Input<Msg>` now accepts only children that need no service. Use `View.Input<Msg, R>`, or a generic tuple, to pass children that do.

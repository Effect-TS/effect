---
"effect": patch
---

Fix `Channel.runIntoPubSub` to include the channel's error type in its returned `Effect`. Channel failures were already propagated at runtime but the result was typed as `Effect<void, never, Env>`; code that annotated the result as infallible must now handle `OutErr`.

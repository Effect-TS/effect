---
"effect": patch
---

Declare `Reactivity`, `LanguageModel`, `EmbeddingModel`, and `Chat` as a same-name interface plus `Context.Service` key with a `TypeId` brand instead of a class. The service shape is now the exported interface itself (`LanguageModel.LanguageModel` instead of `LanguageModel.Service`, `Reactivity.Reactivity` instead of `Reactivity.Reactivity["Service"]`), and implementations must carry the module `TypeId`.

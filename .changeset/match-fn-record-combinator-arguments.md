---
"effect": patch
---

`Match.tags`, `Match.tagsExhaustive`, `Match.tagStartsWith`, `Match.discriminator`, `Match.discriminatorStartsWith`, `Match.discriminators`, `Match.discriminatorsExhaustive`, `Match.literals` and `Match.literalsExhaustive` now accept `Match.fn` matchers and pass the selector's arguments to their handlers.

---
"@effect/ai-anthropic": patch
---

Regenerate the Anthropic client from the spec bundled with the Anthropic SDK (`anthropics/anthropic-sdk-typescript@8752d02`), since the spec URL the code generator used is no longer published.

The client methods and their `4XX` error responses are unchanged, and response fields added by the newer spec are optional so older and Anthropic-compatible responses still decode.

The `Generated` module follows these upstream API migrations:

- `BetaSkill` now describes the Skill resource returned by the Skills API. The container skill parameter it used to describe is now `BetaContainerSkill`.
- Skill responses use `display_name`, `latest_version_id` and a structured `source` in place of `display_title`, `latest_version` and a string `source`. `CreateSkillResponse`, `GetSkillResponse`, `DeleteSkillResponse`, `CreateSkillVersionResponse`, `GetSkillVersionResponse`, `DeleteSkillVersionResponse`, their `Beta` variants and `Betaapi__schemas__skills__Skill` are replaced by `Skill`, `SkillVersion`, `DeletedSkill` and `DeletedSkillVersion` (and their `Beta` variants).
- The skill upload bodies `Body_create_skill_v1_skills_post` and `Body_create_skill_version_v1_skills__skill_id__versions_post` (and their `Beta` variants) are replaced by `*Multipart` schemas.
- File listing paginates with `page` and `next_page` in place of `before_id`/`after_id` and `first_id`/`last_id`.

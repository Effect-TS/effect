---
"@effect/ai-anthropic": patch
---

Regenerate the Anthropic client from the spec bundled with the Anthropic SDK (`anthropics/anthropic-sdk-typescript@8752d02`), since the spec URL the code generator used is no longer published.

The client methods and their `4XX` error responses are unchanged. Response fields added by the newer spec are optional, so older and Anthropic-compatible Messages and Models responses still decode. The Files and Skills migrations below are intentional breaking changes and do not decode the previous beta shapes.

The `Generated` module follows the upstream migration of the beta Files and Skills APIs to their GA shapes:

- `BetaSkill` now describes the Skill resource returned by the Skills API. The container skill parameter it used to describe is now `BetaContainerSkill`.
- Skill responses use `display_name`, `latest_version_id` and a structured `source` in place of `display_title`, `latest_version` and a string `source`. `CreateSkillResponse`, `GetSkillResponse`, `DeleteSkillResponse`, `CreateSkillVersionResponse`, `GetSkillVersionResponse`, `DeleteSkillVersionResponse`, their `Beta` variants and `Betaapi__schemas__skills__Skill` are replaced by `Skill`, `SkillVersion`, `DeletedSkill` and `DeletedSkillVersion` (and their `Beta` variants).
- The skill upload bodies `Body_create_skill_v1_skills_post` and `Body_create_skill_version_v1_skills__skill_id__versions_post` (and their `Beta` variants) are replaced by `*Multipart` schemas.
- File listing returns `{ data, next_page }` and paginates with `page` in place of `{ data, has_more, first_id, last_id }` and `before_id`/`after_id`.

When migrating, remove the dated `files-api-2025-04-14` and `skills-2025-10-02` tokens from any `anthropic-beta` header you send, and keep any other beta tokens. The API still returns the previous beta shapes to requests that send these tokens, and the new schemas cannot decode them. See the upstream migration guides for [Files](https://platform.claude.com/docs/en/build-with-claude/files#migrate-from-files-api-2025-04-14) and [Skills](https://platform.claude.com/docs/en/build-with-claude/skills-guide#migrate-from-skills-2025-10-02).

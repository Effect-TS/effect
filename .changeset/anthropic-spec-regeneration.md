---
"@effect/ai-anthropic": minor
---

Regenerate the Anthropic schemas from the pinned anthropic-sdk-typescript 0.135.0 spec, so newer request settings such as adaptive thinking `display` can be configured.

**Source-incompatible change:** the Skills API now returns a different shape, so the Skills client methods return the current wire schemas instead of the released response types:

- `createSkillV1SkillsPost`, `getSkillV1SkillsSkillIdGet` and their `beta*` variants return `Skill` / `BetaSkill`. Read `display_name` instead of `display_title`, and `latest_version_id` instead of `latest_version`.
- `createSkillVersionV1SkillsSkillIdVersionsPost`, `getSkillVersionV1SkillsSkillIdVersionsVersionGet` and their `beta*` variants return `SkillVersion` / `BetaSkillVersion`, which no longer include `directory` or `version`.
- `deleteSkillV1SkillsSkillIdDelete`, `deleteSkillVersionV1SkillsSkillIdVersionsVersionDelete` and their `beta*` variants return `DeletedSkill` / `DeletedSkillVersion`, whose `type` is a literal.
- The Skills list methods return `data` items in the current shape.

The released standalone exports, such as `CreateSkillResponse` and `GetSkillVersionResponse`, keep their released definitions for existing imports, but no method decodes with them.

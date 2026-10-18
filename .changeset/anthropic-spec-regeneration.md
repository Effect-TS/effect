---
"@effect/ai-anthropic": minor
---

Regenerate the unstable `Generated` module from the pinned anthropic-sdk-typescript 0.135.0 spec, so newer request settings such as adaptive thinking `display` can be configured. Released `Generated` exports keep their names and definitions.

### Breaking changes

The Skills API now returns a different shape, so the Skills client methods decode the current wire schemas, exported as new `*Resource` names:

- `createSkillV1SkillsPost`, `getSkillV1SkillsSkillIdGet` and their `beta*` variants return `SkillResource` / `BetaSkillResource`. Read `display_name` instead of `display_title`, and `latest_version_id` instead of `latest_version`.
- `createSkillVersionV1SkillsSkillIdVersionsPost`, `getSkillVersionV1SkillsSkillIdVersionsVersionGet` and their `beta*` variants return `SkillVersionResource` / `BetaSkillVersionResource`, which no longer include `directory` or `version`.
- `deleteSkillV1SkillsSkillIdDelete`, `deleteSkillVersionV1SkillsSkillIdVersionsVersionDelete` and their `beta*` variants return `DeletedSkill` / `DeletedSkillVersion`, whose `type` is a literal.
- `listSkillsV1SkillsGet`, `listSkillVersionsV1SkillsSkillIdVersionsGet` and their `beta*` variants return `List*ResourcesResponse`, whose `data` items use the shapes above. Page with `next_page` instead of `has_more`.

The released Skills exports, such as `Skill`, `CreateSkillResponse` and `ListSkillsResponse`, keep their released definitions for existing imports, but no method decodes with them.

---
"@effect/ai-anthropic": minor
---

Regenerate the unstable `Generated` module from the pinned anthropic-sdk-typescript 0.135.0 spec, so newer request settings such as adaptive thinking `display` can be configured. Every released `Generated` export name still exists. The released Skills schemas, such as `Skill` and `CreateSkillResponse`, keep their released definitions. Other released types follow the current API: they gain fields and union members, and fields added since the release stay optional, so older responses still decode.

### Breaking changes

- The Skills client methods decode the current API shapes, exported under new `*Resource` names. No method decodes with the released Skills schemas.
  - `createSkillV1SkillsPost`, `getSkillV1SkillsSkillIdGet` and their `beta*` variants return `SkillResource` / `BetaSkillResource`. Read `display_name` instead of `display_title`, and `latest_version_id` instead of `latest_version`.
  - `createSkillVersionV1SkillsSkillIdVersionsPost`, `getSkillVersionV1SkillsSkillIdVersionsVersionGet` and their `beta*` variants return `SkillVersionResource` / `BetaSkillVersionResource`, which no longer include `directory` or `version`.
  - The Skills list methods return `List*ResourcesResponse`. Page with `next_page` instead of `has_more`.
  - The delete methods and Skill version results type `type` as the literal the API always sends, such as `"skill_deleted"` and `"skill_version"`, instead of `string`.
- Uploads take files instead of strings. `UploadFileV1FilesPostRequestFormData.file` and each Skills `files` entry are a `File` or `Blob`. Skills `files` is now required and non-null. As before, every file must be in one top-level directory that has a `SKILL.md`. The Skills create input renames `display_title` to `display_name`:

  ```ts
  const created = client.betaCreateSkillV1SkillsPost({
    payload: {
      display_name: "My skill",
      files: [new File([skillMd], "my-skill/SKILL.md", { type: "text/markdown" })]
    },
    config: undefined
  })
  ```

- `BetaMessageIterationUsage.model` can be `null` as well as missing. Read it with a fallback, such as `usage.model ?? "unknown"`.
- Text blocks in `BetaResponseMCPToolResultBlock` content have optional `citations`. Read them with a fallback, such as `part.citations ?? []`.
- Response unions gain members. Exhaustive `switch`es without a default need new cases:
  - web fetch `error_code` adds `"content_too_large"`;
  - stop reasons add `"model_context_window_exceeded"`;
  - beta content blocks, server tool names and iteration usage add advisor variants.

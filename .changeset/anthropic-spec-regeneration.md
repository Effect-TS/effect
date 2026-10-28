---
"@effect/ai-anthropic": minor
---

Regenerate the unstable `Generated` module from the pinned anthropic-sdk-typescript 0.135.0 spec, so newer request settings such as adaptive thinking `display` can be configured. Every released `Generated` export name still exists. The released Skills schemas, such as `Skill` and `CreateSkillResponse`, keep their released definitions. Other released types follow the current API: they gain fields and union members, and fields added since the release stay optional, so older responses still decode. The Files and Skills changes below are the exception: they follow Anthropic's migration of those APIs to their GA shapes and do not decode the previous beta shapes.

### Breaking changes

- The Skills client methods decode the current API shapes, exported under new `*Resource` names. No method decodes with the released Skills schemas.
  - `createSkillV1SkillsPost`, `getSkillV1SkillsSkillIdGet` and their `beta*` variants return `SkillResource` / `BetaSkillResource`. Read `display_name` instead of `display_title`, and `latest_version_id` instead of `latest_version`.
  - `createSkillVersionV1SkillsSkillIdVersionsPost`, `getSkillVersionV1SkillsSkillIdVersionsVersionGet` and their `beta*` variants return `SkillVersionResource` / `BetaSkillVersionResource`, which no longer include `directory` or `version`.
  - The Skills list methods return `List*ResourcesResponse`. Page with `next_page` instead of `has_more`.
  - The delete methods and Skill version results type `type` as the literal the API always sends, such as `"skill_deleted"` and `"skill_version"`, instead of `string`.
- The Files list methods `listFilesV1FilesGet` and `betaListFilesV1FilesGet` page with `page` and `next_page`. Their params no longer include `before_id` or `after_id`, and `FileListResponse` / `BetaFileListResponse` no longer include `has_more`, `first_id` or `last_id`. Pass the previous response's `next_page` as `page` to fetch the next page.
- When migrating to the current Files and Skills shapes, remove the dated `files-api-2025-04-14` and `skills-2025-10-02` tokens from any `anthropic-beta` header you send, and keep any other beta tokens. The API still returns the previous beta shapes to requests that send these tokens, and the Files and Skills methods cannot decode them. See the upstream migration guides for [Files](https://platform.claude.com/docs/en/build-with-claude/files#migrate-from-files-api-2025-04-14) and [Skills](https://platform.claude.com/docs/en/build-with-claude/skills-guide#migrate-from-skills-2025-10-02).
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

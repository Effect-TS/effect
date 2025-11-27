---
"@effect-native/platform-github": minor
---

Add new package for building GitHub Actions with Effect.

Features:
- ActionRunner: Input/output handling, logging, groups, environment variables, state, OIDC tokens
- ActionContext: Typed access to workflow context (event, repo, actor, run info)
- ActionClient: Effect-wrapped Octokit client for GitHub API (REST, GraphQL, pagination)
- ActionSummary: Fluent API for building job summaries
- ActionError: Typed error hierarchy for all failure modes
- Test utilities: Mock layers for unit testing actions
- runMain: Entrypoint with proper error handling and failure reporting

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { ReleaseError } from "./Errors.ts"
import { findWorkspaceRoot, runCommandOk } from "./Process.ts"

export interface PullRequest {
  readonly number: number
  readonly url: string
  readonly headRef: string
  readonly baseRef: string
  readonly title: string
  readonly body: string
}

const PullRequestJson = Schema.Struct({
  number: Schema.Number,
  url: Schema.String,
  headRefName: Schema.String,
  baseRefName: Schema.String,
  title: Schema.String,
  body: Schema.String
})

const JSON_FIELDS = "number,url,headRefName,baseRefName,title,body"

const decodePullRequests = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(PullRequestJson)))
const decodePullRequest = Schema.decodeUnknownEffect(Schema.fromJsonString(PullRequestJson))

const toPullRequest = (json: typeof PullRequestJson.Type): PullRequest => ({
  number: json.number,
  url: json.url,
  headRef: json.headRefName,
  baseRef: json.baseRefName,
  title: json.title,
  body: json.body
})

/**
 * Pull-request operations against the repository the tool runs in. The
 * implementation uses the `gh` CLI with the token CI provides (`GH_TOKEN`);
 * that token must be the PAT the changesets flow used, so that checks run on
 * the version branch.
 */
export class GitHub extends Context.Service<GitHub, {
  /** The open PR from `head` into `base`, if any. */
  readonly findPullRequest: (query: {
    readonly head: string
    readonly base: string
  }) => Effect.Effect<Option.Option<PullRequest>, ReleaseError>
  readonly createPullRequest: (input: {
    readonly head: string
    readonly base: string
    readonly title: string
    readonly body: string
  }) => Effect.Effect<PullRequest, ReleaseError>
  readonly updatePullRequest: (number: number, input: {
    readonly title: string
    readonly body: string
  }) => Effect.Effect<PullRequest, ReleaseError>
}>()("@effect/release/GitHub") {
  static readonly layer: Layer.Layer<GitHub, never, ChildProcessSpawner | FileSystem.FileSystem | Path.Path> = Layer
    .effect(
      GitHub,
      Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
        const spawner = yield* ChildProcessSpawner
        const gh = (args: ReadonlyArray<string>) =>
          runCommandOk("gh", args, { cwd: root }).pipe(Effect.provideService(ChildProcessSpawner, spawner))

        const unexpected = (what: string) => (cause: unknown) =>
          new ReleaseError({ message: `Unexpected output from gh ${what}`, cause })

        const view = (selector: string) =>
          gh(["pr", "view", selector, "--json", JSON_FIELDS]).pipe(
            Effect.flatMap((stdout) => decodePullRequest(stdout).pipe(Effect.mapError(unexpected("pr view")))),
            Effect.map(toPullRequest)
          )

        /** `gh` reads the body from a file so that long Markdown never hits argv limits. */
        const withBodyFile = <A, E>(body: string, use: (file: string) => Effect.Effect<A, E>) =>
          Effect.scoped(
            Effect.gen(function*() {
              const file = yield* fs.makeTempFileScoped({ prefix: "effect-release-", suffix: ".md" }).pipe(
                Effect.mapError((cause) => new ReleaseError({ message: "Could not create the PR body file", cause }))
              )
              yield* fs.writeFileString(file, body).pipe(
                Effect.mapError((cause) => new ReleaseError({ message: "Could not write the PR body file", cause }))
              )
              return yield* use(file)
            })
          )

        return GitHub.of({
          findPullRequest: ({ base, head }) =>
            gh(["pr", "list", "--state", "open", "--head", head, "--base", base, "--limit", "1", "--json", JSON_FIELDS])
              .pipe(
                Effect.flatMap((stdout) => decodePullRequests(stdout).pipe(Effect.mapError(unexpected("pr list")))),
                Effect.map((list) => Option.fromUndefinedOr(list[0]).pipe(Option.map(toPullRequest)))
              ),
          createPullRequest: ({ base, body, head, title }) =>
            withBodyFile(
              body,
              (file) => gh(["pr", "create", "--head", head, "--base", base, "--title", title, "--body-file", file])
            ).pipe(Effect.andThen(view(head))),
          updatePullRequest: (number, { body, title }) =>
            withBodyFile(body, (file) => gh(["pr", "edit", String(number), "--title", title, "--body-file", file]))
              .pipe(Effect.andThen(view(String(number))))
        })
      })
    )
}

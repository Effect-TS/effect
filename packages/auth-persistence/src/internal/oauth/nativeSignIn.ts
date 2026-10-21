import { CurrentCommitJournal, type LifecycleHooks } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import type { SqlClient } from "effect/sql/SqlClient"

import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { makeSqlCommitExecutor, registerSqlCommitReceipt, SqlBatchCommit } from "../sqlCommit.ts"
import { makeOAuthNativeFlow } from "./nativeFlow.ts"
import { makeOAuthNativeState, type OAuthNativeReadMapping } from "./nativeState.ts"
import { invalidState, unavailable } from "./state.ts"

/** @internal */
export const prepareOAuthNative = Effect.fnUntraced(
  function*<Value, A>(value: Value, prepare: OAuth.PrepareOAuthCommit<Value, A>) {
    const journal = yield* CurrentCommitJournal

    const receipt = prepare(value, journal)

    if (!(receipt?._tag === "PreparedCommit" && Effect.isEffect(receipt.read))) {
      return yield* invalidState()
    }
    yield* registerSqlCommitReceipt(receipt)

    return receipt
  }
)

/** Both physical adapters bind the same native SQL operations. */
export const makeNativeOAuthSignInServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeReadMapping,
  batch?: SqlBatchCommit["Service"]
): Effect.fn.Return<
  { readonly oauthSignInPersistence: OAuth.OAuthSignInPersistence["Service"] },
  OAuth.OAuthUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom
> {
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const state = yield* makeOAuthNativeState(tables, mapping)

  const flow = yield* makeOAuthNativeFlow(
    tables,
    mapping,
    OAuth.OAuthSignInFlow,
    "sign-in",
    () => undefined,
    batch !== undefined
  )

  const mode = flow.mysql ? "transaction" : "statement"

  const run = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    selected: "transaction" | "statement" = mode
  ) =>
    batch === undefined
      ? executor.run(effect, selected)
      : executor.batch(effect).pipe(Effect.provideService(SqlBatchCommit, batch))

  const service: OAuth.OAuthSignInPersistence["Service"] = {
    issue: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthSignInFlow, original)
          const issued = yield* flow.issue(input)

          return yield* prepareOAuthNative(
            issued ? { _tag: "Issued", flow: input } : { _tag: "Rejected" },
            prepare
          )
        }),
        mode
      ),
    consume: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthSignInAccess, original)
          const consumed = yield* flow.consume(input)

          return yield* prepareOAuthNative(
            consumed === undefined ? { _tag: "Rejected" } : { _tag: "Consumed", flow: consumed },
            prepare
          )
        }),
        mode
      ),
    resolve: (input) =>
      executor.read(
        Effect.suspend(() =>
          state.resolve(
            input.moduleId,
            OAuth.snapshotOAuthSync(OAuth.OAuthExternalIdentity, input.identity)
          )
        ).pipe(Effect.provideContext(cryptoServices))
      ),
    cleanup: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = OAuth.snapshotOAuthSync(OAuth.OAuthCleanupInput, original)

          return yield* prepareOAuthNative(
            yield* flow.cleanup(input.moduleId, input.limit),
            prepare
          )
        }),
        "statement"
      )
  }

  return { oauthSignInPersistence: service }
})

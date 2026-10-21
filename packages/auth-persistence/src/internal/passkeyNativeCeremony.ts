import * as Passkey from "@effect/auth/Passkey"
import * as Effect from "effect/Effect"

import type { PasskeyCeremonyMapping } from "./models/passkeyModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { passkeyOperationInputs } from "./passkeyInputs.ts"
import { preparePasskeyNative } from "./passkeyNative.ts"
import { makePasskeyNativeFlow } from "./passkeyNativeFlow.ts"
import { invalidPasskeyState } from "./passkeyNativeState.ts"
import { makeSqlCommitExecutor, SqlBatchCommit } from "./sqlCommit.ts"
import type { TableModel } from "./tableModel.ts"

// Physical SQL expressions are validated by the table compiler.
// oxlint-disable-next-line no-explicit-any
export type NativePasskeyCeremonyMapping = PasskeyCeremonyMapping<TableModel, any>

export const makeNativePasskeyCeremonyServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: NativePasskeyCeremonyMapping,
  batch?: SqlBatchCommit["Service"]
) {
  const flow = yield* makePasskeyNativeFlow(tables, mapping)
  const executor = yield* makeSqlCommitExecutor(() => Passkey.PasskeyUnavailable.make({}))

  const run = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    batch === undefined
      ? executor.run(effect, "statement")
      : executor.batch(effect).pipe(Effect.provideService(SqlBatchCommit, batch))

  const passkeyPersistence: Passkey.PasskeyPersistence["Service"] = {
    issue: () => Effect.fail(Passkey.PasskeyUnavailable.make({})),
    consume: () => Effect.fail(Passkey.PasskeyUnavailable.make({})),
    context: (access) =>
      executor.read(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(Passkey.PasskeyAccess, access)

          if (!(input.purpose === "registration")) return yield* invalidPasskeyState()

          return yield* flow.context(input)
        })
      ),
    cleanup: (original, prepare) =>
      run(
        Effect.gen(function*() {
          const input = Passkey.snapshotPasskeySync(passkeyOperationInputs.cleanup, original)

          if (!flow.validModule(input.moduleId)) return yield* invalidPasskeyState()

          return yield* preparePasskeyNative(
            yield* flow.cleanup(input.moduleId, input.limit, batch !== undefined),
            prepare
          )
        })
      )
  }

  return {
    passkeyPersistence,
    capabilities: {
      purposes: ["registration"] as const,
      issue: "registration-authority" as const,
      assertionConsumption: false as const
    }
  }
})

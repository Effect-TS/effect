import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

import { configure } from "./patch.ts"

export const command = (assets: URL) => {
  const root = Command.make("effect-drizzle-patch").pipe(
    Command.withDescription("Configure a temporary Drizzle compatibility patch for Bun projects"),
    Command.withSharedFlags({
      directory: Flag.String("dir").pipe(
        Flag.withDescription("Bun project or workspace directory"),
        Flag.withDefault(".")
      )
    })
  )

  return root.pipe(
    Command.withSubcommands(
      (["patch", "unpatch"] as const).map((action) =>
        Command.make(
          action,
          {},
          Effect.fn(function*() {
            const { directory } = yield* root
            const result = yield* configure(directory, assets, action)

            yield* Console.log(result)
          })
        ).pipe(
          Command.withDescription(
            action === "patch"
              ? "Save the verified Drizzle patch and run bun install"
              : "Remove this tool's patch and run bun install"
          )
        )
      )
    )
  )
}

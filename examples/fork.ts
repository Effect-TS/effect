import { Effect } from "effect"

for (let i = 0; i < 200000; i++) {
  Effect.runFork(Effect.unit)
}

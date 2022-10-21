const makeSet = Effect.acquireRelease(
  Effect.sync(new Set<string>()),
  (set) => Effect.log(`cleaning: [${Array.from(set).join(", ")}]`) > Effect.sync(set.clear())
)

const program = Effect.scoped(
  makeSet.flatMap((s) => Effect.sync(s.add("a"))) > Effect.log("done")
)
;(program / LogLevel.locally(LogLevel.Warning)).unsafeRunPromise()

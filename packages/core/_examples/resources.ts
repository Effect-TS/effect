const makeSet = Effect.acquireRelease(
  Effect.succeed(new Set<string>()),
  (set) => Effect.log(`cleaning: [${Array.from(set).join(", ")}]`) > Effect.succeed(set.clear())
);

const program = Effect.scoped(
  makeSet.flatMap((s) => Effect.succeed(s.add("a"))) > Effect.log("done")
);

(program / LogLevel.locally(LogLevel.Warning)).unsafeRunPromise();

export const loseTimeAndCpu: Effect<HasClock, never, void> = (
  Effect.yieldNow < Clock.sleep((1).millis)
).repeatN(100);

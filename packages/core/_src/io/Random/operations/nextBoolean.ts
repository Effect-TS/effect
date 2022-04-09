/**
 * @tsplus static ets/Random/Ops nextBoolean
 */
export const nextBoolean: RIO<HasRandom, boolean> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.nextBoolean
);

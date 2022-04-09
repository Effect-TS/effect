/**
 * @tsplus static ets/Random/Ops nextInt
 */
export const nextInt: RIO<HasRandom, number> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.nextInt
);

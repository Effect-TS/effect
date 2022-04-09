/**
 * @tsplus static ets/Random/Ops next
 */
export const next: RIO<HasRandom, number> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.next
);

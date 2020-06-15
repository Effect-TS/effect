export class FiberRef<A> {
  constructor(
    readonly initial: A,
    readonly fork: (a: A) => A,
    readonly join: (a: A, a1: A) => A
  ) {}
}

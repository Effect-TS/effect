export class LazyValue<A> {
  static make = <A>(f: () => A) => new LazyValue(f);

  constructor(private __lazy: () => A) {}
  get value(): A {
    const computed = this.__lazy();

    Object.defineProperty(this, "value", {
      value: computed
    });

    return computed;
  }
}

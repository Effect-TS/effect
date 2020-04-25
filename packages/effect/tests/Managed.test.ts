import * as assert from "assert";
import { Do } from "fp-ts-contrib/lib/Do";
import { semigroupSum, getLastSemigroup } from "fp-ts/lib/Semigroup";
import { monoidSum } from "fp-ts/lib/Monoid";
import * as Ar from "fp-ts/lib/Array";

import { effect as T, managed as M, exit as Ex } from "../src";

describe("Managed", () => {
  it("should use resource encaseEffect", async () => {
    const resource = M.encaseEffect(T.pure(1));

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource encaseEffect with environment", async () => {
    const config = {
      test: 1
    };

    const resource = M.encaseEffect(T.accessM(({ test }: typeof config) => T.pure(test)));

    const result = await T.runToPromise(
      T.provide(config)(
        M.use(resource, (n) => T.accessM(({ test }: typeof config) => T.pure(n + test)))
      )
    );

    assert.deepEqual(result, 2);
  });

  it("should use resource bracket", async () => {
    let released = false;

    const resource = M.bracket(T.pure(1), () =>
      T.sync(() => {
        released = true;
      })
    );

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
    assert.deepEqual(released, true);
  });

  it("should use resource pure", async () => {
    const resource = M.pure(1);

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource suspend", async () => {
    const resource = M.suspend(T.sync(() => M.pure(1)));

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource chain", async () => {
    const resource = M.pure(1);
    const chain = M.chain((n: number) => M.pure(n + 1));

    const result = await T.runToPromise(M.use(chain(resource), (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource map", async () => {
    const resource = M.pure(1);
    const mapped = M.managed.map(resource, (n) => n + 1);

    const result = await T.runToPromise(M.use(mapped, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource mapWith", async () => {
    const resource = M.pure(1);
    const mapped = M.map((n: number) => n + 1);

    const result = await T.runToPromise(M.use(mapped(resource), (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource zip", async () => {
    const ma = M.pure(1);
    const mb = M.pure(1);
    const zip = M.zip(ma, mb);

    const result = await T.runToPromise(M.use(zip, ([n, m]) => T.pure(n + m)));

    assert.deepEqual(result, 2);
  });

  describe("parZip", () => {
    it("should use both resources", async () => {
      const ma = M.pure(1);
      const mb = M.pure(1);
      const zip = M.parZip(ma, mb, getLastSemigroup());

      const result = await T.runToPromise(M.use(zip, ([n, m]) => T.pure(n + m)));

      assert.deepEqual(result, 2);
    });

    it("should catch both errors", async () => {
      const ma = M.bracket(T.pure(1), () => T.raiseError(["first"]));
      const mb = M.bracket(T.pure(2), () => T.raiseError(["second"]));
      const zip = M.parZip(ma, mb, Ar.getMonoid<string>());

      const result = await T.runToPromiseExit(M.use(zip, ([n, m]) => T.pure(n + m)));

      assert.deepEqual(result, Ex.raise(["first", "second"]));
    });
  });

  it("should use resource ap", async () => {
    const ma = M.pure(1);
    const mfab = M.pure((n: number) => n + 1);
    const ap = M.ap(ma, mfab);

    const result = await T.runToPromise(M.use(ap, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource ap_", async () => {
    const ma = M.pure(1);
    const mfab = M.pure((n: number) => n + 1);
    const ap = M.managed.ap(mfab, ma);

    const result = await T.runToPromise(M.use(ap, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource as", async () => {
    const ma = M.pure(1);
    const result = await T.runToPromise(M.use(M.as(ma, 2), (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource to", async () => {
    const ma = M.pure(1);
    const result = await T.runToPromise(M.use(M.to(2)(ma), (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource chainTap", async () => {
    const ma = M.pure(1);
    const mm = M.encaseEffect(T.sync(() => ({} as unknown)));
    const mb = M.chainTap(ma, (_) => mm);

    const result = await T.runToPromise(M.use(mb, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource chainTapWith", async () => {
    const ma = M.pure(1);
    const mm = M.encaseEffect(T.sync(() => ({} as unknown)));
    const mb = M.chainTapWith((_: number) => mm);

    const result = await T.runToPromise(M.use(mb(ma), (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource allocate", async () => {
    let released = false;

    const program = Do(T.effect)
      .bindL("resource", () =>
        M.allocate(
          M.bracket(T.pure(1), () =>
            T.sync(() => {
              released = true;
            })
          )
        )
      )
      .bindL("result", ({ resource }) => T.pure(resource.a + 1))
      .doL(({ resource }) => resource.release)
      .return(({ result }) => result);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 2);
    assert.deepEqual(released, true);
  });

  it("should use resource consume", async () => {
    const resource = M.pure(1);
    const mapped = M.consume((n: number) => T.pure(n + 1));

    const result = await T.runToPromise(T.effect.chain(mapped(resource), (n) => T.pure(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource provide", async () => {
    const resourceA = M.pure({ n: 1 });
    const program = T.access(({ n }: { n: number }) => n + 1);

    const result = await T.runToPromise(M.provide(resourceA)(program));

    assert.deepEqual(result, 2);
  });

  it("should use resource of", async () => {
    const resourceA = M.managed.of(1);

    const result = await T.runToPromise(M.use(resourceA, (n) => T.pure(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource getSemigroup", async () => {
    const S = M.getSemigroup(semigroupSum);

    const resourceA = M.managed.of(1);
    const resourceB = M.managed.of(1);

    const result = await T.runToPromise(
      M.use(S.concat(resourceB, resourceA), (n) => T.pure(n + 1))
    );

    assert.deepEqual(result, 3);
  });

  it("should use resource getMonoid", async () => {
    const S = M.getMonoid(monoidSum);

    const resourceA = M.managed.of(1);
    const resourceB = M.managed.of(1);

    const result = await T.runToPromise(
      M.use(S.concat(resourceB, resourceA), (n) => T.pure(n + 1))
    );

    assert.deepEqual(result, 3);
  });
});

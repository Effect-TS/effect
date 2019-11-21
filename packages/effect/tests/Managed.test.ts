import * as assert from "assert";
import * as T from "../src";
import * as M from "../src/managed";
import { Do } from "fp-ts-contrib/lib/Do";
import { semigroupSum } from "fp-ts/lib/Semigroup";
import { monoidSum } from "fp-ts/lib/Monoid";

describe("Managed", () => {
  it("should use resource encaseEffect", async () => {
    const resource = M.encaseEffect(T.right(1));

    const result = await T.promise(M.use(resource, n => T.right(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource bracket", async () => {
    let released = false;

    const resource = M.bracket(T.right(1), () =>
      T.syncTotal(() => {
        released = true;
      })
    );

    const result = await T.promise(M.use(resource, n => T.right(n + 1)));

    assert.deepEqual(result, 2);
    assert.deepEqual(released, true);
  });

  it("should use resource pure", async () => {
    const resource = M.pure(1);

    const result = await T.promise(M.use(resource, n => T.right(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource suspend", async () => {
    const resource = M.suspend(T.syncTotal(() => M.pure(1)));

    const result = await T.promise(M.use(resource, n => T.right(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource chainWith", async () => {
    const resource = M.pure(1);
    const chainWith = M.chainWith((n: number) => M.pure(n + 1));

    const result = await T.promise(
      M.use(chainWith(resource), n => T.right(n + 1))
    );

    assert.deepEqual(result, 3);
  });

  it("should use resource map", async () => {
    const resource = M.pure(1);
    const mapped = M.map(resource, n => n + 1);

    const result = await T.promise(M.use(mapped, n => T.right(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource mapWith", async () => {
    const resource = M.pure(1);
    const mapped = M.mapWith((n: number) => n + 1);

    const result = await T.promise(
      M.use(mapped(resource), n => T.right(n + 1))
    );

    assert.deepEqual(result, 3);
  });

  it("should use resource zip", async () => {
    const ma = M.pure(1);
    const mb = M.pure(1);
    const zip = M.zip(ma, mb);

    const result = await T.promise(M.use(zip, ([n, m]) => T.right(n + m)));

    assert.deepEqual(result, 2);
  });

  it("should use resource ap", async () => {
    const ma = M.pure(1);
    const mfab = M.pure((n: number) => n + 1);
    const ap = M.ap(ma, mfab);

    const result = await T.promise(M.use(ap, n => T.right(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource ap_", async () => {
    const ma = M.pure(1);
    const mfab = M.pure((n: number) => n + 1);
    const ap = M.ap_(mfab, ma);

    const result = await T.promise(M.use(ap, n => T.right(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource as", async () => {
    const ma = M.pure(1);
    const result = await T.promise(M.use(M.as(ma, 2), n => T.right(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource to", async () => {
    const ma = M.pure(1);
    const result = await T.promise(M.use(M.to(2)(ma), n => T.right(n + 1)));

    assert.deepEqual(result, 3);
  });

  it("should use resource chainTap", async () => {
    const ma = M.pure(1);
    const mm = M.encaseEffect(
      T.syncTotal(() => {
        return {};
      })
    );
    const mb = M.chainTap(ma, a => mm);

    const result = await T.promise(M.use(mb, n => T.right(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource chainTapWith", async () => {
    const ma = M.pure(1);
    const mm = M.encaseEffect(
      T.syncTotal(() => {
        return {};
      })
    );
    const mb = M.chainTapWith((a: number) => mm);

    const result = await T.promise(M.use(mb(ma), n => T.right(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource allocate", async () => {
    let released = false;

    const program = Do(T.effectMonad)
      .bindL("resource", () =>
        M.allocate(
          M.bracket(T.right(1), () =>
            T.syncTotal(() => {
              released = true;
            })
          )
        )
      )
      .bindL("result", ({ resource }) => T.right(resource.a + 1))
      .doL(({ resource }) => resource.release)
      .return(({ result }) => result);

    const result = await T.promise(program);

    assert.deepEqual(result, 2);
    assert.deepEqual(released, true);
  });

  it("should use resource consume", async () => {
    const resource = M.pure(1);
    const mapped = M.consume((n: number) => T.right(n + 1));

    const result = await T.promise(
      T.effectMonad.chain(mapped(resource), n => T.right(n + 1))
    );

    assert.deepEqual(result, 3);
  });

  it("should use resource provideTo", async () => {
    const resourceA = M.pure(1);
    const program = T.access((n: number) => n + 1);

    const result = await T.promise(M.provideTo(resourceA, program));

    assert.deepEqual(result, 2);
  });

  it("should use resource of", async () => {
    const resourceA = M.managed.of(1);

    const result = await T.promise(M.use(resourceA, n => T.right(n + 1)));

    assert.deepEqual(result, 2);
  });

  it("should use resource getSemigroup", async () => {
    const S = M.getSemigroup(semigroupSum);

    const resourceA = M.managed.of(1);
    const resourceB = M.managed.of(1);

    const result = await T.promise(
      M.use(S.concat(resourceB, resourceA), n => T.right(n + 1))
    );

    assert.deepEqual(result, 3);
  });

  it("should use resource getMonoid", async () => {
    const S = M.getMonoid(monoidSum);

    const resourceA = M.managed.of(1);
    const resourceB = M.managed.of(1);

    const result = await T.promise(
      M.use(S.concat(resourceB, resourceA), n => T.right(n + 1))
    );

    assert.deepEqual(result, 3);
  });
});

import { assert, run, testM, suite } from "../src";
import { effect as T } from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import { flow } from "fp-ts/lib/function";

interface Sum {
  sum: {
    a: number;
    b: number;
    e: number;
  };
}

interface Mul {
  mul: {
    a: number;
    b: number;
    e: number;
  };
}

interface Div {
  div: {
    a: number;
    b: number;
    e: number;
  };
}

interface Sub {
  sub: {
    a: number;
    b: number;
    e: number;
  };
}

const demoSuite = suite("demo")(
  testM("sum")(
    Do(T.effect)
      .bind("env", T.accessEnvironment<Sum>())
      .bindL("c", ({ env: { sum: { a, b } } }) =>
        T.delay(
          T.sync(() => a + b),
          100
        )
      )
      .return((s) => assert.deepEqual(s.c, s.env.sum.e))
  ),
  testM("mul")(
    Do(T.effect)
      .bind("env", T.accessEnvironment<Mul>())
      .bindL("c", ({ env: { mul: { a, b } } }) =>
        T.delay(
          T.sync(() => a * b),
          100
        )
      )
      .return((s) => assert.deepEqual(s.c, s.env.mul.e))
  )
);

const demo2Suite = suite("demo2")(
  testM("sub")(
    Do(T.effect)
      .bind("env", T.accessEnvironment<Sub>())
      .bindL("c", ({ env: { sub: { a, b } } }) =>
        T.delay(
          T.sync(() => a - b),
          100
        )
      )
      .return((s) => assert.deepEqual(s.c, s.env.sub.e))
  ),
  testM("div")(
    Do(T.effect)
      .bind("env", T.accessEnvironment<Div>())
      .bindL("c", ({ env: { div: { a, b } } }) =>
        T.delay(
          T.sync(() => a / b),
          100
        )
      )
      .return((s) => assert.deepEqual(s.c, s.env.div.e))
  )
);

run(
  demoSuite,
  demo2Suite
)(
  flow(
    T.provideS<Sum>({
      sum: {
        a: 1,
        b: 2,
        e: 3
      }
    }),
    T.provideS<Mul>({
      mul: {
        a: 2,
        b: 3,
        e: 6
      }
    }),
    T.provideS<Sub>({
      sub: {
        a: 3,
        b: 2,
        e: 1
      }
    }),
    T.provideS<Div>({
      div: {
        a: 6,
        b: 3,
        e: 2
      }
    })
  )
);

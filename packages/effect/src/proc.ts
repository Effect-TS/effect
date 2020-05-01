import * as T from "./effect";
import { ATypeOf, ETypeOf, RTypeOf, UnionToIntersection } from "./overloadEff";
import { Exit } from "./exit";
import { record as Rec } from "fp-ts";
import { pipe } from "fp-ts/lib/pipeable";

export function runAll<Procs extends Record<string, T.Effect<any, any, any, any>>>(
  procs: Procs
): T.AsyncR<
  UnionToIntersection<
    {
      [k in keyof Procs]: unknown extends RTypeOf<Procs[k]> ? never : RTypeOf<Procs[k]>;
    }[keyof Procs]
  >,
  {
    [k in keyof Procs]: Exit<ETypeOf<Procs[k]>, ATypeOf<Procs[k]>>;
  }
> {
  const listeners: Array<T.Fiber<any, any>> = [];
  let fired = false;

  const fire = () => {
    if (!fired) {
      fired = true;
      listeners.forEach((fiber) => {
        T.run(
          pipe(
            fiber.isComplete,
            T.chain((c) => (c ? T.unit : T.asUnit(fiber.interrupt)))
          )
        );
      });
    }
  };

  const fibers = T.access((_: any) =>
    Rec.record.map(procs, (x) => {
      const fiber = pipe(x, T.provide(_), T.fork, T.runUnsafeSync);
      listeners.push(fiber);
      return fiber;
    })
  );

  const waits = T.effect.map(fibers, (rec) =>
    Rec.record.map(rec, (f) =>
      T.effect.chainTap(f.wait, (ex) =>
        T.sync(() => {
          if (ex._tag !== "Done") {
            fire();
          }
        })
      )
    )
  );

  const exits = T.effect.chain(waits, Rec.record.sequence(T.parEffect));

  return exits as any;
}

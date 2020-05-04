import { effect as T } from "../src";
import { right, left } from "fp-ts/lib/Either";
import { raise } from "../src/exit";

describe("ParFast", () => {
  it("should cancel", async () => {
    const a = jest.fn();
    const b = jest.fn();
    const c = jest.fn();
    const d = jest.fn();

    function calling(f: () => void) {
      return T.async((r) => {
        const handle = setTimeout(() => {
          r(right(undefined));
        }, 2000);
        return (cb) => {
          f();
          clearTimeout(handle);
          cb();
        };
      });
    }

    const processes = [
      calling(a),
      calling(b),
      T.async((r) => {
        const handle = setTimeout(() => {
          r(left("ok"));
        }, 100);
        return (cb) => {
          clearTimeout(handle);
          cb();
        };
      }),
      calling(c),
      calling(d)
    ];

    const result = await T.runToPromiseExit(T.sequenceArrayParFast(processes));

    expect(result).toStrictEqual(raise("ok"));
    expect(a.mock.calls.length).toStrictEqual(1);
    expect(b.mock.calls.length).toStrictEqual(1);
    expect(c.mock.calls.length).toStrictEqual(1);
    expect(d.mock.calls.length).toStrictEqual(1);
  });
});

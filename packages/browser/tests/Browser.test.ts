import { effect as T } from "@matechs/effect";
import * as B from "../src";
import * as assert from "assert";
import { some } from "fp-ts/lib/Option";

class MockStorage implements Storage {
  [name: string]: any;

  get length() {
    return this.st.length;
  }

  // tslint:disable-next-line: no-empty
  constructor(private st: Array<[string, string]>) {}

  clear(): void {
    this.st = [];
  }
  getItem(key: string): string | null {
    return this.st.find(x => x[0] === key)?.[1] || null;
  }
  key(index: number): string | null {
    return this.st[index]?.[0];
  }
  removeItem(key: string): void {
    const i = this.st.findIndex(x => x[0] === key);

    if (i >= 0) {
      this.st = this.st.filter((_, i2) => i2 !== i);
    }
  }
  setItem(key: string, value: string): void {
    this.st.push([key, value]);
  }
}

const session = new MockStorage([]);
const local = new MockStorage([]);

function run<E, A>(eff: T.Effect<B.SessionStorageEnv & B.LocalStorageEnv, E, A>) {
  return T.runToPromise(T.provideAll(B.storageEnv(session, local))(eff));
}

describe("Browser", () => {
  it("local storage", async () => {
    await run(B.localStore.setItem("foo", "bar"));
    const l = await run(B.localStore.length);
    const f = await run(B.localStore.getItem("foo"));
    const k = await run(B.localStore.key(0));
    await run(B.localStore.removeItem("foo"));
    const l2 = await run(B.localStore.length);
    await run(B.localStore.setItem("foo", "bar"));
    await run(B.localStore.clear);
    const l3 = await run(B.localStore.length);

    assert.deepEqual(l, 1);
    assert.deepEqual(k, some("foo"));
    assert.deepEqual(f, some("bar"));
    assert.deepEqual(l2, 0);
    assert.deepEqual(l3, 0);
  });

  it("session storage", async () => {
    await run(B.sessionStore.setItem("foo", "bar"));
    const l = await run(B.sessionStore.length);
    const f = await run(B.sessionStore.getItem("foo"));
    const k = await run(B.sessionStore.key(0));
    await run(B.sessionStore.removeItem("foo"));
    const l2 = await run(B.sessionStore.length);
    await run(B.sessionStore.setItem("foo", "bar"));
    await run(B.sessionStore.clear);
    const l3 = await run(B.sessionStore.length);

    assert.deepEqual(l, 1);
    assert.deepEqual(k, some("foo"));
    assert.deepEqual(l2, 0);
    assert.deepEqual(l3, 0);
    assert.deepEqual(f, some("bar"));
  });
});

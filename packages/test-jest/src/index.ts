import {
  arb,
  assert,
  customRun,
  property,
  propertyM,
  provideGenerator,
  suite,
  testM,
  withEnvFilter,
  withProvider,
  withRetryPolicy,
  withSkip,
  withTimeout,
  withFinalize,
  withHook,
  withInit,
  implementMock,
  withHookP,
  withTodo
} from "@matechs/test";

export const run = customRun({
  describe,
  it: {
    run: it,
    skip: it.skip,
    todo: it.todo
  }
});

export {
  arb,
  assert,
  customRun,
  property,
  propertyM,
  provideGenerator,
  suite,
  testM,
  withEnvFilter,
  withProvider,
  withRetryPolicy,
  withSkip,
  withTimeout,
  withFinalize,
  withHook,
  withInit,
  implementMock,
  withHookP,
  withTodo
};

export { mockedTestM } from "./aspects/withJestMocks";

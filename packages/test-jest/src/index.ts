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
  withTimeout
} from "@matechs/test";

export const run = customRun({
  describe,
  it: {
    run: it,
    skip: it.skip
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
  withTimeout
};

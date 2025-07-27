# DST Testing Suite

Tools for testing Daylight Saving Time (DST) handling in the Effect library's DateTime implementation.

## Files

### `builder.js`
Generates DST test data using the Temporal API by:

- Defining DST transition dates from various timezones (2014-2025)
- Creating test cases around DST boundaries with different disambiguation strategies
- Validating that transitions match expected offset changes using Temporal
- Outputting test data to `dst-test-cases.csv`

Covers major timezones from North America, Europe, Australia, and other regions, including some edge cases like 30-minute offsets and historical DST changes.

### `runner.js`
Runs tests against the generated data by:

- Reading test cases from the CSV file
- Testing Effect's DateTime implementation
- Comparing results with expected UTC conversions
- Reporting progress and any failures found

## Purpose

DST handling can be tricky in datetime libraries. This test suite helps verify that:

- Times that occur twice during "fall back" are handled as expected
- Times that are skipped during "spring forward" work correctly
- Timezone offset calculations are accurate during transitions
- Different disambiguation strategies behave properly

## Usage

```bash
# Generate test data
npx tsx builder.js

# Run tests
npx tsx runner.js
```

The builder creates `dst-test-cases.csv` with test data, and the runner validates the DateTime implementation against it.

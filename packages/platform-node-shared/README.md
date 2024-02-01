# Effect

Welcome to Effect, a powerful TypeScript framework that provides a fully-fledged functional effect system with a rich standard library.

# Requirements

- TypeScript 5.0 or newer
- The `strict` flag enabled in your `tsconfig.json` file

```
{
  // ...
  "compilerOptions": {
    // ...
    "strict": true,
  }
}
```

## Documentation

For detailed information and usage examples, please visit the [Effect website](https://www.effect.website/).

## Introduction to Effect

To get started with Effect, watch our introductory video on YouTube. This video provides an overview of Effect and its key features, making it a great starting point for newcomers:

[![Introduction to Effect](https://img.youtube.com/vi/SloZE4i4Zfk/maxresdefault.jpg)](https://youtu.be/SloZE4i4Zfk)

## Connect with Our Community

Join our vibrant community on Discord to interact with fellow developers, ask questions, and share your experiences. Here's the invite link to our Discord server: [Join Effect's Discord Community](https://discord.gg/hdt7t7jpvn).

## API Reference

For detailed information on the Effect API, please refer to our [API Reference](https://effect-ts.github.io/effect/).

## Pull Requests

We welcome contributions via pull requests! Here are some guidelines to help you get started:

1. Fork the repository and clone it to your local machine.
2. Create a new branch for your changes: `git checkout -b my-new-feature`.
3. Ensure you have the required dependencies installed by running: `pnpm install` (assuming pnpm version `8.x`).
4. Make your desired changes and, if applicable, include tests to validate your modifications.
5. Run the following commands to ensure the integrity of your changes:
   - `pnpm check`: Verify that the code compiles.
   - `pnpm test`: Execute the tests.
   - `pnpm circular`: Confirm there are no circular imports.
   - `pnpm lint`: Check for code style adherence (if you happen to encounter any errors during this process, you can use `pnpm lint-fix` to automatically fix some of these style issues).
   - `pnpm dtslint`: Run type-level tests.
   - `pnpm docgen`: Update the automatically generated documentation.
6. Create a changeset for your changes: before committing your changes, create a changeset to document the modifications. This helps in tracking and communicating the changes effectively. To create a changeset, run the following command: `pnpm changeset`. Always choose the `patch` option when prompted (please note that we are currently in pre-release mode).
7. Commit your changes: after creating the changeset, commit your changes with a descriptive commit message: `git commit -am 'Add some feature'`.
8. Push your changes to your fork: `git push origin my-new-feature`.
9. Open a pull request against our `main` branch.

### Pull Request Guidelines

- Please make sure your changes are consistent with the project's existing style and conventions.
- Please write clear commit messages and include a summary of your changes in the pull request description.
- Please make sure all tests pass and add new tests as necessary.
- If your change requires documentation, please update the relevant documentation.
- Please be patient! We will do our best to review your pull request as soon as possible.

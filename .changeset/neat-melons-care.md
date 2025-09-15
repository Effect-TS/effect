---
"@effect/ai-amazon-bedrock": minor
"@effect/ai-anthropic": minor
"@effect/ai-google": minor
"@effect/ai-openai": minor
"@effect/ai": minor
---

Refactor the Effect AI SDK and associated provider packages

This pull request contains a complete refactor of the base Effect AI SDK package
as well as the associated provider integration packages to improve flexibility
and enhance ergonomics. Major changes are outlined below.

## Module Names

All modules in the base Effect AI SDK have had the leading `Ai` prefix dropped
from their name (except for the `AiError` module).

For example, the `AiLanguageModel` module is now the `LanguageModel` module.

In addition, the `AiInput` module has been renamed to the `Prompt` module.

## Prompts

The `Prompt` module has been completely redesigned with flexibility in mind.

The `Prompt` module's primary `make` constructor, which is used by the methods on
`LanguageModel`, now supports defining a prompt as an array of content parts, 
which should be familiar to those coming from other AI SDKs. 

In addition, the `system` option has been removed from all `LanguageModel` methods
and must now be provided as part of the prompt.

## Responses

The `Response` module has also been completely redesigned to support a wider 
variety of response parts, particularly when streaming.

The methods of `LanguageModel` no longer return different response types based
upon whether or not a `Toolkit` was included in the request. Instead, the type
of tool call parameters and tool call results is directly encoded into the 
response parts.

In addition, when streaming text via the `LanguageModel.streamText` method, you
now receive a stream of content parts instead of a stream of responses.

## Tool Calls

The `Tool` module has been enhanced to support provider-defined tools (e.g.
web search, computer use, etc.).

Large language model providers which support their own tools now have a separate
module present in their provider integration packages which contain definitions
for their tools.

For example, the new `AnthropicTool` module in the `@effect/ai-anthropic` provider
integration package contains provider-defined tool definitions for web search,
computer use, code execution, and more.

These provider-defined tools can be included alongside user-defined tools in 
existing `Toolkit`s. Provider-defined tools that require a user-space handler
will be raise a type error in the associated `Toolkit` layer if no such handler
is defined.

## Provider Options / Provider Metadata

To support provider-specific inputs and outputs when interacting with large 
language model providers, support has been added for adding provider-specific
options to the parts of a `Prompt`, as well as receiving provider-specific 
metadata from the parts of a `Response`.

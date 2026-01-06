# Change: Add pack-only mode support

## Why

Currently, the GitHub Action only supports the complete `push` workflow, which packages and immediately publishes NuGet packages to the server. In certain scenarios, users only need to verify that a mod can be correctly packaged without publishing to NuGet servers, such as:

- **CI/CD validation** - Verify the package can build before merging a PR
- **Local testing** - Validate metadata and file structure compliance
- **Pre-publish checks** - Avoid publishing failures due to configuration errors

Forcing the `push` operation causes:
- Unnecessary NuGet server requests
- Invalid package publications in test environments
- API key usage in non-essential scenarios

## What Changes

- **ADDED** input parameter: `push` (boolean, default `true`)
  - `true` - Execute full workflow (pack + push), maintaining current default behavior
  - `false` - Only execute pack operation, stop after generating `.nupkg` file

- **MODIFIED** workflow behavior:
  - When `push=false`, after pack step completes:
    - Set output parameter `package_path` to point to generated `.nupkg` file
    - Skip NuGet push step
    - Log that package was generated but not published

- **Backward compatibility**: Default behavior unchanged, existing workflows require no modification

## Impact

- Affected specs: `mod-packaging` - adds optional push behavior
- Affected code:
  - `action.yml` - add `push` input parameter
  - `src/index.ts` - conditional push execution based on new input

# Change: Support publishing mod packages to NuGet

**Status:** ExecutionCompleted

## Why

Currently there is no automated workflow to package game mods as NuGet packages and publish them to NuGet servers. Mod authors must manually:
1. Create `.nuspec` files based on `info.ini` metadata
2. Run NuGet packaging tools
3. Manually upload packages to NuGet servers

This proposal implements a GitHub Action that automates the entire workflow following the NuGet Mod Packaging Specification v1.0.

## What Changes

- **Add GitHub Action** for automated mod packaging and NuGet publishing
- **Input parameters**:
  - `mod_folder_path` - Path to the mod folder to package
  - `nuget_server` - Target NuGet server URL (default: nuget.org)
  - `nuget_api_key` - API key for NuGet server authentication
- **Core functionality**:
  - Parse `info.ini` for mod metadata
  - Auto-generate `.nuspec` following the specification
  - Package mod files into `.nupkg` using wildcards
  - Validate `name` matches DLL filename
  - Validate `version` is SemVer 2.0 compliant
  - Publish to specified NuGet server

## Impact

- **Affected specs**: New capability `mod-packaging`
- **Affected code**: New GitHub Action workflow files and TypeScript implementation
- **Dependencies**: NuGet Mod Packaging Specification v1.0 (external reference)
- **Users**: Mod authors can publish mods with a single GitHub Action step

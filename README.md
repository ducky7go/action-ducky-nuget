# Ducky NuGet Mod Publisher

GitHub Action for packaging and publishing game mods to NuGet servers following the [NuGet Mod Packaging Specification v1.0](https://github.com/ducky7go/dukcy-package-spec).

## Features

- **Automated Packaging**: Parses `info.ini` metadata and generates valid `.nuspec` files
- **Wildcard File Inclusion**: Automatically includes all mod files without manual configuration
- **Validation**: Ensures `name` matches DLL filename and `version` is SemVer 2.0 compliant
- **Multi-Server Support**: Publish to nuget.org or custom NuGet servers
- **Icon Handling**: Automatically copies `preview.png` to `icon.png` for NuGet gallery
- **Trusted Publisher Support**: Use OIDC/Trusted Publisher or API key for authentication

## Usage

### Pack-Only Mode (CI/CD Validation)

Generate `.nupkg` file without publishing to NuGet server - useful for CI validation:

```yaml
jobs:
  validate-package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Mono
        run: |
          sudo apt-get update
          sudo apt-get install -y mono-complete

      - name: Pack Mod (no push)
        uses: ducky7go/action-ducky-nuget@v1
        with:
          mod_folder_path: './mods/MyMod'
          push: false
```

### Complete Example (Recommended)

Full workflow with all required dependencies:

```yaml
name: Publish Mod to NuGet

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production  # Optional: for environment protection rules
    permissions:
      contents: read
      id-token: write  # Required for OIDC
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Mono (for nuget.exe)
        run: |
          sudo apt-get update
          sudo apt-get install -y mono-complete

      - name: NuGet login (OIDC → temp API key)
        uses: NuGet/login@v1
        id: login
        with:
          user: ${{ secrets.NUGET_USER }}  # Your nuget.org username (not email)

      - name: Publish Mod to NuGet
        uses: ducky7go/action-ducky-nuget@v1
        with:
          mod_folder_path: './mods/MyMod'
          nuget_api_key: ${{ steps.login.outputs.NUGET_API_KEY }}
```

### Minimal Example (without OIDC)

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Mono
        run: |
          sudo apt-get update
          sudo apt-get install -y mono-complete

      - name: Publish Mod to NuGet
        uses: ducky7go/action-ducky-nuget@v1
        with:
          mod_folder_path: './mods/MyMod'
          nuget_api_key: ${{ secrets.NUGET_API_KEY }}
```

### Custom NuGet Server

```yaml
- name: Publish to Custom NuGet Server
  uses: ducky7go/action-ducky-nuget@v1
  with:
    mod_folder_path: './mods/MyMod'
    nuget_server: 'https://my-nuget-server.com/v3/index.json'
    nuget_api_key: ${{ secrets.CUSTOM_NUGET_API_KEY }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `mod_folder_path` | Yes | - | Path to the mod folder containing `info.ini` and mod files |
| `nuget_server` | No | `https://api.nuget.org/v3/index.json` | NuGet server URL |
| `nuget_api_key` | No | - | API key for authentication (omit to use Trusted Publisher) |
| `push` | No | `true` | Whether to push the package to NuGet server after packing (set to `false` for pack-only mode) |

## Outputs

| Output | Description |
|--------|-------------|
| `success` | `"true"` if packaging and publishing succeeded, `"false"` otherwise |
| `package_path` | Path to the generated `.nupkg` file |
| `version` | Package version that was published |
| `error` | Error message if the action failed |

## Mod Folder Structure

Your mod folder must follow this structure:

```
MyMod/
├── info.ini           # Required: Mod metadata
├── MyMod.dll          # Required: Main mod assembly (filename must match 'name' field)
└── preview.png        # Optional: Mod icon
```

### info.ini Format

```ini
name = MyMod
displayName = My Awesome Mod
description = This mod does amazing things
version = 1.0.0
authors = Your Name
tags = gameplay,ui,utility
license = MIT
homepage = https://github.com/yourname/mymod
```

**Required Fields:**
- `name`: Unique identifier (must match DLL filename)
- `displayName`: Human-readable name
- `description`: Short description

**Optional Fields:**
- `version`: SemVer 2.0 version (defaults to `1.0.0`)
- `authors`: Mod author(s)
- `tags`: Comma-separated search tags
- `license`: SPDX license identifier
- `homepage`: Project URL

## Validation Rules

1. **DLL Name Match**: The `name` field must match the DLL filename (without `.dll` extension)
2. **SemVer Version**: If `version` is specified, it must be valid SemVer 2.0 (e.g., `1.0.0`, `2.3.4-beta`)
3. **NuGet ID**: The `name` must be a valid NuGet ID (starts with letter/underscore, contains only alphanumeric, `.`, `_`, `-`)

## Error Handling

The action will fail with clear error messages for:

- Missing `info.ini` file
- Missing required fields in `info.ini`
- DLL filename mismatch
- Invalid SemVer version format
- Packaging or publishing failures

## Example Workflow with Version Tagging

```yaml
name: Publish Mod

on:
  push:
    tags:
      - 'mod-*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/mod-}" >> $GITHUB_OUTPUT

      - name: Update info.ini with tag version
        run: |
          # Update version in info.ini if needed
          sed -i "s/^version = .*/version = ${{ steps.version.outputs.version }}/" mods/MyMod/info.ini

      - name: Publish to NuGet
        uses: ducky7go/action-ducky-nuget@v1
        with:
          mod_folder_path: './mods/MyMod'
          nuget_api_key: ${{ secrets.NUGET_API_KEY }}
```

## Requirements

- GitHub Actions runner (ubuntu-latest, windows-latest, or macos-latest)
- **Mono** (Linux/macOS only): Add mono installation step (required for `nuget.exe`)
- **NuGet authentication**:
  - Option A: Use `NuGet/login@v1` action with OIDC (recommended)
  - Option B: Store NuGet API key in GitHub Secrets

---

## Development

### Setup

```bash
npm install
npm run build    # Compile TypeScript to dist/
npm run package  # Bundle with ncc into single file (required before commit)
```

**Important**: You must run `npm run package` after making code changes, as GitHub Actions runtime will not install node_modules.

### Testing Locally

```yaml
# .github/workflows/test.yml
name: Test Action

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Use local action (current repository)
      - uses: ./
        with:
          mod_folder_path: './test-mods/ExampleMod'
          nuget_api_key: ${{ secrets.NUGET_API_KEY }}
```

## Implementation

This action is a thin wrapper around [`@ducky7go/ducky-cli`](https://github.com/ducky7go/ducky-cli), which handles all NuGet packaging logic. The action:
- Accepts GitHub Action inputs and translates them to CLI arguments
- Executes `ducky nuget push` with the `--pack` flag
- Preserves all existing input/output interfaces for backward compatibility

## License

MIT

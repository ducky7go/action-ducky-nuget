# mod-packaging Specification

## Purpose
TBD - created by archiving change nuget-mod-publishing-action. Update Purpose after archive.
## Requirements
### Requirement: info.ini Metadata Parsing

The system SHALL read and parse metadata from the mod's `info.ini` file located at the specified mod folder path.

#### Scenario: Successful info.ini parsing

- **WHEN** a valid `info.ini` file exists at the specified mod folder path
- **THEN** the system MUST read all required fields (name, displayName, description)
- **AND** the system MUST read all optional fields if present (version, tags, authors, license, homepage, publishedFileId)
- **AND** the system MUST support the flat INI structure without sections

#### Scenario: Missing required field

- **WHEN** a required field (name, displayName, or description) is missing from `info.ini`
- **THEN** the system MUST report an error specifying which field is missing
- **AND** the action MUST fail with a non-zero exit code

#### Scenario: Empty info.ini file

- **WHEN** the `info.ini` file exists but is empty
- **THEN** the system MUST report an error indicating no metadata was found
- **AND** the action MUST fail with a non-zero exit code

### Requirement: DLL Filename Validation

The system SHALL validate that the `name` field in `info.ini` matches the DLL filename (without extension) in the mod folder.

#### Scenario: Valid DLL name match

- **WHEN** the `name` field equals the DLL filename without `.dll` extension
- **THEN** validation MUST pass
- **EXAMPLE**: `name = DisplayItemValue` with `DisplayItemValue.dll` is valid

#### Scenario: DLL name mismatch

- **WHEN** the `name` field does not match any DLL filename in the mod folder
- **THEN** the system MUST report an error listing the expected DLL filename
- **AND** the action MUST fail with a non-zero exit code
- **EXAMPLE**: `name = DisplayItemValue` with `OtherMod.dll` is invalid

#### Scenario: No DLL found

- **WHEN** no `.dll` file exists in the mod folder
- **THEN** the system MUST report an error indicating no DLL was found
- **AND** the action MUST fail with a non-zero exit code

### Requirement: SemVer Version Validation

The system SHALL validate that the `version` field (if present) conforms to Semantic Versioning 2.0.0 format.

#### Scenario: Valid SemVer version

- **WHEN** the version field contains a valid SemVer 2.0.0 string
- **THEN** validation MUST pass
- **EXAMPLES**: `1.0.0`, `2.3.4-beta`, `1.0.0-rc.1+build.123` are valid

#### Scenario: Invalid SemVer version

- **WHEN** the version field does not conform to SemVer 2.0.0
- **THEN** the system MUST report an error explaining the valid format
- **AND** the action MUST fail with a non-zero exit code
- **EXAMPLES**: `1.0`, `v1.0.0`, `1.0.0.0` are invalid

#### Scenario: Missing version

- **WHEN** the version field is not present in `info.ini`
- **THEN** the system MUST default to `1.0.0` for the package version

### Requirement: .nuspec File Generation

The system SHALL generate a valid `.nuspec` file following the NuGet Mod Packaging Specification v1.0.

#### Scenario: Generate .nuspec with all fields

- **WHEN** all required and optional fields are present in `info.ini`
- **THEN** the system MUST generate a `.nuspec` file with proper XML structure
- **AND** map `name` → `<id>`, `displayName` → `<title>`, `description` → `<description>`
- **AND** include optional fields: `<version>`, `<authors>`, `<tags>`, `<license>`, `<projectUrl>`
- **AND** include `<icon>icon.png</icon>` if `preview.png` exists

#### Scenario: Generate .nuspec with minimal fields

- **WHEN** only required fields are present in `info.ini`
- **THEN** the system MUST generate a valid `.nuspec` with only required elements
- **AND** default `authors` to "Unknown" if not specified
- **AND** default `version` to "1.0.0" if not specified

#### Scenario: Tags delimiter conversion

- **WHEN** tags are specified as comma-separated values in `info.ini`
- **THEN** the generated `.nuspec` MUST convert commas to spaces
- **EXAMPLE**: `tags = mod,ui,utility` becomes `<tags>mod ui utility</tags>`

### Requirement: Wildcard File Packaging

The system SHALL configure the `.nuspec` files section to include all mod files using wildcard patterns.

#### Scenario: Include all files with wildcard

- **WHEN** generating the .nuspec files section
- **THEN** the system MUST include `<file src="**" target="content\" exclude="preview.png" />`
- **AND** this pattern MUST automatically include all files and subdirectories

#### Scenario: Icon handling

- **WHEN** a `preview.png` file exists in the mod folder
- **THEN** the system MUST include `<file src="preview.png" target="icon.png" />`
- **AND** the `preview.png` MUST still be included in `content/` via wildcard

#### Scenario: No preview.png

- **WHEN** no `preview.png` file exists in the mod folder
- **THEN** the system MUST NOT include an icon file reference
- **AND** the `<icon>` element MUST be omitted from metadata

### Requirement: NuGet Package Creation

The system SHALL create a `.nupkg` file using the NuGet CLI tool with the generated `.nuspec` file.

#### Scenario: Successful package creation

- **WHEN** the .nuspec file is valid and all referenced files exist
- **THEN** the system MUST execute `nuget pack [mod-name].nuspec`
- **AND** a `.nupkg` file MUST be created in the working directory
- **AND** the action MUST output the package file path

#### Scenario: Packaging failure

- **WHEN** NuGet pack command fails
- **THEN** the system MUST capture and display the error output
- **AND** the action MUST fail with a non-zero exit code

### Requirement: NuGet Server Publishing

The system SHALL publish the created `.nupkg` file to the specified NuGet server using the provided API key.

#### Scenario: Publish to nuget.org (default)

- **WHEN** no custom NuGet server is specified
- **THEN** the system MUST publish to `https://api.nuget.org/v3/index.json`
- **AND** the system MUST use the provided `nuget_api_key` for authentication

#### Scenario: Publish to custom NuGet server

- **WHEN** a custom `nuget_server` URL is specified
- **THEN** the system MUST publish to the specified server URL
- **AND** the system MUST use the provided `nuget_api_key` for authentication

#### Scenario: Publish with API key

- **WHEN** publishing to any NuGet server
- **THEN** the system MUST execute `nuget push [package].nupkg -Source [server] -ApiKey [key]`
- **AND** the API key MUST NOT be logged in the action output

#### Scenario: Publish failure

- **WHEN** the NuGet push command fails
- **THEN** the system MUST display the error message from the server
- **AND** the action MUST fail with a non-zero exit code
- **AND** common errors MUST include: authentication failure, version conflict, server unavailable

### Requirement: GitHub Action Input Parameters

The system SHALL accept input parameters via GitHub Actions interface.

#### Scenario: Required mod_folder_path

- **WHEN** the action is invoked
- **THEN** the `mod_folder_path` input MUST be required
- **AND** the path MUST be relative to the repository root or absolute

#### Scenario: Optional nuget_server

- **WHEN** the `nuget_server` input is not provided
- **THEN** the system MUST default to `https://api.nuget.org/v3/index.json`

#### Scenario: Required nuget_api_key

- **WHEN** the action is invoked
- **THEN** the `nuget_api_key` input MUST be required
- **AND** the key SHOULD be passed via GitHub Secrets

### Requirement: GitHub Action Outputs

The system SHALL provide outputs via GitHub Actions interface for workflow consumption.

#### Scenario: Success output

- **WHEN** packaging and publishing complete successfully
- **THEN** the action MUST output `success: true`
- **AND** the action MUST output `package_path` with the .nupkg file location
- **AND** the action MUST output `version` with the package version

#### Scenario: Failure output

- **WHEN** any step fails
- **THEN** the action MUST output `success: false`
- **AND** the action MUST output `error` with the failure reason

### Requirement: Folder Structure Preservation

The system SHALL preserve the original mod folder structure in the NuGet package's `content/` directory.

#### Scenario: Preserve all files and folders

- **WHEN** packaging the mod folder
- **THEN** all files and subdirectories MUST be included in `content/` at the same relative paths
- **AND** the original `info.ini` MUST be present at `content/info.ini`
- **AND** all additional folders (description/, Locales/, Resources/, etc.) MUST be preserved

#### Scenario: Empty directory handling

- **WHEN** the mod folder contains empty subdirectories
- **THEN** these empty directories SHOULD be preserved in the package


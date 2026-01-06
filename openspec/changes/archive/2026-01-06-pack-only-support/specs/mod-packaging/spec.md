# mod-packaging Specification Delta

## ADDED Requirements

### Requirement: Optional Push Behavior

The system SHALL allow users to optionally skip the NuGet push operation, executing only the pack step when the `push` input parameter is set to `false`.

#### Scenario: Pack-only mode (no push)

- **WHEN** the `push` input parameter is set to `false`
- **THEN** the system MUST execute all steps up to and including package creation
- **AND** the system MUST skip the NuGet push step
- **AND** the system MUST output `package_path` with the generated `.nupkg` file location
- **AND** the system MUST log a message indicating the package was generated but not published
- **AND** the action MUST complete successfully without attempting to contact the NuGet server

#### Scenario: Default behavior with push enabled

- **WHEN** the `push` input parameter is omitted or set to `true`
- **THEN** the system MUST execute the full workflow including pack and push
- **AND** backward compatibility MUST be maintained for existing workflows

## MODIFIED Requirements

### Requirement: GitHub Action Input Parameters

The system SHALL accept input parameters via GitHub Actions interface.

#### Scenario: Optional push parameter

- **WHEN** the action is invoked
- **THEN** the `push` input MUST be optional with a default value of `true`
- **AND** when `push=true`, the system MUST execute both pack and push operations
- **AND** when `push=false`, the system MUST execute only the pack operation

### Requirement: GitHub Action Outputs

The system SHALL provide outputs via GitHub Actions interface for workflow consumption.

#### Scenario: Pack-only success output

- **WHEN** `push=false` and packaging completes successfully
- **THEN** the action MUST output `success: true`
- **AND** the action MUST output `package_path` with the .nupkg file location
- **AND** the action MUST output `version` with the package version
- **AND** the push operation MUST NOT be executed

#### Scenario: Success output

- **WHEN** `push=true` and packaging and publishing complete successfully
- **THEN** the action MUST output `success: true`
- **AND** the action MUST output `package_path` with the .nupkg file location
- **AND** the action MUST output `version` with the package version

#### Scenario: Failure output

- **WHEN** any step fails (pack or push)
- **THEN** the action MUST output `success: false`
- **AND** the action MUST output `error` with the failure reason

### Requirement: NuGet Server Publishing

The system SHALL publish the created `.nupkg` file to the specified NuGet server using the provided API key, but only when the `push` parameter is `true`.

#### Scenario: Conditional publishing

- **WHEN** `push=true`
- **THEN** the system MUST publish to the specified NuGet server URL
- **AND** the system MUST use the provided `nuget_api_key` for authentication

#### Scenario: Skip publishing when disabled

- **WHEN** `push=false`
- **THEN** the system MUST skip the publish step entirely
- **AND** the system MUST NOT attempt to contact the NuGet server
- **AND** the `nuget_api_key` parameter MAY be omitted

#### Scenario: Publish to nuget.org (default)

- **WHEN** no custom NuGet server is specified and `push=true`
- **THEN** the system MUST publish to `https://api.nuget.org/v3/index.json`
- **AND** the system MUST use the provided `nuget_api_key` for authentication

#### Scenario: Publish to custom NuGet server

- **WHEN** a custom `nuget_server` URL is specified and `push=true`
- **THEN** the system MUST publish to the specified server URL
- **AND** the system MUST use the provided `nuget_api_key` for authentication

#### Scenario: Publish with API key

- **WHEN** publishing to any NuGet server and `push=true`
- **THEN** the system MUST invoke ducky-cli with appropriate server and API key parameters
- **AND** the API key MUST NOT be logged in the action output

#### Scenario: Publish failure

- **WHEN** the push command fails and `push=true`
- **THEN** the system MUST display the error message from the server
- **AND** the action MUST fail with a non-zero exit code
- **AND** common errors MUST include: authentication failure, version conflict, server unavailable

import { readdir } from 'fs/promises';
import { ModMetadata } from './parser.js';

/**
 * Result of validation
 */
export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Validates a SemVer 2.0.0 version string
 * Pattern: major.minor.patch[-prerelease][+build]
 */
export function isValidSemVer(version: string): boolean {
  // SemVer 2.0 regex pattern
  const semverRegex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  return semverRegex.test(version);
}

/**
 * Validates a NuGet ID (must start with letter, contain only alphanumeric, ., _, -)
 */
export function isValidNuGetId(id: string): boolean {
  // NuGet ID validation: must start with letter or underscore, contain only alphanumeric, ., _, -
  const nugetIdRegex = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;
  return nugetIdRegex.test(id);
}

/**
 * Validates that the name field matches the DLL filename
 */
export async function validateDllName(modFolderPath: string, name: string): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    const files = await readdir(modFolderPath);
    const dllFiles = files.filter(f => f.toLowerCase().endsWith('.dll'));

    if (dllFiles.length === 0) {
      errors.push(`No DLL file found in mod folder: ${modFolderPath}`);
      return { success: false, errors };
    }

    const expectedDll = `${name}.dll`;
    const hasMatchingDll = dllFiles.some(dll => {
      const dllNameWithoutExt = dll.replace(/\.dll$/i, '');
      return dllNameWithoutExt === name;
    });

    if (!hasMatchingDll) {
      errors.push(
        `The 'name' field (${name}) does not match any DLL filename. ` +
        `Expected: ${expectedDll}. Found: ${dllFiles.join(', ')}`
      );
    }
  } catch (error) {
    errors.push(`Failed to read mod folder: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates the mod metadata
 */
export async function validateMetadata(metadata: ModMetadata, modFolderPath: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // Validate NuGet ID format
  if (!isValidNuGetId(metadata.name)) {
    errors.push(
      `The 'name' field (${metadata.name}) is not a valid NuGet ID. ` +
      `Must start with a letter or underscore and contain only alphanumeric characters, dots, underscores, and hyphens.`
    );
  }

  // Validate version format if provided
  if (metadata.version && !isValidSemVer(metadata.version)) {
    errors.push(
      `The 'version' field (${metadata.version}) is not valid SemVer 2.0.0. ` +
      `Expected format: major.minor.patch (e.g., 1.0.0, 2.3.4-beta, 1.0.0-rc.1+build.123)`
    );
  }

  // Validate DLL name matches
  const dllValidation = await validateDllName(modFolderPath, metadata.name);
  errors.push(...dllValidation.errors);

  return {
    success: errors.length === 0,
    errors
  };
}

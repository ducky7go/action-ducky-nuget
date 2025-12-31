import * as core from '@actions/core';
import { resolve } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { readInfoIni } from './parser.js';
import { validateMetadata } from './validation.js';
import { generateNuspec, hasPreviewImage } from './nuspec.js';
import { checkDotnet, packNupkg, pushNupkg } from './nuget.js';

async function run(): Promise<void> {
  try {
    // Get inputs
    const modFolderPathInput = core.getInput('mod_folder_path', { required: true });
    const nugetServer = core.getInput('nuget_server') || 'https://api.nuget.org/v3/index.json';
    const nugetApiKey = core.getInput('nuget_api_key'); // Optional - if empty, uses Trusted Publisher

    // Resolve mod folder path (relative to GITHUB_WORKSPACE if not absolute)
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const modFolderPath = resolve(workspace, modFolderPathInput);

    core.info(`Mod folder path: ${modFolderPath}`);
    core.info(`NuGet server: ${nugetServer}`);
    if (nugetApiKey) {
      core.info(`Authentication: API key provided`);
    } else {
      core.info(`Authentication: Trusted Publisher/OIDC (no API key)`);
    }

    // Verify mod folder exists
    if (!existsSync(modFolderPath)) {
      core.setFailed(`Mod folder not found: ${modFolderPath}`);
      core.setOutput('error', `Mod folder not found: ${modFolderPath}`);
      core.setOutput('success', 'false');
      return;
    }

    // Step 1: Parse info.ini
    core.info('Step 1: Parsing info.ini...');
    const infoIniPath = resolve(modFolderPath, 'info.ini');
    const parseResult = await readInfoIni(infoIniPath);

    if (!parseResult.success || !parseResult.metadata) {
      const errorMsg = `Failed to parse info.ini: ${parseResult.error}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }

    const metadata = parseResult.metadata;
    core.info(`  - name: ${metadata.name}`);
    core.info(`  - displayName: ${metadata.displayName}`);
    core.info(`  - version: ${metadata.version || '1.0.0 (default)'}`);

    // Step 2: Validate metadata
    core.info('Step 2: Validating metadata...');
    const validationResult = await validateMetadata(metadata, modFolderPath);

    if (!validationResult.success) {
      const errorMsg = `Validation failed:\n${validationResult.errors.map(e => `  - ${e}`).join('\n')}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }
    core.info('  - Validation passed');

    // Step 3: Check dotnet availability
    core.info('Step 3: Checking .NET SDK...');
    await checkDotnet();

    // Step 4: Generate .nuspec file
    core.info('Step 4: Generating .nuspec file...');
    const hasPreview = await hasPreviewImage(modFolderPath);
    const nuspecContent = generateNuspec(metadata, hasPreview);
    core.info(`  - Has preview.png: ${hasPreview}`);

    // Create temp directory for packaging
    const tempDir = resolve(workspace, '.nuget-temp');
    await mkdir(tempDir, { recursive: true });

    const nuspecPath = resolve(tempDir, `${metadata.name}.nuspec`);
    await writeFile(nuspecPath, nuspecContent, 'utf-8');
    core.info(`  - .nuspec created at: ${nuspecPath}`);

    // Step 5: Copy mod files to temp directory
    core.info('Step 5: Copying mod files for packaging...');
    const { cp } = await import('@actions/io');
    await cp(modFolderPath, resolve(tempDir, 'mod-copy'), { recursive: true });
    const modCopyPath = resolve(tempDir, 'mod-copy');
    core.info(`  - Files copied to: ${modCopyPath}`);

    // Copy .nuspec to the mod copy directory
    const { copyFile } = await import('fs/promises');
    await copyFile(nuspecPath, resolve(modCopyPath, `${metadata.name}.nuspec`));

    // Step 6: Pack .nupkg
    core.info('Step 6: Creating NuGet package...');
    const packResult = await packNupkg(`${metadata.name}.nuspec`, modCopyPath);

    if (!packResult.success || !packResult.packagePath) {
      const errorMsg = `Packaging failed: ${packResult.error}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }

    core.info(`  - Package created: ${packResult.packagePath}`);

    // Step 7: Push to NuGet server
    core.info('Step 7: Publishing to NuGet server...');
    const pushResult = await pushNupkg(
      packResult.packagePath,
      nugetServer,
      nugetApiKey,
      modCopyPath
    );

    if (!pushResult.success) {
      const errorMsg = `Publishing failed: ${pushResult.error}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }

    core.info('  - Package published successfully!');

    // Set outputs
    core.setOutput('success', 'true');
    core.setOutput('package_path', packResult.packagePath);
    core.setOutput('version', metadata.version || '1.0.0');

    core.info('========================================');
    core.info('Action completed successfully!');
    core.info(`Package: ${packResult.packagePath}`);
    core.info(`Version: ${metadata.version || '1.0.0'}`);
    core.info('========================================');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMsg);
    core.setOutput('error', errorMsg);
    core.setOutput('success', 'false');
  }
}

run();

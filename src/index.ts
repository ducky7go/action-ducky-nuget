import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

/**
 * Main action entry point
 * Refactored to use @ducky7go/ducky-cli as a dependency
 */
async function run(): Promise<void> {
  try {
    // Get inputs
    const modFolderPathInput = core.getInput('mod_folder_path', { required: true });
    const nugetServer = core.getInput('nuget_server') || 'https://api.nuget.org/v3/index.json';
    const nugetApiKey = core.getInput('nuget_api_key'); // Optional - if empty, uses Trusted Publisher
    const pushInput = core.getInput('push') || 'true';
    const shouldPush = pushInput.toLowerCase() === 'true';

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
      const errorMsg = `Mod folder not found: ${modFolderPath}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }

    // Verify info.ini exists
    const infoIniPath = resolve(modFolderPath, 'info.ini');
    if (!existsSync(infoIniPath)) {
      const errorMsg = `info.ini not found at: ${infoIniPath}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }

    // Extract version from info.ini for output
    try {
      const infoIniContent = await readFile(infoIniPath, 'utf-8');
      const versionMatch = infoIniContent.match(/^version\s*=\s*(.+)$/m);
      const version = versionMatch ? versionMatch[1].trim() : '1.0.0';
      core.info(`Version from info.ini: ${version}`);
      core.setOutput('version', version);
    } catch {
      core.setOutput('version', '1.0.0');
    }

    // Build ducky-cli command arguments
    let args: string[];
    let command: string;

    if (shouldPush) {
      // Full workflow: pack + push
      command = 'push';
      args = ['nuget', 'push', modFolderPath, '--pack'];

      if (nugetServer) {
        args.push('--server', nugetServer);
      }

      if (nugetApiKey) {
        args.push('--api-key', nugetApiKey);
      }
    } else {
      // Pack-only workflow
      command = 'pack';
      args = ['nuget', 'pack', modFolderPath];

      core.info('Pack-only mode: package will be generated but not published');
    }

    core.info(`Running: ducky ${args.map(a => a === nugetApiKey ? '***' : a).join(' ')}`);

    // Execute ducky-cli command
    let stdout = '';
    let stderr = '';

    const exitCode = await exec('npx', ['-y', '@ducky7go/ducky-cli', ...args], {
      cwd: workspace,
      listeners: {
        stdout: (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          core.info(text.trim());
        },
        stderr: (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          core.error(text.trim());
        }
      },
      silent: false
    });

    if (exitCode !== 0) {
      const errorMsg = `ducky-cli failed with exit code ${exitCode}: ${stderr || stdout}`;
      core.setFailed(errorMsg);
      core.setOutput('error', errorMsg);
      core.setOutput('success', 'false');
      return;
    }

    // Extract package path from output
    // ducky-cli outputs: "Package created: /path/to/package.nupkg"
    const packageMatch = stdout.match(/Package created:\s*(.+?\.nupkg)/m);
    const packagePath = packageMatch ? packageMatch[1].trim() : '';

    core.info('========================================');
    core.info('Action completed successfully!');
    if (shouldPush) {
      core.info(`Package published to NuGet server: ${nugetServer}`);
    } else {
      core.info('Package generated (not published - push=false)');
    }
    if (packagePath) {
      core.info(`Package: ${packagePath}`);
    }
    core.info('========================================');

    // Set outputs
    core.setOutput('success', 'true');
    if (packagePath) {
      core.setOutput('package_path', packagePath);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMsg);
    core.setOutput('error', errorMsg);
    core.setOutput('success', 'false');
  }
}

run();

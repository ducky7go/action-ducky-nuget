import { exec } from '@actions/exec';
import { homedir, platform } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { chmod } from 'fs/promises';

const NUGET_EXE_URL = 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe';
const NUGET_EXE_PATH = join(homedir(), 'nuget.exe');
const NUGET_WRAPPER_PATH = join(homedir(), 'nuget');

const isWindows = platform() === 'win32';

/**
 * Ensures nuget.exe is available
 */
export async function ensureNugetExe(): Promise<string> {
  const core = await import('@actions/core');

  if (isWindows) {
    // Windows: just use nuget.exe directly
    if (!existsSync(NUGET_EXE_PATH)) {
      core.info(`Downloading nuget.exe for Windows...`);
      await downloadFile(NUGET_EXE_URL, NUGET_EXE_PATH);
    }
    return NUGET_EXE_PATH;
  } else {
    // Unix: check if mono is available first
    try {
      const { execSync } = await import('child_process');
      execSync('mono --version', { stdio: 'ignore' });
      core.info('Mono is available for nuget.exe');
    } catch {
      throw new Error(
        'mono command not found. Please add the following step before this action:\n' +
        '  - name: Install Mono (for nuget.exe)\n' +
        '    run: |\n' +
        '      sudo apt-get update\n' +
        '      sudo apt-get install -y mono-complete'
      );
    }

    // Create mono wrapper for nuget.exe
    if (existsSync(NUGET_WRAPPER_PATH)) {
      return NUGET_WRAPPER_PATH;
    }

    if (!existsSync(NUGET_EXE_PATH)) {
      core.info(`Downloading nuget.exe...`);
      await downloadFile(NUGET_EXE_URL, NUGET_EXE_PATH);
    }

    // Create wrapper script that uses mono
    const { writeFile } = await import('fs/promises');
    const wrapperContent = `#!/bin/bash
mono "${NUGET_EXE_PATH}" "$@"
`;
    await writeFile(NUGET_WRAPPER_PATH, wrapperContent, { mode: 0o755 });
    core.info(`Created NuGet wrapper at: ${NUGET_WRAPPER_PATH}`);
    return NUGET_WRAPPER_PATH;
  }
}

/**
 * Download file from URL to path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const https = await import('https');
  const fs = await import('fs');

  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response: any) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', async () => {
        file.close();
        try {
          await chmod(destPath, 0o755);
        } catch {
          // Ignore permission errors
        }
        resolve();
      });
    }).on('error', (err: Error) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Runs `nuget pack` to create a .nupkg file
 */
export async function packNupkg(
  nuspecFile: string,
  workingDirectory: string
): Promise<{ success: boolean; packagePath?: string; error?: string }> {
  const core = await import('@actions/core');

  try {
    const nuspecName = nuspecFile.split('/').pop() || nuspecFile;

    // Get the nuget command (nuget.exe or mono wrapper)
    const nugetCmd = await ensureNugetExe();
    core.info(`Running: ${nugetCmd} pack ${nuspecName}`);

    let stdout = '';
    let stderr = '';

    const exitCode = await exec(nugetCmd, ['pack', nuspecFile], {
      cwd: workingDirectory,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        }
      },
      silent: false
    });

    if (exitCode !== 0) {
      return {
        success: false,
        error: `NuGet pack failed with exit code ${exitCode}: ${stderr || stdout}`
      };
    }

    // Extract package path from output
    const match = stdout.match(/Successfully created package '(.+?)'/);
    if (match && match[1]) {
      return { success: true, packagePath: match[1] };
    }

    // Fallback: try to find .nupkg file in working directory
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    const files = await readdir(workingDirectory);
    const nupkgFile = files.find(f => f.endsWith('.nupkg'));

    if (nupkgFile) {
      return { success: true, packagePath: join(workingDirectory, nupkgFile) };
    }

    return {
      success: false,
      error: 'Package was created but could not be located'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Runs `nuget push` to publish a .nupkg file
 * @param packagePath Path to the .nupkg file
 * @param server NuGet server URL
 * @param apiKey API key from NuGet/login@v1
 */
export async function pushNupkg(
  packagePath: string,
  server: string,
  apiKey: string | undefined,
  workingDirectory: string
): Promise<{ success: boolean; error?: string }> {
  const core = await import('@actions/core');

  try {
    const packageName = packagePath.split('/').pop() || packagePath;

    // Get the nuget command (nuget.exe or mono wrapper)
    const nugetCmd = await ensureNugetExe();

    // Build command args for nuget push
    const args = [
      'push',
      packagePath,
      '-Source', server
    ];

    if (apiKey && apiKey.trim() !== '') {
      args.push('-ApiKey', apiKey);
      core.setSecret(apiKey);
      core.info(`Running: ${nugetCmd} push ${packageName} -Source ${server} (with API key)`);
    } else {
      core.info(`Running: ${nugetCmd} push ${packageName} -Source ${server}`);
    }

    let stdout = '';
    let stderr = '';

    const exitCode = await exec(nugetCmd, args, {
      cwd: workingDirectory,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        }
      },
      silent: false
    });

    if (exitCode !== 0) {
      return {
        success: false,
        error: `NuGet push failed with exit code ${exitCode}: ${stderr || stdout}`
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

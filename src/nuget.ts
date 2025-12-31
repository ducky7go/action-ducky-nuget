import { exec } from '@actions/exec';
import { mkdirP, cp } from '@actions/io';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { chmod } from 'fs/promises';

const NUGET_URL = 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe';
export const NUGET_PATH = join(homedir(), 'nuget.exe');

/**
 * Downloads and installs the NuGet CLI tool
 */
export async function installNuGet(): Promise<string> {
  if (existsSync(NUGET_PATH)) {
    return NUGET_PATH;
  }

  // Download nuget.exe
  const core = await import('@actions/core');
  core.info(`Downloading NuGet CLI from ${NUGET_URL}`);

  const https = await import('https');
  const fs = await import('fs');

  return new Promise<string>((resolve, reject) => {
    const file = fs.createWriteStream(NUGET_PATH);
    https.get(NUGET_URL, (response: any) => {
      response.pipe(file);
      file.on('finish', async () => {
        file.close();
        // Make executable on Unix-like systems
        try {
          await chmod(NUGET_PATH, 0o755);
        } catch {
          // Ignore permission errors on Windows
        }
        resolve(NUGET_PATH);
      });
    }).on('error', (err: Error) => {
      fs.unlink(NUGET_PATH, () => {});
      reject(err);
    });
  });
}

/**
 * Executes a NuGet command
 */
export async function execNuGet(args: string[], workingDirectory: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  let stdout = '';
  let stderr = '';

  const exitCode = await exec(`"${NUGET_PATH}"`, args, {
    cwd: workingDirectory,
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString();
      },
      stderr: (data: Buffer) => {
        stderr += data.toString();
      }
    },
    silent: false // Allow output to go to action logs
  });

  return { exitCode, stdout, stderr };
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
    core.info(`Running: nuget pack ${nuspecName}`);

    const result = await execNuGet(['pack', nuspecFile], workingDirectory);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `NuGet pack failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
      };
    }

    // Extract package path from output
    const match = result.stdout.match(/Successfully created package '(.+?)'/);
    if (match && match[1]) {
      return { success: true, packagePath: match[1] };
    }

    // Fallback: try to find .nupkg file in working directory
    const { readdir } = await import('fs/promises');
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
 * @param apiKey Optional API key (if not provided, uses Trusted Publisher/OIDC)
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

    // Build command args
    const args = [
      'push',
      packagePath,
      '-Source', server
    ];

    // If API key is provided, use it; otherwise use Trusted Publisher (no -ApiKey)
    if (apiKey && apiKey.trim() !== '') {
      core.info(`Running: nuget push ${packageName} -Source ${server} (with API key)`);
      args.push('-ApiKey', apiKey);
      core.setSecret(apiKey); // Mask API key in logs
    } else {
      core.info(`Running: nuget push ${packageName} -Source ${server} (using Trusted Publisher/OIDC)`);
      // No API key - relies on NuGet Trusted Publisher configuration
    }

    const result = await execNuGet(args, workingDirectory);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `NuGet push failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
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

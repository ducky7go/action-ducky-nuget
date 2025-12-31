import { exec } from '@actions/exec';
import { mkdirP, cp } from '@actions/io';
import { homedir, platform } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { chmod } from 'fs/promises';

const NUGET_EXE_URL = 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe';
const NUGET_LINUX_URL = 'https://dist.nuget.org/linux-x64-commandline/latest/nuget.exe';

// Determine platform-specific paths
const isWindows = platform() === 'win32';
const NUGET_EXE_PATH = join(homedir(), isWindows ? 'nuget.exe' : 'nuget.exe');
// On Linux, we use a wrapper script
const NUGET_WRAPPER_PATH = join(homedir(), 'nuget');

export const NUGET_PATH = isWindows ? NUGET_EXE_PATH : NUGET_WRAPPER_PATH;

/**
 * Downloads and installs the NuGet CLI tool
 */
export async function installNuGet(): Promise<string> {
  const core = await import('@actions/core');

  if (isWindows) {
    // Windows: download nuget.exe directly
    if (existsSync(NUGET_EXE_PATH)) {
      return NUGET_EXE_PATH;
    }

    core.info(`Downloading NuGet CLI for Windows from ${NUGET_EXE_URL}`);
    await downloadFile(NUGET_EXE_URL, NUGET_EXE_PATH);
    return NUGET_EXE_PATH;
  } else {
    // Linux/macOS: use dotnet tool or download with mono wrapper
    if (existsSync(NUGET_WRAPPER_PATH)) {
      return NUGET_WRAPPER_PATH;
    }

    // Check if dotnet is available
    try {
      const { execSync } = await import('child_process');
      execSync('dotnet --version', { stdio: 'ignore' });
      core.info('Using dotnet tool for NuGet operations');
      return 'dotnet'; // Will use 'dotnet nuget' commands
    } catch {
      // dotnet not available - show clear error message
      throw new Error(
        'dotnet command not found. Please add the following step before this action:\n' +
        '  - name: Setup .NET SDK\n' +
        '    uses: actions/setup-dotnet@v4\n' +
        '    with:\n' +
        '      dotnet-version: \'8.x\''
      );
    }
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
        // Make executable on Unix-like systems
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
 * Executes a NuGet command
 */
export async function execNuGet(args: string[], workingDirectory: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  let stdout = '';
  let stderr = '';

  // Check if we should use dotnet nuget
  const useDotnet = process.env.USE_DOTNET_NUGET === 'true' || NUGET_PATH === 'dotnet';

  let command: string;
  let fullArgs: string[];

  if (useDotnet) {
    // Use 'dotnet nuget' command
    command = 'dotnet';
    fullArgs = ['nuget', ...args];
  } else {
    // Use mono wrapper or direct exe
    command = NUGET_PATH;
    fullArgs = args;
  }

  const exitCode = await exec(command, fullArgs, {
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

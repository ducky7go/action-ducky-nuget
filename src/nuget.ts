import { exec } from '@actions/exec';

/**
 * Checks if dotnet is available
 */
export async function checkDotnet(): Promise<void> {
  const core = await import('@actions/core');

  try {
    const { execSync } = await import('child_process');
    const version = execSync('dotnet --version', { encoding: 'utf-8' }).trim();
    core.info(`Using dotnet ${version} for NuGet operations`);
  } catch {
    throw new Error(
      'dotnet command not found. Please add the following step before this action:\n' +
      '  - name: Setup .NET SDK\n' +
      '    uses: actions/setup-dotnet@v4\n' +
      '    with:\n' +
      '      dotnet-version: \'8.x\''
    );
  }
}

/**
 * Executes a dotnet nuget command
 */
export async function execDotnetNuget(args: string[], workingDirectory: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  let stdout = '';
  let stderr = '';

  // Use 'dotnet nuget' for all commands
  const exitCode = await exec('dotnet', ['nuget', ...args], {
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
 * Runs `dotnet nuget pack` to create a .nupkg file
 */
export async function packNupkg(
  nuspecFile: string,
  workingDirectory: string
): Promise<{ success: boolean; packagePath?: string; error?: string }> {
  const core = await import('@actions/core');

  try {
    const nuspecName = nuspecFile.split('/').pop() || nuspecFile;
    core.info(`Running: dotnet nuget pack ${nuspecName}`);

    const result = await execDotnetNuget(['pack', nuspecFile], workingDirectory);

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
 * Runs `dotnet nuget push` to publish a .nupkg file
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
      '--source', server
    ];

    // If API key is provided, use it; otherwise use Trusted Publisher (no --api-key)
    if (apiKey && apiKey.trim() !== '') {
      core.info(`Running: dotnet nuget push ${packageName} --source ${server} (with API key)`);
      args.push('--api-key', apiKey);
      core.setSecret(apiKey); // Mask API key in logs
    } else {
      core.info(`Running: dotnet nuget push ${packageName} --source ${server} (using Trusted Publisher/OIDC)`);
      // No API key - relies on NuGet Trusted Publisher configuration
    }

    const result = await execDotnetNuget(args, workingDirectory);

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

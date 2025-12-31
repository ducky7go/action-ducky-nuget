export declare const NUGET_PATH: string;
/**
 * Downloads and installs the NuGet CLI tool
 */
export declare function installNuGet(): Promise<string>;
/**
 * Executes a NuGet command
 */
export declare function execNuGet(args: string[], workingDirectory: string): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
}>;
/**
 * Runs `nuget pack` to create a .nupkg file
 */
export declare function packNupkg(nuspecFile: string, workingDirectory: string): Promise<{
    success: boolean;
    packagePath?: string;
    error?: string;
}>;
/**
 * Runs `nuget push` to publish a .nupkg file
 * @param packagePath Path to the .nupkg file
 * @param server NuGet server URL
 * @param apiKey Optional API key (if not provided, uses Trusted Publisher/OIDC)
 */
export declare function pushNupkg(packagePath: string, server: string, apiKey: string | undefined, workingDirectory: string): Promise<{
    success: boolean;
    error?: string;
}>;

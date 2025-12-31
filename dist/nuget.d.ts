/**
 * Checks if dotnet is available
 */
export declare function checkDotnet(): Promise<void>;
/**
 * Ensures nuget.exe is available (for pack command on Unix systems)
 */
export declare function ensureNugetExe(): Promise<string>;
/**
 * Runs `nuget pack` to create a .nupkg file
 * Uses nuget.exe with mono on Unix, directly on Windows
 */
export declare function packNupkg(nuspecFile: string, workingDirectory: string): Promise<{
    success: boolean;
    packagePath?: string;
    error?: string;
}>;
/**
 * Runs `dotnet nuget push` to publish a .nupkg file
 * @param packagePath Path to the .nupkg file
 * @param server NuGet server URL
 * @param apiKey Optional API key (if not provided, uses Trusted Publisher/OIDC)
 */
export declare function pushNupkg(packagePath: string, server: string, apiKey: string | undefined, workingDirectory: string): Promise<{
    success: boolean;
    error?: string;
}>;


import { DiagnosticSeverity } from 'vscode-languageserver/node';

export type SeverityLevel = DiagnosticSeverity | string;

export interface CppCheckSeverityMaps {
    error: SeverityLevel;
    warning: SeverityLevel;
    style: SeverityLevel;
    performance: SeverityLevel;
    portability: SeverityLevel;
    information: SeverityLevel;
}

export interface FlexelintSeverityMaps {
    Error: SeverityLevel;
    Warning: SeverityLevel;
    Info: SeverityLevel;
    Note: SeverityLevel;
}

export interface ClangSeverityMaps {
    fatal: SeverityLevel;
    error: SeverityLevel;
    warning: SeverityLevel;
    note: SeverityLevel;
}

export interface PclintPlusSeverityMaps {
    error: SeverityLevel;
    warning: SeverityLevel;
    info: SeverityLevel;
    note: SeverityLevel;
    supplemental: SeverityLevel;
}

export interface FlawFinderSeverityMaps {
    '0': SeverityLevel;
    '1': SeverityLevel;
    '2': SeverityLevel;
    '3': SeverityLevel;
    '4': SeverityLevel;
    '5': SeverityLevel;
}

export interface Settings {
    enable: boolean;
    debug: boolean;
    run: 'onSave' | 'onType' | 'onBuild';
    ignoreParseErrors: boolean;

    excludeFromWorkspacePaths: string[];

    // common options, which may be overridden per syntax analyzer
    standard: string[];
    includePaths: string[];
    defines: string[];
    undefines: string[];
    language: 'c' | 'c++';
    compileCommandsPath: string;

    flexelint: {
        enable: boolean;
        executable: string;
        configFile: string;
        headerArgs: string | string[];
        severityLevels: FlexelintSeverityMaps;
    }
    pclintplus: {
        enable: boolean;
        executable: string;
        configFile: string;
        headerArgs: string | string[];
        severityLevels: PclintPlusSeverityMaps;
    }
    cppcheck: {
        enable: boolean;
        executable: string;
        configFile: string;
        unusedFunctions: boolean;
        verbose: boolean;
        force: boolean;
        inconclusive: boolean;
        platform: 'avr8' | 'unix32' | 'unix64' | 'win32A' | 'win32W' | 'win64' | 'native';
        standard: string[] | null;
        includePaths: string[] | null;
        defines: string[] | null;
        undefines: string[] | null;
        suppressions: string[];
        addons: string[];
        language: 'c' | 'c++' | null;
        severityLevels: CppCheckSeverityMaps;
        extraArgs: string[] | null;
    }
    clang: {
        enable: boolean;
        executable: string;
        configFile: string;
        severityLevels: ClangSeverityMaps;

        // common options, which may be overridden per syntax analyzer
        standard: string[];
        includePaths: string[];
        defines: string[];
        undefines: string[];
        language: 'c' | 'c++';

        // special options
        extraArgs: string[] | null;
        warnings: string[] | null;
        pedantic: boolean;
        pedanticErrors: boolean;
        msExtensions: boolean;
        noExceptions: boolean;
        noRtti: boolean;
        blocks: boolean;
        includes: string[] | null;
        standardLibs: string[] | null;
    }
    flawfinder: {
        enable: boolean;
        executable: string;
        severityLevels: FlawFinderSeverityMaps;
    }
    lizard: {
        enable: boolean;
        executable: string;
        extraArgs: string[] | null;
    }
}

// Settings as defined in VS Code.
export interface GlobalSettings {
    'c-cpp-flylint': Settings;
}

// Copyright (c) 2017-2022 The VSCode C/C++ Flylint Authors
//
// SPDX-License-Identifier: MIT
//
// istanbul ignore file

import { GlobalSettings } from '../common/types';

export const isWindows =
    process.platform === 'win32' ||
    process.env.OSTYPE === 'cygwin' ||
    process.env.OSTYPE === 'msys';

export const defaultConfig: GlobalSettings = {
    'c-cpp-flylint': {
        enable: true,
        debug: false,
        run: 'onSave',

        standard: ['c99'],
        includePaths: [],
        defines: [],
        undefines: [],
        language: 'c',
        ignoreParseErrors: false,
        excludeFromWorkspacePaths: [],
        compileCommandsPath: '',

        pclintplus: {
            enable: true,
            executable: (isWindows ? 'pclp.exe' : 'pclp'),
            configFile: 'tsconfig.json',
            headerArgs: [
                '-e750',
                '-e751',
                '-e752',
                '-e753',
                '-e754',
                '-e1526',
                '-e1714'
            ],
            severityLevels: {
                error: 'Error',
                warning: 'Warning',
                info: 'Information',
                note: 'Hint',
                supplemental: 'Hint'
            }
        },

        cppcheck: {
            enable: true,
            executable: (isWindows ? 'cppcheck.exe' : 'cppcheck'),
            configFile: '.cpp_complete',
            unusedFunctions: false,
            verbose: false,
            force: false,
            inconclusive: false,
            platform: 'native',
            suppressions: [],
            severityLevels: {
                error: 'Error',
                warning: 'Warning',
                style: 'Information',
                performance: 'Warning',
                portability: 'Warning',
                information: 'Information'
            },
            standard: ['c99'],
            includePaths: [],
            defines: [],
            undefines: [],
            language: 'c',
            addons: [],
            extraArgs: null,
        },

        clangtidy: {
            enable: true,
            executable: (isWindows ? 'clang-tidy.exe' : 'clang-tidy'),
            configFile: '.clang_complete',
            severityLevels: {
                error: 'Error',
                fatal: 'Error',
                warning: 'Warning',
                note: 'Information'
            },
            standard: ['c99'],
            includePaths: [],
            defines: [],
            undefines: [],
            language: 'c',
            extraArgs: null,
            warnings: ['all', 'extra', 'everything'],
            pedantic: false,
            pedanticErrors: false,
            msExtensions: false,
            noExceptions: true,
            noRtti: true,
            blocks: true,
            includes: null,
            standardLibs: null
        },

        flawfinder: {
            enable: true,
            executable: 'flawfinder',
            severityLevels: {
                5: 'Error',
                4: 'Warning',
                3: 'Information',
                2: 'Information',
                1: 'Information',
                0: 'Information'
            }
        },

        lizard: {
            enable: true,
            executable: 'lizard',
            extraArgs: null,
        }
    }
};

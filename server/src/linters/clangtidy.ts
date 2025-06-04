// Copyright (c) 2017-2022 The VSCode C/C++ Flylint Authors
//
// SPDX-License-Identifier: MIT

import { ClangSeverityMaps, Settings } from '../../../common/types'
import { VS_DiagnosticSeverity } from '../settings';
import { Linter, Lint } from './linter';
import { InternalDiagnostic } from '../server';
import { path as sysPath } from '../utils';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { existsSync } from 'fs';

export class ClangTidy extends Linter {
    private actualFileName: string = '';
    private tmpFileName: string = '';

    constructor(settings: Settings, workspaceRoot: string) {
        super('Clangtidy', settings, workspaceRoot, false);
        this.cascadeCommonSettings('clangtidy');

        this.executable = settings.clangtidy.executable;
        this.configFile = settings.clangtidy.configFile;
        this.active = this.enabled = settings.clangtidy.enable;
    }

    /* istanbul ignore next */
    public lintOn(): Lint[] {
        return [Lint.ON_SAVE, Lint.ON_TYPE, Lint.ON_BUILD];
    }

    protected buildCommandLine(fileName: string, tmpFileName: string): string[] {

        let args = [
            this.executable
        ];

        // add compileCommands if the file is correctly defined and file exists
        if (existsSync(this.settings.compileCommandsPath)) {
            args.push("-p");
            args.push(this.settings.compileCommandsPath);
        }

        //clang import from gcc important
        if (this.settings.clangtidy.includePaths?.length) {
            //add to assume any system includes
            args.push("--extra-arg=-isystem");
            for (const item of this.settings.clangtidy.includePaths) {
                args.push(`--extra-arg=${item}`);
            }
        }

        if (this.settings.clangtidy.extraArgs?.length) {
            for (const item of this.settings.clangtidy.extraArgs) {
                args.push(`--extra-arg=${item}`);
            }
        }

        //formatting related
        args.push("--use-color=false");
        args.push("--quiet");

        if (this.settings.run === 'onType') {
            args.push(sysPath(tmpFileName));
        } else {
            args.push(sysPath(fileName));
        }

        this.actualFileName = fileName;
        this.tmpFileName = tmpFileName;

        return args;
    }

    protected parseLine(line: string): InternalDiagnostic | null {
        let regex = /^(.+?):([0-9]+):([0-9]+):\s(fatal|error|warning|note)(?: error)?:\s(.*)$/;
        let regexArray: RegExpExecArray | null;

        if (line === '') {
            // skip this line
            return null;
        }

        let excludeRegex = /^(WX.*|_WX.*|__WX.*|Q_.*|warning: .* incompatible with .*|warning: .* input unused|warning: include location .* is unsafe for cross-compilation.*|\s+\d+\s*\|\s+.*|\s+\|\s+.*|(\d+ warnings?)?( and)?\s?(\d+ errors?)? generated.|Error while processing .*)$/;
        if (excludeRegex.exec(line) !== null) {
            // skip this line
            return null;
        }

        let inFileArray: RegExpExecArray | null;
        let inFileRegex = /^In file included from (.+?):([0-9]+):$/;

        if ((inFileArray = inFileRegex.exec(line)) !== null) {
            return {
                fileName: (inFileArray[1] === this.tmpFileName ? this.actualFileName : inFileArray[1]),
                line: parseInt(inFileArray[2]) - 1,
                column: 0,
                severity: DiagnosticSeverity.Warning,
                code: 0,
                message: 'Issues in file included from here',
                source: this.name
            };
        }

        if ((regexArray = regex.exec(line)) !== null) {
            return {
                fileName: (regexArray[1] === this.tmpFileName ? this.actualFileName : regexArray[1]),
                line: parseInt(regexArray[2]) - 1,
                column: parseInt(regexArray[3]) - 1,
                severity: this.getSeverityCode(regexArray[4]),
                code: 0,
                message: regexArray[5],
                source: this.name,
            };
        } else {
            return {
                parseError: 'Line could not be parsed: ' + line,
                fileName: '',
                line: 0,
                column: 0,
                severity: DiagnosticSeverity.Error,
                code: 0,
                message: '',
                source: this.name
            };
        }
    }

    private getSeverityCode(severity: string): DiagnosticSeverity {
        let output = this.settings.clangtidy.severityLevels[severity as keyof ClangSeverityMaps];
        return VS_DiagnosticSeverity.from(output);
    }
}

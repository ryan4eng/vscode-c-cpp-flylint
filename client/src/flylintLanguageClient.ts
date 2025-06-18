// Copyright (c) 2017-2022 The VSCode C/C++ Flylint Authors
//
// SPDX-License-Identifier: MIT

import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';
import * as ls from 'vscode-languageserver';
import * as code from 'vscode';

export class FlylintLanguageClient extends LanguageClient {
    constructor(
        id: string,
        name: string,
        serverOptions: ServerOptions,
        clientOptions: LanguageClientOptions,
        queryUrlStr: string,
        matchSet: string[],
        forceDebug?: boolean
    ) {
        super(id, name, serverOptions, clientOptions, forceDebug);
        let originalAsDiagnostic = this.protocol2CodeConverter.asDiagnostic;
        this.protocol2CodeConverter.asDiagnostic = ((diagnostic: ls.Diagnostic): code.Diagnostic => {
            /** Safety to try and stop some edge cases */
            if (diagnostic.range.end.line == -1) {
                diagnostic.range.end.line = 0;
            }

            if (diagnostic.range.start.line == -1) {
                diagnostic.range.start.line = 0;
            }

            /** Safety - this stop any further messages from going through if its not caught. */
            if (diagnostic.message == '') {
                diagnostic.message = '...';
            }

            let result = originalAsDiagnostic(diagnostic);
            if ((result.code !== undefined) && (typeof result.code === 'string') && (queryUrlStr.length > 0)) {
                let codeStr = String(result.code);
                if (matchSet.some(v => codeStr.includes(v))) {
                    result.code = {
                        value: result.code,
                        target: this.protocol2CodeConverter.asUri(`${queryUrlStr}${result.source}%20${result.code}`)
                    };
                }
            }
            return result;
        });

        // Assuming this is part of your LanguageClient setup
        this.protocol2CodeConverter.asDiagnostics = (diagnostics: ls.Diagnostic[]): Promise<code.Diagnostic[]> => {
            return Promise.resolve(diagnostics.map(diagnostic => this.protocol2CodeConverter.asDiagnostic(diagnostic)));
        };
    }
}

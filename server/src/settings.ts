// Copyright (c) 2017-2022 The VSCode C/C++ Flylint Authors
//
// SPDX-License-Identifier: MIT

import * as _ from 'lodash';
import * as os from 'os';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import {SeverityLevel} from '../../common/src/types'

export interface IConfiguration {
    name: string;
    includePath: string[];
    defines: string[];
}

export interface IConfigurations {
    configurations: IConfiguration[];
}

/* istanbul ignore next */
export function propertiesPlatform() {
    switch (os.platform()) {
        case 'darwin': return 'Mac';
        case 'linux': return 'Linux';
        case 'win32': return 'Win32';
        default:
            throw RangeError(`Unsupported operating system; no entry for ${os.platform()}`);
    }
}

export namespace VS_DiagnosticSeverity {
    /* istanbul ignore next */
    export function from(value: SeverityLevel): DiagnosticSeverity {
        if (_.isNumber(value)) {
            return value as DiagnosticSeverity;
        }

        if (!_.isString(value)) {
            throw TypeError(`The diagnostic code ${value} was neither a number nor string!`);
        }

        switch (value) {
            case 'Error': return DiagnosticSeverity.Error;
            case 'Warning': return DiagnosticSeverity.Warning;
            case 'Information': return DiagnosticSeverity.Information;
            case 'Hint': return DiagnosticSeverity.Hint;
            default:
                throw RangeError(`The diagnostic code ${value} has no mapping to DiagnosticSeverty.`);
        }
    }
}

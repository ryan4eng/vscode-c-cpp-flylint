// Copyright (c) 2017-2022 The VSCode C/C++ Flylint Authors
//
// SPDX-License-Identifier: MIT

import { TextDocument, commands, env, ExtensionContext, window, workspace, tasks, TaskEndEvent, TaskGroup, Uri, WorkspaceConfiguration } from 'vscode';
import {
    LanguageClientOptions,
    ServerOptions,
    SettingMonitor,
    TransportKind,
} from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { FlylintLanguageClient } from './flylintLanguageClient';
import * as path from 'path';
import { getFromWorkspaceState, resetWorkspaceState, setWorkspaceState, updateWorkspaceState } from './stateUtils';
import { isBoolean } from 'lodash';
import { Settings } from 'common/types'

import * as os from 'os';


const FLYLINT_ID: string = 'c-cpp-flylint';

const WORKSPACE_IS_TRUSTED_KEY = 'WORKSPACE_IS_TRUSTED_KEY';
const SECURITY_SENSITIVE_CONFIG: string[] = [
    'clang-tidy.executable',
    'cppcheck.executable',
    'flawfinder.executable',
    'lizard.executable',
    'pclintplus.executable',
    'queryUrlBase'
];
let IS_TRUSTED: boolean = false;

export async function maybeWorkspaceIsTrusted(ctx: ExtensionContext) {
    if (workspace.hasOwnProperty('isTrusted') && workspace.hasOwnProperty('isTrusted') !== null) {
        const workspaceIsTrusted = (workspace as any)['isTrusted'];
        console.log(`Workspace has property "isTrusted". It has the value of "${workspaceIsTrusted}".`);
        if (isBoolean(workspaceIsTrusted) && workspaceIsTrusted) {
            IS_TRUSTED = true;
            console.log(`Workspace was marked trusted, by user of VSCode.`);
        } else {
            IS_TRUSTED = false;
            console.log(`Workspace is not trusted!`);
        }
        return;
    }

    const isTrusted = getFromWorkspaceState(WORKSPACE_IS_TRUSTED_KEY, false);
    if (isTrusted !== IS_TRUSTED) {
        IS_TRUSTED = true;
    }

    ctx.subscriptions.push(commands.registerCommand('c-cpp-flylint.workspace.isTrusted.toggle', async () => {
        await toggleWorkspaceIsTrusted();
        commands.executeCommand('c-cpp-flylint.analyzeWorkspace');
    }));
    ctx.subscriptions.push(commands.registerCommand('c-cpp-flylint.workspace.resetState', resetWorkspaceState));

    if (isTrusted) {
        return;
    }

    const ignored = ignoredWorkspaceConfig(workspace.getConfiguration(FLYLINT_ID), SECURITY_SENSITIVE_CONFIG);
    if (ignored.length === 0) {
        return;
    }
    const ignoredSettings = ignored.map((x) => `"${FLYLINT_ID}.${x}"`).join(',');
    const val = await window.showWarningMessage(
        `Some workspace/folder-level settings (${ignoredSettings}) from the untrusted workspace are disabled ` +
        'by default. If this workspace is trusted, explicitly enable the workspace/folder-level settings ' +
        'by running the "C/C++ Flylint: Toggle Workspace Trust Flag" command.',
        'OK',
        'Trust This Workspace',
        'More Info'
    );
    switch (val) {
        case 'Trust This Workspace':
            await toggleWorkspaceIsTrusted();
            break;
        case 'More Info':
            env.openExternal(Uri.parse('https://github.com/jbenden/vscode-c-cpp-flylint/blob/main/README.md#security'));
            break;
        default:
            break;
    }
}

function ignoredWorkspaceConfig(cfg: WorkspaceConfiguration, keys: string[]) {
    return keys.filter((key) => {
        const inspect = cfg.inspect(key);
        if (inspect === undefined) {
            return false;
        }
        return inspect.workspaceValue !== undefined || inspect.workspaceFolderValue !== undefined;
    });
}

async function toggleWorkspaceIsTrusted() {
    IS_TRUSTED = !IS_TRUSTED;
    await updateWorkspaceState(WORKSPACE_IS_TRUSTED_KEY, IS_TRUSTED);
}

export async function activate(context: ExtensionContext) {
    setWorkspaceState(context.workspaceState);

    await maybeWorkspaceIsTrusted(context);

    // The server is implemented in Node.
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

    // The debug options for the server.
    const debugOptions = {
        execArgv: ['--nolazy', '--inspect=6011']
    };

    // If the extension is launched in debug mode the debug server options are used, otherwise the run options are used.
    const serverOptions: ServerOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Create the language client and start it.
    startLSClient(serverOptions, context);
}

function startLSClient(serverOptions: ServerOptions, context: ExtensionContext) {
    // Options to control the language client.
    const clientOptions: LanguageClientOptions = {
        // Register the server for C/C++ documents.
        documentSelector: [{ scheme: 'file', language: 'c' }, { scheme: 'file', language: 'cpp' }],
        synchronize: {
            // Synchronize the setting section "c-cpp-flylint" to the server.
            configurationSection: FLYLINT_ID,
            fileEvents: workspace.createFileSystemWatcher('**/.vscode/c_cpp_properties.json')
        }
    };

    let settings = vscode.workspace.getConfiguration(FLYLINT_ID);
    let queryUrlBase = settings.get<string>('queryUrlBase');
    let webQueryMatchSet = settings.get<Array<string>>('webQueryMatchSet');

    if (queryUrlBase === undefined) {
        queryUrlBase = 'https://www.google.com/search?q=';
    }
    if (webQueryMatchSet === undefined) {
        webQueryMatchSet = [];
    }

    const client = new FlylintLanguageClient(FLYLINT_ID, 'C/C++ Flylint', serverOptions, clientOptions,
        queryUrlBase, webQueryMatchSet);


    client.start()
        .then(() => {
            // ----------------------------------------------------------------

            context.subscriptions.push(commands.registerCommand('c-cpp-flylint.getLocalConfig', async (d: TextDocument) => {
                return client.sendRequest('getLocalConfig', d);
            }));

            // ----------------------------------------------------------------

            // Here we must watch for all extension dependencies to start and be ready.
            let untilReadyRetries = 40; // 40x250 = 10 seconds maximum
            const untilReady = async () => {
                try {
                    await commands.executeCommand('cpptools.activeConfigName');
                    client.sendNotification('begin', { document: window.activeTextEditor!.document });
                }
                catch (err) {
                    if (--untilReadyRetries > 0) {
                        setTimeout(untilReady, 250); // repeat
                    } else {
                        client.outputChannel.appendLine(`Failed to access "ms-vstools.cpptools"` +
                            `extension's active workspace` +
                            `configuration.`);
                        client.sendNotification('begin');
                    }
                }
            };
            setTimeout(untilReady, 250); // primer

            // ----------------------------------------------------------------

            client.onRequest('activeTextDocument', () => {
                return window.activeTextEditor!.document;
            });

            // ----------------------------------------------------------------

            client.onRequest('c-cpp-flylint.cpptools.activeConfigName', async () => {
                return commands.executeCommand('cpptools.activeConfigName');
            });

            // ----------------------------------------------------------------

            client.onRequest('isTrusted', () => {
                return IS_TRUSTED;
            });

            // ----------------------------------------------------------------

            // VSCode supports various string symbols out of the box, but they do not evaluate automatically.
            // Individually work through each value to ensure they are evaluated as required
            client.onRequest('resolveVSSymbols', async (settings: Settings) => {
                try {
                    // Do the with resolution
                    return resolveSettingsObject(settings);
                } catch (error) {
                    // Step 4: Final fallback - return original settings
                    console.warn('Variable resolution failed:', error);
                    return settings;
                }
            });

            // ----------------------------------------------------------------
            tasks.onDidEndTask((e: TaskEndEvent) => {
                if (e.execution.task.group && e.execution.task.group === TaskGroup.Build) {
                    // send a build notification event
                    let params = {
                        taskName: e.execution.task.name,
                        taskSource: e.execution.task.source,
                        isBackground: e.execution.task.isBackground,
                    };
                    client.sendNotification('onBuild', params);
                }
            });
        });

    context.subscriptions.push(new SettingMonitor(client, `${FLYLINT_ID}.enable`).start());
}

interface ResolverContext {
    workspaceFolder: string;
    userHome: string;
}

// Keep your manual resolution function as backup
function resolveSettingsObject(settings: Settings): Settings {
    // deep copy so we don't touch the original one in case of corruption
    let resolvedSettings = JSON.parse(JSON.stringify(settings));

    const context: ResolverContext = {
        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        userHome: os.homedir(),
    }

    return walkAndResolve(resolvedSettings, context);
}

function walkAndResolve(obj: any, context: ResolverContext, currentPath: string[] = []): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return resolveString(obj, context, currentPath);
    }

    if (Array.isArray(obj)) {
        return obj.map((item, index) =>
            walkAndResolve(item, context, [...currentPath, index.toString()])
        );
    }

    if (typeof obj === 'object') {
        const resolved: any = {};
        for (const [key, value] of Object.entries(obj)) {
            resolved[key] = walkAndResolve(value, context, [...currentPath, key]);
        }
        return resolved;
    }

    // For primitive types (number, boolean, etc.), return as-is
    return obj;
}

function resolveString(value: string, context: ResolverContext, currentPath: string[] = []): string {
    let resolved = value;

    // Replace known variables
    resolved = resolved.replace(/\${workspaceFolder}/g, context.workspaceFolder);
    resolved = resolved.replace(/\${userHome}/g, context.userHome);

    // Check for unresolved variables and warn
    const unresolvedPattern = /\${([^}]+)}/g;
    let match;
    while ((match = unresolvedPattern.exec(resolved)) !== null) {
        const pathStr = currentPath.length > 0 ? currentPath.join('.') : 'root';
        console.warn(`Unhandled substitution at '${pathStr}' → \${${match[1]}}`);
    }

    return resolved;
}

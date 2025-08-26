import chalk from 'chalk';
export class AutoCompleter {
    tools;
    commandHistory = [];
    currentContext = '';
    constructor(tools) {
        this.tools = tools;
    }
    complete(line) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('/')) {
            return this.completeSpecialCommands(trimmedLine);
        }
        if (this.isToolSelection(trimmedLine)) {
            return this.completeToolNames(trimmedLine);
        }
        if (this.isParameterInput(trimmedLine)) {
            return this.completeParameters(trimmedLine);
        }
        return this.getDefaultCompletions(trimmedLine);
    }
    completeSpecialCommands(line) {
        const specialCommands = [
            '/favorites',
            '/fav',
            '/history',
            '/hist',
            '/analytics',
            '/stats',
            '/clear',
            '/help'
        ];
        const partial = line.slice(1);
        const matches = specialCommands
            .filter(cmd => cmd.slice(1).startsWith(partial))
            .map(cmd => cmd.slice(1));
        return [matches, partial];
    }
    completeToolNames(line) {
        const toolNames = Object.keys(this.tools);
        const matches = toolNames.filter(name => name.toLowerCase().includes(line.toLowerCase()));
        matches.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const lineLower = line.toLowerCase();
            if (aLower === lineLower && bLower !== lineLower)
                return -1;
            if (bLower === lineLower && aLower !== lineLower)
                return 1;
            if (aLower.startsWith(lineLower) && !bLower.startsWith(lineLower))
                return -1;
            if (bLower.startsWith(lineLower) && !aLower.startsWith(lineLower))
                return 1;
            return a.localeCompare(b);
        });
        return [matches, line];
    }
    completeParameters(line) {
        const parameterContext = this.extractParameterContext(line);
        if (!parameterContext) {
            return [[], line];
        }
        const { toolName, parameterName, partialValue } = parameterContext;
        const tool = this.tools[toolName];
        if (!tool?.parameters[parameterName]) {
            return [[], partialValue];
        }
        const parameter = tool.parameters[parameterName];
        const suggestions = this.getParameterSuggestions(parameter, partialValue);
        return [suggestions, partialValue];
    }
    getParameterSuggestions(parameter, partialValue) {
        let suggestions = [];
        if (parameter.suggestions) {
            suggestions = suggestions.concat(parameter.suggestions);
        }
        if (parameter.examples) {
            const exampleStrings = parameter.examples
                .filter((ex) => typeof ex === 'string')
                .map((ex) => String(ex));
            suggestions = suggestions.concat(exampleStrings);
        }
        switch (parameter.type) {
            case 'boolean':
                suggestions = suggestions.concat(['true', 'false', 'yes', 'no']);
                break;
            case 'string':
                break;
            case 'number':
                suggestions = suggestions.concat(['1', '5', '10', '20', '50', '100']);
                break;
            case 'array':
                suggestions = suggestions.concat(['["item1","item2"]', '["value"]']);
                break;
            case 'object':
                suggestions = suggestions.concat(['{}', '{"key":"value"}']);
                break;
        }
        const filtered = suggestions.filter(suggestion => suggestion.toLowerCase().includes(partialValue.toLowerCase()));
        return [...new Set(filtered)].sort();
    }
    extractParameterContext(line) {
        if (!this.currentContext) {
            return null;
        }
        const contextParts = this.currentContext.split(':');
        if (contextParts.length < 2) {
            return null;
        }
        return {
            toolName: contextParts[0],
            parameterName: contextParts[1],
            partialValue: line
        };
    }
    isToolSelection(line) {
        const isNumber = /^\d+$/.test(line);
        const containsToolKeywords = Object.keys(this.tools).some(tool => line.toLowerCase().includes(tool.toLowerCase()));
        return !isNumber && (containsToolKeywords || line.length > 2);
    }
    isParameterInput(_line) {
        return this.currentContext.includes(':parameter:');
    }
    getDefaultCompletions(_line) {
        const defaultOptions = [
            ...Object.keys(this.tools),
            '0',
            '/help',
            '/favorites',
            '/history'
        ];
        const matches = defaultOptions.filter(option => option.toLowerCase().includes(_line.toLowerCase()));
        return [matches, _line];
    }
    setContext(context) {
        this.currentContext = context;
    }
    clearContext() {
        this.currentContext = '';
    }
    addToHistory(command) {
        this.commandHistory.push(command);
        if (this.commandHistory.length > 100) {
            this.commandHistory = this.commandHistory.slice(-100);
        }
    }
    getHistory() {
        return [...this.commandHistory];
    }
    getSmartSuggestions(toolName) {
        const suggestions = [];
        const toolUsage = this.commandHistory.filter(cmd => cmd.includes(toolName));
        if (toolUsage.length > 0) {
            const commonParams = this.extractCommonParameters(toolUsage);
            suggestions.push(...commonParams);
        }
        const tool = this.tools[toolName];
        if (tool) {
            const requiredParams = Object.entries(tool.parameters)
                .filter(([, param]) => param.required)
                .map(([name]) => name);
            suggestions.push(...requiredParams);
        }
        return [...new Set(suggestions)];
    }
    extractCommonParameters(usage) {
        const paramCounts = {};
        usage.forEach(cmd => {
            const matches = cmd.match(/"(\w+)":/g);
            if (matches) {
                matches.forEach(match => {
                    const param = match.slice(1, -2);
                    paramCounts[param] = (paramCounts[param] || 0) + 1;
                });
            }
        });
        return Object.entries(paramCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([param]) => param)
            .slice(0, 5);
    }
    getCategorySuggestions(category) {
        return Object.values(this.tools)
            .filter(tool => tool.category === category)
            .map(tool => tool.name);
    }
    formatSuggestions(suggestions, _context = '') {
        if (suggestions.length === 0) {
            return chalk.gray('No suggestions available');
        }
        const formatted = suggestions.map((suggestion, _index) => {
            const tool = this.tools[suggestion];
            if (tool) {
                return `${chalk.cyan(suggestion)} ${chalk.gray(`- ${tool.description}`)}`;
            }
            return chalk.cyan(suggestion);
        });
        return formatted.join('\n');
    }
}
//# sourceMappingURL=auto-completer.js.map
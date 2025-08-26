import chalk from 'chalk';
export class ParameterHandler {
    parameterHistory = {};
    constructor(_tools) {
    }
    async collectParameters(schema, askQuestion) {
        const params = {};
        if (Object.keys(schema.parameters).length === 0) {
            console.log(chalk.gray('No parameters required.'));
            return params;
        }
        console.log(chalk.bold('\n📝 Parameter Collection:'));
        const requiredParams = Object.entries(schema.parameters)
            .filter(([, param]) => param.required);
        const optionalParams = Object.entries(schema.parameters)
            .filter(([, param]) => !param.required);
        if (requiredParams.length > 0) {
            console.log(chalk.bold.red('\nRequired Parameters:'));
            for (const [paramName, paramDef] of requiredParams) {
                const value = await this.collectSingleParameter(schema.name, paramName, paramDef, askQuestion, true);
                if (value !== undefined) {
                    params[paramName] = value;
                }
            }
        }
        if (optionalParams.length > 0) {
            console.log(chalk.bold.yellow('\nOptional Parameters:'));
            console.log(chalk.gray('Press Enter to skip any optional parameter'));
            for (const [paramName, paramDef] of optionalParams) {
                const value = await this.collectSingleParameter(schema.name, paramName, paramDef, askQuestion, false);
                if (value !== undefined) {
                    params[paramName] = value;
                }
            }
        }
        return params;
    }
    async collectSingleParameter(toolName, paramName, paramDef, askQuestion, isRequired) {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            attempts++;
            try {
                this.displayParameterInfo(paramName, paramDef, isRequired);
                this.showSuggestions(toolName, paramName, paramDef);
                const prompt = this.buildPrompt(paramName, paramDef, isRequired, attempts);
                const input = await askQuestion(prompt);
                if (!input.trim()) {
                    if (isRequired) {
                        if (attempts < maxAttempts) {
                            console.log(chalk.red('❌ This parameter is required. Please provide a value.'));
                            continue;
                        }
                        else {
                            const defaultValue = this.getDefaultValue(toolName, paramName, paramDef);
                            console.log(chalk.yellow(`⚠️  Using default value: ${JSON.stringify(defaultValue)}`));
                            return defaultValue;
                        }
                    }
                    else {
                        console.log(chalk.gray('⏭️  Skipped (optional)'));
                        return undefined;
                    }
                }
                const validation = this.validateParameter(input, paramDef);
                if (validation.isValid) {
                    this.addToParameterHistory(toolName, paramName, input);
                    console.log(chalk.green(`✅ ${paramName}: ${JSON.stringify(validation.transformedValue)}`));
                    return validation.transformedValue;
                }
                else {
                    console.log(chalk.red(`❌ ${validation.error}`));
                    if (validation.suggestion) {
                        console.log(chalk.yellow(`💡 Suggestion: ${validation.suggestion}`));
                    }
                    if (attempts >= maxAttempts) {
                        console.log(chalk.red('❌ Max attempts reached. Using default value.'));
                        return this.getDefaultValue(toolName, paramName, paramDef);
                    }
                }
            }
            catch (error) {
                console.log(chalk.red('❌ Input cancelled. Using default value.'));
                return this.getDefaultValue(toolName, paramName, paramDef);
            }
        }
        return undefined;
    }
    displayParameterInfo(paramName, paramDef, isRequired) {
        const requiredTag = isRequired ? chalk.red('[REQUIRED]') : chalk.gray('[OPTIONAL]');
        const typeTag = chalk.cyan(`[${paramDef.type.toUpperCase()}]`);
        console.log(`\n${chalk.bold(paramName)} ${requiredTag} ${typeTag}`);
        console.log(chalk.gray(`  ${paramDef.description}`));
    }
    showSuggestions(toolName, paramName, paramDef) {
        const suggestions = this.getSuggestions(toolName, paramName, paramDef);
        if (suggestions.length > 0) {
            console.log(chalk.blue('  💡 Suggestions:'));
            suggestions.slice(0, 5).forEach((suggestion, index) => {
                console.log(chalk.gray(`    ${index + 1}. ${suggestion}`));
            });
        }
        if (paramDef.examples && paramDef.examples.length > 0) {
            console.log(chalk.blue('  📋 Examples:'));
            paramDef.examples.slice(0, 3).forEach((example, index) => {
                const formatted = typeof example === 'string' ? example : JSON.stringify(example);
                console.log(chalk.gray(`    ${index + 1}. ${formatted}`));
            });
        }
    }
    buildPrompt(paramName, paramDef, isRequired, attempt) {
        let prompt = chalk.cyan(`Enter ${paramName}`);
        if (paramDef.type === 'array') {
            prompt += chalk.gray(' (comma-separated)');
        }
        else if (paramDef.type === 'object') {
            prompt += chalk.gray(' (JSON format)');
        }
        else if (paramDef.type === 'boolean') {
            prompt += chalk.gray(' (true/false, yes/no)');
        }
        if (!isRequired) {
            prompt += chalk.gray(' (or press Enter to skip)');
        }
        if (attempt > 1) {
            prompt += chalk.yellow(` [Attempt ${attempt}/3]`);
        }
        prompt += ': ';
        return prompt;
    }
    getSuggestions(toolName, paramName, paramDef) {
        const suggestions = [];
        if (paramDef.suggestions) {
            suggestions.push(...paramDef.suggestions);
        }
        const historyKey = `${toolName}:${paramName}`;
        if (this.parameterHistory[historyKey]) {
            suggestions.push(...this.parameterHistory[historyKey]);
        }
        suggestions.push(...this.getSmartSuggestions(paramName, paramDef));
        return [...new Set(suggestions)];
    }
    getSmartSuggestions(paramName, paramDef) {
        const suggestions = [];
        const lowerName = paramName.toLowerCase();
        if (lowerName.includes('severity')) {
            suggestions.push('critical', 'high', 'medium', 'low', 'info');
        }
        if (lowerName.includes('alert') && lowerName.includes('type')) {
            suggestions.push('disk_space', 'memory_leak', 'cpu_high', 'network_latency', 'service_down');
        }
        if (lowerName.includes('system')) {
            suggestions.push('web-server-01', 'app-server-01', 'db-server-01', 'load-balancer-01');
        }
        if (lowerName.includes('id')) {
            suggestions.push('INC-001', 'REQ-001', 'CHG-001');
        }
        if (paramDef.type === 'boolean') {
            suggestions.push('true', 'false', 'yes', 'no');
        }
        if (lowerName.includes('query') || lowerName.includes('search')) {
            suggestions.push('disk space', 'memory leak', 'performance', 'security', 'troubleshooting');
        }
        return suggestions;
    }
    validateParameter(input, paramDef) {
        try {
            let transformedValue;
            switch (paramDef.type) {
                case 'string':
                    transformedValue = input;
                    if (transformedValue.length === 0) {
                        return { isValid: false, error: 'String cannot be empty' };
                    }
                    break;
                case 'boolean': {
                    const lowerInput = input.toLowerCase();
                    if (['true', 'yes', 'y', '1'].includes(lowerInput)) {
                        transformedValue = true;
                    }
                    else if (['false', 'no', 'n', '0'].includes(lowerInput)) {
                        transformedValue = false;
                    }
                    else {
                        return {
                            isValid: false,
                            error: 'Invalid boolean value',
                            suggestion: 'Use: true, false, yes, no, y, n, 1, or 0'
                        };
                    }
                    break;
                }
                case 'number':
                    transformedValue = parseInt(input);
                    if (isNaN(transformedValue)) {
                        return {
                            isValid: false,
                            error: 'Invalid number format',
                            suggestion: 'Enter a valid integer'
                        };
                    }
                    break;
                case 'array':
                    try {
                        if (input.startsWith('[') && input.endsWith(']')) {
                            transformedValue = JSON.parse(input);
                            if (!Array.isArray(transformedValue)) {
                                throw new Error('Not an array');
                            }
                        }
                        else {
                            transformedValue = input.split(',').map(item => item.trim()).filter(item => item.length > 0);
                        }
                        if (transformedValue.length === 0) {
                            return { isValid: false, error: 'Array cannot be empty' };
                        }
                    }
                    catch (error) {
                        return {
                            isValid: false,
                            error: 'Invalid array format',
                            suggestion: 'Use JSON format ["item1","item2"] or comma-separated: item1, item2'
                        };
                    }
                    break;
                case 'object':
                    try {
                        if (input === '{}') {
                            transformedValue = {};
                        }
                        else {
                            transformedValue = JSON.parse(input);
                            if (typeof transformedValue !== 'object' || Array.isArray(transformedValue)) {
                                throw new Error('Not an object');
                            }
                        }
                    }
                    catch (error) {
                        return {
                            isValid: false,
                            error: 'Invalid JSON object format',
                            suggestion: 'Use JSON format: {"key":"value"} or {} for empty object'
                        };
                    }
                    break;
                default:
                    transformedValue = input;
            }
            if (paramDef.validation && !paramDef.validation(transformedValue)) {
                return {
                    isValid: false,
                    error: 'Value does not meet validation criteria'
                };
            }
            return { isValid: true, transformedValue };
        }
        catch (error) {
            return {
                isValid: false,
                error: `Validation error: ${error.message}`
            };
        }
    }
    getDefaultValue(toolName, paramName, paramDef) {
        const toolDefaults = {
            search_runbooks: {
                alert_type: 'disk_space',
                severity: 'high',
                affected_systems: ['web-server-01']
            },
            get_decision_tree: {
                scenario_type: 'disk_space'
            },
            get_procedure: {
                procedure_id: 'emergency_procedure'
            },
            get_escalation_path: {
                alert_type: 'disk_space',
                severity: 'high',
                business_hours: false
            },
            search_knowledge_base: {
                query: 'troubleshooting',
                max_results: 10
            },
            record_resolution_feedback: {
                incident_id: 'INC-TEST-001',
                resolution_successful: true
            }
        };
        if (toolDefaults[toolName] && toolDefaults[toolName][paramName] !== undefined) {
            return toolDefaults[toolName][paramName];
        }
        if (paramDef.examples && paramDef.examples.length > 0) {
            return paramDef.examples[0];
        }
        if (paramDef.suggestions && paramDef.suggestions.length > 0) {
            return paramDef.suggestions[0];
        }
        switch (paramDef.type) {
            case 'boolean':
                return false;
            case 'number':
                return 0;
            case 'array':
                return [];
            case 'object':
                return {};
            default:
                return 'default';
        }
    }
    addToParameterHistory(toolName, paramName, value) {
        const key = `${toolName}:${paramName}`;
        if (!this.parameterHistory[key]) {
            this.parameterHistory[key] = [];
        }
        const history = this.parameterHistory[key];
        const filtered = history.filter(item => item !== value);
        this.parameterHistory[key] = [value, ...filtered].slice(0, 10);
    }
    getValidationHints(paramDef) {
        const hints = [];
        switch (paramDef.type) {
            case 'array':
                hints.push('Use comma-separated values or JSON array format');
                hints.push('Example: item1, item2 or ["item1","item2"]');
                break;
            case 'object':
                hints.push('Use JSON object format');
                hints.push('Example: {"key":"value"} or {} for empty');
                break;
            case 'boolean':
                hints.push('Accepts: true/false, yes/no, y/n, 1/0');
                break;
            case 'number':
                hints.push('Enter a valid integer');
                break;
            case 'string':
                hints.push('Enter any text value');
                break;
        }
        if (paramDef.required) {
            hints.push('This parameter is required');
        }
        return hints;
    }
    formatParameterValue(value, paramDef) {
        switch (paramDef.type) {
            case 'array':
                return Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
            case 'object':
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            case 'boolean':
                return value ? 'true' : 'false';
            default:
                return String(value);
        }
    }
}
//# sourceMappingURL=parameter-handler.js.map
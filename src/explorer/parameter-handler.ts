/**
 * Parameter Handler Module for Enhanced MCP Tool Explorer
 * 
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-08-15
 * 
 * Provides smart parameter handling with context-aware suggestions,
 * validation, and enhanced user experience for parameter collection.
 */

import chalk from 'chalk';

interface ToolParameter {
  type: 'string' | 'boolean' | 'number' | 'array' | 'object';
  required: boolean;
  description: string;
  suggestions?: string[];
  validation?: (value: any) => boolean;
  examples?: any[];
}

interface MCPToolSchema {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, ToolParameter>;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  transformedValue?: any;
}

/**
 * Smart parameter handling with context-aware suggestions and validation
 */
export class ParameterHandler {
  private parameterHistory: Record<string, string[]> = {};

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  constructor(_tools: Record<string, MCPToolSchema>) {
    // Tools are passed for potential future use
  }

  /**
   * Collect parameters for a tool with enhanced UX
   */
  async collectParameters(
    schema: MCPToolSchema, 
    askQuestion: (question: string) => Promise<string>
  ): Promise<Record<string, any>> {
    const params: Record<string, any> = {};
    
    if (Object.keys(schema.parameters).length === 0) {
      console.log(chalk.gray('No parameters required.'));
      return params;
    }

    console.log(chalk.bold('\n📝 Parameter Collection:'));
    
    // Collect required parameters first
    const requiredParams = Object.entries(schema.parameters)
      .filter(([, param]) => param.required);
    
    const optionalParams = Object.entries(schema.parameters)
      .filter(([, param]) => !param.required);

    // Process required parameters
    if (requiredParams.length > 0) {
      console.log(chalk.bold.red('\nRequired Parameters:'));
      for (const [paramName, paramDef] of requiredParams) {
        const value = await this.collectSingleParameter(
          schema.name, paramName, paramDef, askQuestion, true
        );
        if (value !== undefined) {
          params[paramName] = value;
        }
      }
    }

    // Process optional parameters
    if (optionalParams.length > 0) {
      console.log(chalk.bold.yellow('\nOptional Parameters:'));
      console.log(chalk.gray('Press Enter to skip any optional parameter'));
      
      for (const [paramName, paramDef] of optionalParams) {
        const value = await this.collectSingleParameter(
          schema.name, paramName, paramDef, askQuestion, false
        );
        if (value !== undefined) {
          params[paramName] = value;
        }
      }
    }

    return params;
  }

  /**
   * Collect a single parameter with smart suggestions and validation
   */
  private async collectSingleParameter(
    toolName: string,
    paramName: string,
    paramDef: ToolParameter,
    askQuestion: (question: string) => Promise<string>,
    isRequired: boolean
  ): Promise<any> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Show parameter information
        this.displayParameterInfo(paramName, paramDef, isRequired);
        
        // Show suggestions if available
        this.showSuggestions(toolName, paramName, paramDef);
        
        // Get user input
        const prompt = this.buildPrompt(paramName, paramDef, isRequired, attempts);
        const input = await askQuestion(prompt);
        
        // Handle empty input
        if (!input.trim()) {
          if (isRequired) {
            if (attempts < maxAttempts) {
              console.log(chalk.red('❌ This parameter is required. Please provide a value.'));
              continue;
            } else {
              // Use default value as last resort
              const defaultValue = this.getDefaultValue(toolName, paramName, paramDef);
              console.log(chalk.yellow(`⚠️  Using default value: ${JSON.stringify(defaultValue)}`));
              return defaultValue;
            }
          } else {
            console.log(chalk.gray('⏭️  Skipped (optional)'));
            return undefined;
          }
        }

        // Validate and transform input
        const validation = this.validateParameter(input, paramDef);
        
        if (validation.isValid) {
          // Store in history for future suggestions
          this.addToParameterHistory(toolName, paramName, input);
          
          // Show success feedback
          console.log(chalk.green(`✅ ${paramName}: ${JSON.stringify(validation.transformedValue)}`));
          return validation.transformedValue;
        } else {
          console.log(chalk.red(`❌ ${validation.error}`));
          if (validation.suggestion) {
            console.log(chalk.yellow(`💡 Suggestion: ${validation.suggestion}`));
          }
          
          if (attempts >= maxAttempts) {
            console.log(chalk.red('❌ Max attempts reached. Using default value.'));
            return this.getDefaultValue(toolName, paramName, paramDef);
          }
        }
        
      } catch (error) {
        console.log(chalk.red('❌ Input cancelled. Using default value.'));
        return this.getDefaultValue(toolName, paramName, paramDef);
      }
    }

    return undefined;
  }

  /**
   * Display parameter information with formatting
   */
  private displayParameterInfo(paramName: string, paramDef: ToolParameter, isRequired: boolean): void {
    const requiredTag = isRequired ? chalk.red('[REQUIRED]') : chalk.gray('[OPTIONAL]');
    const typeTag = chalk.cyan(`[${paramDef.type.toUpperCase()}]`);
    
    console.log(`\n${chalk.bold(paramName)} ${requiredTag} ${typeTag}`);
    console.log(chalk.gray(`  ${paramDef.description}`));
  }

  /**
   * Show contextual suggestions for parameter
   */
  private showSuggestions(toolName: string, paramName: string, paramDef: ToolParameter): void {
    const suggestions = this.getSuggestions(toolName, paramName, paramDef);
    
    if (suggestions.length > 0) {
      console.log(chalk.blue('  💡 Suggestions:'));
      suggestions.slice(0, 5).forEach((suggestion, index) => {
        console.log(chalk.gray(`    ${index + 1}. ${suggestion}`));
      });
    }

    // Show examples if available
    if (paramDef.examples && paramDef.examples.length > 0) {
      console.log(chalk.blue('  📋 Examples:'));
      paramDef.examples.slice(0, 3).forEach((example, index) => {
        const formatted = typeof example === 'string' ? example : JSON.stringify(example);
        console.log(chalk.gray(`    ${index + 1}. ${formatted}`));
      });
    }
  }

  /**
   * Build input prompt with context
   */
  private buildPrompt(paramName: string, paramDef: ToolParameter, isRequired: boolean, attempt: number): string {
    let prompt = chalk.cyan(`Enter ${paramName}`);
    
    if (paramDef.type === 'array') {
      prompt += chalk.gray(' (comma-separated)');
    } else if (paramDef.type === 'object') {
      prompt += chalk.gray(' (JSON format)');
    } else if (paramDef.type === 'boolean') {
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

  /**
   * Get contextual suggestions for a parameter
   */
  private getSuggestions(toolName: string, paramName: string, paramDef: ToolParameter): string[] {
    const suggestions: string[] = [];
    
    // Add predefined suggestions
    if (paramDef.suggestions) {
      suggestions.push(...paramDef.suggestions);
    }
    
    // Add parameter history
    const historyKey = `${toolName}:${paramName}`;
    if (this.parameterHistory[historyKey]) {
      suggestions.push(...this.parameterHistory[historyKey]);
    }
    
    // Add smart suggestions based on parameter name
    suggestions.push(...this.getSmartSuggestions(paramName, paramDef));
    
    // Remove duplicates and return top suggestions
    return [...new Set(suggestions)];
  }

  /**
   * Get smart suggestions based on parameter patterns
   */
  private getSmartSuggestions(paramName: string, paramDef: ToolParameter): string[] {
    const suggestions: string[] = [];
    const lowerName = paramName.toLowerCase();
    
    // Severity suggestions
    if (lowerName.includes('severity')) {
      suggestions.push('critical', 'high', 'medium', 'low', 'info');
    }
    
    // Alert type suggestions
    if (lowerName.includes('alert') && lowerName.includes('type')) {
      suggestions.push('disk_space', 'memory_leak', 'cpu_high', 'network_latency', 'service_down');
    }
    
    // System suggestions
    if (lowerName.includes('system')) {
      suggestions.push('web-server-01', 'app-server-01', 'db-server-01', 'load-balancer-01');
    }
    
    // ID suggestions
    if (lowerName.includes('id')) {
      suggestions.push('INC-001', 'REQ-001', 'CHG-001');
    }
    
    // Boolean suggestions
    if (paramDef.type === 'boolean') {
      suggestions.push('true', 'false', 'yes', 'no');
    }
    
    // Query suggestions
    if (lowerName.includes('query') || lowerName.includes('search')) {
      suggestions.push('disk space', 'memory leak', 'performance', 'security', 'troubleshooting');
    }
    
    return suggestions;
  }

  /**
   * Validate parameter input
   */
  private validateParameter(input: string, paramDef: ToolParameter): ValidationResult {
    try {
      let transformedValue: any;
      
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
          } else if (['false', 'no', 'n', '0'].includes(lowerInput)) {
            transformedValue = false;
          } else {
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
            // Try JSON format first
            if (input.startsWith('[') && input.endsWith(']')) {
              transformedValue = JSON.parse(input);
              if (!Array.isArray(transformedValue)) {
                throw new Error('Not an array');
              }
            } else {
              // Fall back to comma-separated values
              transformedValue = input.split(',').map(item => item.trim()).filter(item => item.length > 0);
            }
            
            if (transformedValue.length === 0) {
              return { isValid: false, error: 'Array cannot be empty' };
            }
          } catch (error) {
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
            } else {
              transformedValue = JSON.parse(input);
              if (typeof transformedValue !== 'object' || Array.isArray(transformedValue)) {
                throw new Error('Not an object');
              }
            }
          } catch (error) {
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
      
      // Run custom validation if provided
      if (paramDef.validation && !paramDef.validation(transformedValue)) {
        return { 
          isValid: false, 
          error: 'Value does not meet validation criteria' 
        };
      }
      
      return { isValid: true, transformedValue };
      
    } catch (error) {
      return { 
        isValid: false, 
        error: `Validation error: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Get default value for parameter
   */
  private getDefaultValue(toolName: string, paramName: string, paramDef: ToolParameter): any {
    // Tool-specific defaults
    const toolDefaults: Record<string, Record<string, any>> = {
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
    
    // Check tool-specific defaults first
    if (toolDefaults[toolName] && toolDefaults[toolName][paramName] !== undefined) {
      return toolDefaults[toolName][paramName];
    }
    
    // Use examples if available
    if (paramDef.examples && paramDef.examples.length > 0) {
      return paramDef.examples[0];
    }
    
    // Use suggestions if available
    if (paramDef.suggestions && paramDef.suggestions.length > 0) {
      return paramDef.suggestions[0];
    }
    
    // Type-based defaults
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

  /**
   * Add parameter value to history for future suggestions
   */
  private addToParameterHistory(toolName: string, paramName: string, value: string): void {
    const key = `${toolName}:${paramName}`;
    
    if (!this.parameterHistory[key]) {
      this.parameterHistory[key] = [];
    }
    
    // Add to beginning, remove duplicates, keep last 10
    const history = this.parameterHistory[key];
    const filtered = history.filter(item => item !== value);
    this.parameterHistory[key] = [value, ...filtered].slice(0, 10);
  }

  /**
   * Get parameter validation hints
   */
  getValidationHints(paramDef: ToolParameter): string[] {
    const hints: string[] = [];
    
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

  /**
   * Format parameter value for display
   */
  formatParameterValue(value: any, paramDef: ToolParameter): string {
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
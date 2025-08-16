/**
 * Auto-completion Engine for Enhanced MCP Tool Explorer
 * 
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-08-15
 * 
 * Provides intelligent tab completion for tool names, parameters, and values
 * with context-aware suggestions and smart matching algorithms.
 */

import chalk from 'chalk';

interface MCPToolSchema {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, {
    type: string;
    required: boolean;
    description: string;
    suggestions?: string[];
    examples?: any[];
  }>;
}

/**
 * Auto-completion engine with intelligent suggestions
 */
export class AutoCompleter {
  private tools: Record<string, MCPToolSchema>;
  private commandHistory: string[] = [];
  private currentContext: string = '';

  constructor(tools: Record<string, MCPToolSchema>) {
    this.tools = tools;
  }

  /**
   * Main completion function for readline interface
   */
  complete(line: string): [string[], string] {
    const trimmedLine = line.trim();
    
    // Handle special commands
    if (trimmedLine.startsWith('/')) {
      return this.completeSpecialCommands(trimmedLine);
    }
    
    // Handle tool selection
    if (this.isToolSelection(trimmedLine)) {
      return this.completeToolNames(trimmedLine);
    }
    
    // Handle parameter completion
    if (this.isParameterInput(trimmedLine)) {
      return this.completeParameters(trimmedLine);
    }
    
    // Default completion
    return this.getDefaultCompletions(trimmedLine);
  }

  /**
   * Complete special commands like /favorites, /history, etc.
   */
  private completeSpecialCommands(line: string): [string[], string] {
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
    
    const partial = line.slice(1); // Remove the '/'
    const matches = specialCommands
      .filter(cmd => cmd.slice(1).startsWith(partial))
      .map(cmd => cmd.slice(1)); // Remove '/' for return value
    
    return [matches, partial];
  }

  /**
   * Complete tool names
   */
  private completeToolNames(line: string): [string[], string] {
    const toolNames = Object.keys(this.tools);
    const matches = toolNames.filter(name => 
      name.toLowerCase().includes(line.toLowerCase())
    );
    
    // Sort by relevance (exact matches first, then startsWith, then includes)
    matches.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const lineLower = line.toLowerCase();
      
      if (aLower === lineLower && bLower !== lineLower) return -1;
      if (bLower === lineLower && aLower !== lineLower) return 1;
      if (aLower.startsWith(lineLower) && !bLower.startsWith(lineLower)) return -1;
      if (bLower.startsWith(lineLower) && !aLower.startsWith(lineLower)) return 1;
      
      return a.localeCompare(b);
    });
    
    return [matches, line];
  }

  /**
   * Complete parameter values based on context
   */
  private completeParameters(line: string): [string[], string] {
    // Extract parameter name and partial value from context
    const parameterContext = this.extractParameterContext(line);
    
    if (!parameterContext) {
      return [[], line];
    }
    
    const { toolName, parameterName, partialValue } = parameterContext;
    const tool = this.tools[toolName];
    
    if (!tool || !tool.parameters[parameterName]) {
      return [[], partialValue];
    }
    
    const parameter = tool.parameters[parameterName];
    const suggestions = this.getParameterSuggestions(parameter, partialValue);
    
    return [suggestions, partialValue];
  }

  /**
   * Get parameter suggestions based on type and context
   */
  private getParameterSuggestions(parameter: any, partialValue: string): string[] {
    let suggestions: string[] = [];
    
    // Add predefined suggestions
    if (parameter.suggestions) {
      suggestions = suggestions.concat(parameter.suggestions);
    }
    
    // Add examples as suggestions
    if (parameter.examples) {
      const exampleStrings = parameter.examples
        .filter((ex: any) => typeof ex === 'string')
        .map((ex: any) => String(ex));
      suggestions = suggestions.concat(exampleStrings);
    }
    
    // Add type-specific suggestions
    switch (parameter.type) {
      case 'boolean':
        suggestions = suggestions.concat(['true', 'false', 'yes', 'no']);
        break;
        
      case 'string':
        // Already handled by predefined suggestions
        break;
        
      case 'number':
        suggestions = suggestions.concat(['1', '5', '10', '20', '50', '100']);
        break;
        
      case 'array':
        // Suggest array format examples
        suggestions = suggestions.concat(['["item1","item2"]', '["value"]']);
        break;
        
      case 'object':
        // Suggest object format examples
        suggestions = suggestions.concat(['{}', '{"key":"value"}']);
        break;
    }
    
    // Filter suggestions based on partial value
    const filtered = suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(partialValue.toLowerCase())
    );
    
    // Remove duplicates and sort
    return [...new Set(filtered)].sort();
  }

  /**
   * Extract parameter context from input
   */
  private extractParameterContext(line: string): {
    toolName: string;
    parameterName: string;
    partialValue: string;
  } | null {
    // This is a simplified implementation
    // In a real scenario, you'd track the current tool and parameter context
    // For now, we'll use the current context if available
    
    if (!this.currentContext) {
      return null;
    }
    
    // Parse the current context to extract tool and parameter info
    // This would be enhanced with proper state tracking
    const contextParts = this.currentContext.split(':');
    if (contextParts.length < 2) {
      return null;
    }
    
    return {
      toolName: contextParts[0]!,
      parameterName: contextParts[1]!,
      partialValue: line
    };
  }

  /**
   * Check if input is a tool selection
   */
  private isToolSelection(line: string): boolean {
    // Simple heuristic: if it's a number or contains tool-like keywords
    const isNumber = /^\d+$/.test(line);
    const containsToolKeywords = Object.keys(this.tools).some(tool =>
      line.toLowerCase().includes(tool.toLowerCase())
    );
    
    return !isNumber && (containsToolKeywords || line.length > 2);
  }

  /**
   * Check if input is parameter input
   */
  private isParameterInput(_line: string): boolean {
    // This would be enhanced with proper context tracking
    return this.currentContext.includes(':parameter:');
  }

  /**
   * Get default completions when no specific context
   */
  private getDefaultCompletions(_line: string): [string[], string] {
    const defaultOptions = [
      ...Object.keys(this.tools),
      '0', // Exit option
      '/help',
      '/favorites',
      '/history'
    ];
    
    const matches = defaultOptions.filter(option =>
      option.toLowerCase().includes(_line.toLowerCase())
    );
    
    return [matches, _line];
  }

  /**
   * Set current context for contextual completion
   */
  setContext(context: string): void {
    this.currentContext = context;
  }

  /**
   * Clear current context
   */
  clearContext(): void {
    this.currentContext = '';
  }

  /**
   * Add command to history for better suggestions
   */
  addToHistory(command: string): void {
    this.commandHistory.push(command);
    
    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Get smart suggestions based on usage patterns
   */
  getSmartSuggestions(toolName: string): string[] {
    const suggestions: string[] = [];
    
    // Analyze history for patterns
    const toolUsage = this.commandHistory.filter(cmd => 
      cmd.includes(toolName)
    );
    
    if (toolUsage.length > 0) {
      // Extract commonly used parameters
      const commonParams = this.extractCommonParameters(toolUsage);
      suggestions.push(...commonParams);
    }
    
    // Add tool-specific smart suggestions
    const tool = this.tools[toolName];
    if (tool) {
      // Suggest most important parameters first
      const requiredParams = Object.entries(tool.parameters)
        .filter(([_, param]) => param.required)
        .map(([name, _]) => name);
      
      suggestions.push(...requiredParams);
    }
    
    return [...new Set(suggestions)];
  }

  /**
   * Extract common parameters from usage history
   */
  private extractCommonParameters(usage: string[]): string[] {
    const paramCounts: Record<string, number> = {};
    
    usage.forEach(cmd => {
      // Simple parameter extraction (would be enhanced in real implementation)
      const matches = cmd.match(/"(\w+)":/g);
      if (matches) {
        matches.forEach(match => {
          const param = match.slice(1, -2); // Remove quotes and colon
          paramCounts[param] = (paramCounts[param] || 0) + 1;
        });
      }
    });
    
    // Return parameters sorted by frequency
    return Object.entries(paramCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([param, _]) => param)
      .slice(0, 5); // Top 5 most used
  }

  /**
   * Get category-based suggestions
   */
  getCategorySuggestions(category: string): string[] {
    return Object.values(this.tools)
      .filter(tool => tool.category === category)
      .map(tool => tool.name);
  }

  /**
   * Format completion suggestions with colors and descriptions
   */
  formatSuggestions(suggestions: string[], _context: string = ''): string {
    if (suggestions.length === 0) {
      return chalk.gray('No suggestions available');
    }
    
    const formatted = suggestions.map((suggestion, _index) => {
      const tool = this.tools[suggestion];
      if (tool) {
        return `${chalk.cyan(suggestion)} ${chalk.gray('- ' + tool.description)}`;
      }
      return chalk.cyan(suggestion);
    });
    
    return formatted.join('\n');
  }
}
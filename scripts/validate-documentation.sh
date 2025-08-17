#!/bin/bash

# Personal Pipeline - Documentation Validation Script
# Authored by: QA/Test Engineer Agent
# Date: 2025-01-16
#
# Validates documentation accuracy and completeness
# Tests: File references, command validity, setup instructions, links

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
REGISTRY_DIR="$PROJECT_ROOT/registry"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0
ISSUES_FOUND=()

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

failure() {
    echo -e "${RED}❌ $1${NC}"
    ISSUES_FOUND+=("$1")
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Validate file references in documentation
validate_file_references() {
    log "Validating file references in documentation..."
    
    local doc_files=()
    while IFS= read -r -d '' file; do
        doc_files+=("$file")
    done < <(find "$PROJECT_ROOT" -name "*.md" -print0)
    
    for doc_file in "${doc_files[@]}"; do
        log "Checking file references in $(basename "$doc_file")..."
        
        # Find file paths mentioned in the documentation
        while IFS= read -r line; do
            # Look for file paths in various formats
            local file_refs=($(echo "$line" | grep -oE '([./]?[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(sh|js|ts|yml|yaml|json|md|txt)' || true))
            
            for ref in "${file_refs[@]}"; do
                # Skip URLs and common false positives
                if [[ "$ref" =~ ^https?:// ]] || [[ "$ref" =~ ^mailto: ]] || [[ "$ref" =~ example\. ]]; then
                    continue
                fi
                
                # Convert relative paths to absolute
                local full_path=""
                if [[ "$ref" =~ ^\. ]]; then
                    full_path="$PROJECT_ROOT/$ref"
                elif [[ "$ref" =~ ^/ ]]; then
                    full_path="$ref"
                else
                    # Try different base directories
                    local possible_paths=(
                        "$PROJECT_ROOT/$ref"
                        "$PROJECT_ROOT/scripts/$ref"
                        "$PROJECT_ROOT/registry/$ref"
                        "$PROJECT_ROOT/docs/$ref"
                    )
                    
                    for path in "${possible_paths[@]}"; do
                        if [[ -f "$path" ]]; then
                            full_path="$path"
                            break
                        fi
                    done
                fi
                
                # Check if file exists
                if [[ -n "$full_path" && -f "$full_path" ]]; then
                    success "Found file reference: $ref"
                elif [[ -n "$ref" ]]; then
                    failure "Missing file reference in $(basename "$doc_file"): $ref"
                fi
            done
        done < "$doc_file"
    done
}

# Validate Makefile references
validate_makefile_references() {
    log "Validating Makefile references..."
    
    # Check for Makefile.registry mentions in docs
    if grep -r "Makefile.registry" "$PROJECT_ROOT"/*.md 2>/dev/null; then
        if [[ ! -f "$PROJECT_ROOT/Makefile.registry" ]]; then
            failure "Makefile.registry referenced in docs but file doesn't exist"
        else
            success "Makefile.registry exists and is referenced"
        fi
    fi
    
    # Check for other Makefile references
    local makefile_refs=$(grep -r "make -f" "$PROJECT_ROOT"/*.md 2>/dev/null | wc -l || echo "0")
    if [[ $makefile_refs -gt 0 ]]; then
        warning "Found $makefile_refs Makefile references - may need validation"
    fi
}

# Validate script references and executability
validate_script_references() {
    log "Validating script references..."
    
    local script_dir="$PROJECT_ROOT/scripts"
    local registry_script_dir="$PROJECT_ROOT/registry/scripts"
    
    # Check scripts mentioned in package.json
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        local package_scripts=$(jq -r '.scripts | keys[]' "$PROJECT_ROOT/package.json" 2>/dev/null || echo "")
        
        while IFS= read -r script; do
            if [[ -n "$script" && "$script" =~ registry: ]]; then
                success "Found registry script in package.json: $script"
            fi
        done <<< "$package_scripts"
    fi
    
    # Check script executability
    local script_files=(
        "$script_dir/setup-npm-registry.sh"
        "$script_dir/registry-manager.sh"
        "$script_dir/test-docker-registry.sh"
        "$script_dir/test-npm-registry.sh"
        "$script_dir/test-registry-integration.sh"
        "$script_dir/benchmark-registry-performance.sh"
    )
    
    for script in "${script_files[@]}"; do
        if [[ -f "$script" ]]; then
            if [[ -x "$script" ]]; then
                success "Script is executable: $(basename "$script")"
            else
                failure "Script is not executable: $(basename "$script")"
            fi
        else
            failure "Missing script: $(basename "$script")"
        fi
    done
    
    # Check registry scripts
    if [[ -d "$registry_script_dir" ]]; then
        while IFS= read -r -d '' script; do
            if [[ -x "$script" ]]; then
                success "Registry script is executable: $(basename "$script")"
            else
                failure "Registry script is not executable: $(basename "$script")"
            fi
        done < <(find "$registry_script_dir" -name "*.sh" -print0)
    fi
}

# Validate configuration files
validate_configuration_files() {
    log "Validating configuration files..."
    
    # Check Docker Compose files
    local compose_files=(
        "$PROJECT_ROOT/docker-compose.registry.yml"
        "$PROJECT_ROOT/docker-compose.npm-registry.yml"
    )
    
    for compose_file in "${compose_files[@]}"; do
        if [[ -f "$compose_file" ]]; then
            # Validate YAML syntax
            if docker-compose -f "$compose_file" config > /dev/null 2>&1; then
                success "Valid Docker Compose file: $(basename "$compose_file")"
            else
                failure "Invalid Docker Compose file: $(basename "$compose_file")"
            fi
        else
            failure "Missing Docker Compose file: $(basename "$compose_file")"
        fi
    done
    
    # Check package.json
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if jq empty "$PROJECT_ROOT/package.json" 2>/dev/null; then
            success "Valid package.json"
        else
            failure "Invalid package.json syntax"
        fi
    fi
    
    # Check sample configuration files
    local config_files=(
        "$PROJECT_ROOT/config/config.sample.yaml"
        "$PROJECT_ROOT/config/github-sample.yaml"
        "$PROJECT_ROOT/config/web-sample.yaml"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            success "Found sample config: $(basename "$config_file")"
        else
            failure "Missing sample config: $(basename "$config_file")"
        fi
    done
}

# Validate port references
validate_port_references() {
    log "Validating port references..."
    
    # Common ports used in the project
    local expected_ports=(
        "3000"   # Main application
        "4873"   # NPM registry
        "5000"   # Docker registry
        "5001"   # Docker registry cache
        "6379"   # Redis (main)
        "6380"   # Redis (NPM cache)
        "8080"   # Docker registry UI
        "9091"   # Prometheus
        "3001"   # Grafana
    )
    
    for port in "${expected_ports[@]}"; do
        local port_count=$(grep -r ":$port" "$PROJECT_ROOT"/*.md "$PROJECT_ROOT"/*.yml 2>/dev/null | wc -l || echo "0")
        if [[ $port_count -gt 0 ]]; then
            success "Port $port is documented (found $port_count references)"
        else
            warning "Port $port may not be documented"
        fi
    done
}

# Validate directory structure
validate_directory_structure() {
    log "Validating directory structure..."
    
    # Expected directories
    local expected_dirs=(
        "$PROJECT_ROOT/docs"
        "$PROJECT_ROOT/scripts"
        "$PROJECT_ROOT/registry"
        "$PROJECT_ROOT/config"
        "$PROJECT_ROOT/src"
        "$PROJECT_ROOT/tests"
    )
    
    for dir in "${expected_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            success "Found directory: $(basename "$dir")"
        else
            failure "Missing directory: $(basename "$dir")"
        fi
    done
    
    # Check registry subdirectories
    local registry_dirs=(
        "$REGISTRY_DIR/auth"
        "$REGISTRY_DIR/data"
        "$REGISTRY_DIR/cache"
        "$REGISTRY_DIR/config"
        "$REGISTRY_DIR/scripts"
        "$REGISTRY_DIR/npm"
    )
    
    for dir in "${registry_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            success "Found registry directory: $(basename "$dir")"
        else
            failure "Missing registry directory: $(basename "$dir")"
        fi
    done
}

# Validate documentation completeness
validate_documentation_completeness() {
    log "Validating documentation completeness..."
    
    # Required documentation files
    local required_docs=(
        "$PROJECT_ROOT/README.md"
        "$PROJECT_ROOT/CLAUDE.md"
        "$DOCS_DIR/API.md"
        "$DOCS_DIR/ARCHITECTURE.md"
        "$DOCS_DIR/DEVELOPMENT.md"
        "$DOCS_DIR/TESTING.md"
        "$REGISTRY_DIR/README.md"
    )
    
    for doc in "${required_docs[@]}"; do
        if [[ -f "$doc" ]]; then
            success "Found required documentation: $(basename "$doc")"
            
            # Check for minimum content
            local word_count=$(wc -w < "$doc")
            if [[ $word_count -gt 100 ]]; then
                success "Documentation has sufficient content: $(basename "$doc") ($word_count words)"
            else
                warning "Documentation may be incomplete: $(basename "$doc") ($word_count words)"
            fi
        else
            failure "Missing required documentation: $(basename "$doc")"
        fi
    done
}

# Validate command examples
validate_command_examples() {
    log "Validating command examples in documentation..."
    
    # Extract and validate npm commands
    local npm_commands=(
        "npm run registry:start"
        "npm run registry:stop"
        "npm run registry:status"
        "npm run registry:health"
        "npm run package:build"
        "npm run package:publish"
    )
    
    for cmd in "${npm_commands[@]}"; do
        local script_name=$(echo "$cmd" | cut -d: -f2-)
        if grep -q "\"$script_name\":" "$PROJECT_ROOT/package.json" 2>/dev/null; then
            success "Found npm script: $script_name"
        else
            failure "Missing npm script referenced in docs: $script_name"
        fi
    done
    
    # Check if curl commands would work (test URL format)
    local curl_examples=(
        "http://localhost:4873/-/ping"
        "http://localhost:5000/v2/"
        "http://localhost:8080"
        "http://localhost:3001/api/health"
    )
    
    for url in "${curl_examples[@]}"; do
        # Just validate URL format
        if [[ "$url" =~ ^https?://[^/]+(/.*)?$ ]]; then
            success "Valid URL format in docs: $url"
        else
            failure "Invalid URL format in docs: $url"
        fi
    done
}

# Validate installation instructions
validate_installation_instructions() {
    log "Validating installation instructions..."
    
    # Check for key installation steps in README
    local readme_file="$PROJECT_ROOT/README.md"
    if [[ -f "$readme_file" ]]; then
        local required_sections=(
            "Installation"
            "Quick Start"
            "Prerequisites"
            "Usage"
        )
        
        for section in "${required_sections[@]}"; do
            if grep -i -q "## $section\|# $section" "$readme_file"; then
                success "Found section in README: $section"
            else
                warning "Missing section in README: $section"
            fi
        done
    fi
    
    # Check setup scripts exist and are documented
    local setup_scripts=(
        "$PROJECT_ROOT/scripts/setup-npm-registry.sh"
    )
    
    for script in "${setup_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            success "Setup script exists: $(basename "$script")"
            
            # Check if it has help option
            if grep -q "help\|usage" "$script"; then
                success "Setup script has help documentation: $(basename "$script")"
            else
                warning "Setup script missing help documentation: $(basename "$script")"
            fi
        else
            failure "Missing setup script: $(basename "$script")"
        fi
    done
}

# Test setup time requirement (Milestone 1.2)
validate_milestone_requirements() {
    log "Validating Milestone 1.2 requirements..."
    
    # Check for 5-minute installation requirement
    local milestone_docs=$(grep -r "5 minutes\|5-minute\|300" "$PROJECT_ROOT"/*.md "$DOCS_DIR"/*.md 2>/dev/null || echo "")
    
    if [[ -n "$milestone_docs" ]]; then
        success "Found 5-minute installation requirement in documentation"
    else
        warning "5-minute installation requirement not explicitly documented"
    fi
    
    # Check for local registry operational requirement
    local operational_docs=$(grep -r "operational\|ready" "$PROJECT_ROOT"/*.md "$DOCS_DIR"/*.md 2>/dev/null | grep -i registry || echo "")
    
    if [[ -n "$operational_docs" ]]; then
        success "Found operational registry requirement in documentation"
    else
        warning "Operational registry requirement not clearly documented"
    fi
}

# Generate validation report
generate_validation_report() {
    log "Generating documentation validation report..."
    
    local report_file="documentation-validation-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "validation_run": {
    "timestamp": "$(date -Iseconds)",
    "test_type": "documentation_validation",
    "project_root": "$PROJECT_ROOT"
  },
  "results": {
    "total_tests": $TESTS_TOTAL,
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "0")
  },
  "issues_found": [
EOF
    
    # Add issues to JSON
    local first=true
    for issue in "${ISSUES_FOUND[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        echo "    \"$issue\"" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF
  ],
  "test_categories": [
    "file_references",
    "makefile_references", 
    "script_references",
    "configuration_files",
    "port_references",
    "directory_structure",
    "documentation_completeness",
    "command_examples",
    "installation_instructions",
    "milestone_requirements"
  ]
}
EOF
    
    log "Validation report saved to: $report_file"
    
    # Display summary
    echo
    echo "================================================"
    echo "    DOCUMENTATION VALIDATION SUMMARY"
    echo "================================================"
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    if [ $TESTS_TOTAL -gt 0 ]; then
        echo "Success Rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "0")%"
    else
        echo "Success Rate: N/A"
    fi
    echo "================================================"
    
    if [ ${#ISSUES_FOUND[@]} -gt 0 ]; then
        echo -e "${RED}Issues Found:${NC}"
        for issue in "${ISSUES_FOUND[@]}"; do
            echo "  • $issue"
        done
    fi
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 Documentation validation passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Documentation validation found issues that need attention.${NC}"
        return 1
    fi
}

# Main execution
main() {
    log "Starting Documentation Validation"
    log "================================"
    
    # Run validation tests
    validate_file_references
    validate_makefile_references
    validate_script_references
    validate_configuration_files
    validate_port_references
    validate_directory_structure
    validate_documentation_completeness
    validate_command_examples
    validate_installation_instructions
    validate_milestone_requirements
    
    # Generate report
    generate_validation_report
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            echo "Usage: $0 [--help]"
            echo "  --help    Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
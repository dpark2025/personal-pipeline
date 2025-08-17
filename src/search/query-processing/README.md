# Intelligent Query Processing System

**Production-grade query processing layer for Personal Pipeline's search intelligence**

## Overview

The intelligent query processing system transforms natural language queries into optimized search operations through:

- **Intent Classification** - ML-based recognition of operational scenarios (>90% accuracy)
- **Context Enhancement** - Domain knowledge expansion and query enrichment  
- **Search Optimization** - Strategy selection based on intent and context
- **Operational Intelligence** - Incident response patterns and workflows
- **Performance Monitoring** - Real-time analytics and optimization

## Performance Targets ✅

- **Query Processing**: <50ms for 95% of queries
- **Intent Accuracy**: >90% for operational scenarios  
- **Relevance Improvement**: >30% over basic search
- **Memory Footprint**: <100MB additional overhead

## Quick Start

```typescript
import { QueryProcessor, QueryContext } from '@/search/query-processing';

const processor = new QueryProcessor();
await processor.initialize();

const processedQuery = await processor.processQuery(
  "urgent: database outage affecting payments",
  { 
    urgent: true, 
    severity: 'critical', 
    systems: ['database', 'payment'] 
  }
);

console.log(processedQuery.intent.intent); // EMERGENCY_RESPONSE
console.log(processedQuery.strategy.approach); // exact_match
```

## Intent Types

| Intent Type | Description | Example Query |
|-------------|-------------|---------------|
| `EMERGENCY_RESPONSE` | Critical incident response | "immediate response for service outage" |
| `FIND_RUNBOOK` | Operational runbook lookup | "runbook for disk space alert" |
| `ESCALATION_PATH` | Contact and escalation info | "who to contact for critical issue" |
| `GET_PROCEDURE` | Step-by-step instructions | "steps to restart nginx service" |
| `TROUBLESHOOT` | Debugging and investigation | "debug network connectivity problems" |
| `STATUS_CHECK` | System health monitoring | "check database performance status" |
| `CONFIGURATION` | Setup and configuration | "configure SSL certificate renewal" |
| `GENERAL_SEARCH` | General documentation search | "API documentation for authentication" |

## Components

### QueryProcessor
**Core orchestration** - Coordinates all query processing components
- Sub-50ms processing target
- Parallel and sequential processing modes
- Comprehensive error handling and fallbacks

### IntentClassifier  
**ML-based intent recognition** - Pattern matching with >90% accuracy
- 15 operational patterns with priority ranking
- Context-aware entity extraction
- Real-time confidence scoring

### ContextEnhancer
**Query expansion** - Domain knowledge and synonym integration
- 15 synonym groups for operational terms
- Context injection from organizational patterns
- Operational keyword extraction

### QueryOptimizer
**Search strategy selection** - Intent-driven optimization
- 9 strategy rules with condition matching
- Adaptive weight adjustments
- Time constraint optimization

### OperationalIntelligence
**Domain expertise** - Incident response and organizational patterns
- 3 incident response flows
- 5 operational patterns
- Business context integration

### PerformanceMonitor
**Real-time analytics** - Processing metrics and optimization
- Performance snapshot tracking
- Alert generation for degradation
- Comprehensive caching with TTL

## Demo Scripts

```bash
# Quick demonstration
npm run demo-query-processing

# Comprehensive validation
npm run validate-query-processing

# Performance testing only
npm run validate-query-processing:performance
```

## Architecture

```
Natural Language Query
        ↓
┌─────────────────┐
│ Intent         │ ← Pattern matching, entity extraction
│ Classifier     │   >90% accuracy for operational scenarios
└─────────────────┘
        ↓
┌─────────────────┐  
│ Context        │ ← Domain knowledge, synonym expansion
│ Enhancer       │   Operational keywords, context injection
└─────────────────┘
        ↓
┌─────────────────┐
│ Query          │ ← Strategy selection, weight optimization
│ Optimizer       │   Time constraints, filter preferences  
└─────────────────┘
        ↓
┌─────────────────┐
│ Operational    │ ← Incident flows, organizational context
│ Intelligence   │   Business rules, escalation patterns
└─────────────────┘
        ↓
Enhanced Search Parameters
```

## Performance Monitoring

The system provides comprehensive performance analytics:

- **Processing Time Tracking** - P50, P95, P99 percentiles
- **Intent Accuracy Monitoring** - Confidence distribution analysis  
- **Cache Performance** - Hit rates and optimization metrics
- **Resource Usage** - Memory and CPU monitoring
- **Quality Gates** - Automated threshold alerts

## Configuration

```typescript
const config = {
  intentClassification: {
    confidenceThreshold: 0.8,
    enableMultiIntent: true,
    fallbackToGeneral: true,
  },
  queryEnhancement: {
    maxExpansions: 10,
    enableSynonyms: true,
    enableContextInjection: true,
  },
  performance: {
    targetProcessingTime: 50, // ms
    enableCaching: true,
    enableParallelProcessing: true,
  },
};
```

## Operational Patterns

Pre-built patterns for common operational scenarios:

- **Disk Space Alerts** - File system monitoring and cleanup
- **Memory Leak Investigation** - Application profiling and analysis
- **Database Connection Issues** - Network and pool diagnostics
- **Deployment Rollback** - Release management procedures
- **SSL Certificate Expiry** - Certificate renewal workflows

## Integration

The query processing system integrates seamlessly with:

- **Semantic Search Engine** - Enhanced queries for better relevance
- **MCP Tools** - Native protocol support for tool orchestration
- **REST API** - HTTP endpoints for external integration
- **Performance Monitoring** - Real-time metrics and alerting

Built by the AI/ML Engineering team for enterprise operations intelligence.
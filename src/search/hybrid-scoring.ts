/**
 * Hybrid Scoring Algorithm - Intelligent combination of semantic + fuzzy + metadata scores
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Advanced scoring algorithm that combines semantic similarity, fuzzy text matching,
 * and metadata relevance to provide optimal search results with confidence scoring.
 */

import { SearchResult, SearchFilters } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';

interface ScoringWeights {
  semantic: number;
  fuzzy: number;
  metadata: number;
}

interface FuzzySearchResult {
  item: SearchResult;
  score?: number;
}

interface ScoredResult extends SearchResult {
  scoring_details: {
    semantic_score: number;
    fuzzy_score: number;
    metadata_score: number;
    final_score: number;
    boost_factors: string[];
  };
}

interface ScoringMetrics {
  totalScorings: number;
  avgScoringTime: number;
  semanticContribution: number;
  fuzzyContribution: number;
  metadataContribution: number;
}

/**
 * Advanced hybrid scoring algorithm for optimal search relevance
 */
export class HybridScoringAlgorithm {
  private weights: ScoringWeights;
  private metrics: ScoringMetrics;

  // Scoring configuration constants
  private readonly EXACT_MATCH_BOOST = 1.5;
  private readonly TITLE_MATCH_BOOST = 1.3;
  private readonly RECENT_DOC_BOOST = 1.2;
  private readonly CATEGORY_MATCH_BOOST = 1.1;
  private readonly MIN_SEMANTIC_THRESHOLD = 0.1;
  private readonly MIN_FUZZY_THRESHOLD = 0.2;

  constructor(weights: ScoringWeights) {
    this.weights = this.normalizeWeights(weights);
    this.metrics = {
      totalScorings: 0,
      avgScoringTime: 0,
      semanticContribution: 0,
      fuzzyContribution: 0,
      metadataContribution: 0,
    };

    logger.info('HybridScoringAlgorithm initialized', {
      weights: this.weights,
    });
  }

  /**
   * Combine semantic, fuzzy, and metadata scores for optimal results
   */
  async combineResults(
    _query: string,
    documents: SearchResult[],
    semanticScores: Map<string, number>,
    fuzzyResults: FuzzySearchResult[],
    filters?: SearchFilters
  ): Promise<ScoredResult[]> {
    const startTime = performance.now();

    try {
      logger.debug('Starting hybrid scoring combination', {
        documentsCount: documents.length,
        semanticScoresCount: semanticScores.size,
        fuzzyResultsCount: fuzzyResults.length,
      });

      // Create fuzzy score map for efficient lookup
      const fuzzyScoreMap = new Map<string, number>();
      fuzzyResults.forEach(result => {
        const score = result.score ? Math.max(0, 1 - result.score) : 0; // Convert to 0-1 range
        fuzzyScoreMap.set(result.item.id, score);
      });

      // Score all documents
      const scoredResults: ScoredResult[] = [];
      
      for (const document of documents) {
        const semanticScore = semanticScores.get(document.id) || 0;
        const fuzzyScore = fuzzyScoreMap.get(document.id) || 0;
        
        // Skip documents below minimum thresholds
        if (semanticScore < this.MIN_SEMANTIC_THRESHOLD && fuzzyScore < this.MIN_FUZZY_THRESHOLD) {
          continue;
        }

        const metadataScore = this.calculateMetadataScore(document, _query, filters);
        const { finalScore, boostFactors } = this.calculateFinalScore(
          document,
          _query,
          semanticScore,
          fuzzyScore,
          metadataScore
        );

        const scoredResult: ScoredResult = {
          ...document,
          confidence_score: finalScore,
          scoring_details: {
            semantic_score: semanticScore,
            fuzzy_score: fuzzyScore,
            metadata_score: metadataScore,
            final_score: finalScore,
            boost_factors: boostFactors,
          },
        };

        scoredResults.push(scoredResult);
      }

      // Sort by final score descending
      scoredResults.sort((a, b) => b.confidence_score - a.confidence_score);

      const scoringTime = performance.now() - startTime;
      this.updateMetrics(scoringTime, scoredResults);

      logger.debug('Hybrid scoring completed', {
        inputDocuments: documents.length,
        scoredResults: scoredResults.length,
        scoringTime: `${scoringTime.toFixed(2)}ms`,
        topScore: scoredResults[0]?.confidence_score || 0,
      });

      return scoredResults;
    } catch (error) {
      logger.error('Hybrid scoring failed', { error });
      throw new Error(`Hybrid scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate metadata-based relevance score
   */
  private calculateMetadataScore(
    document: SearchResult,
    _query: string,
    filters?: SearchFilters
  ): number {
    let score = 0.5; // Base score
    const maxScore = 1.0;

    // Category relevance
    if (filters?.categories?.includes(document.category || '')) {
      score += 0.2;
    }

    // Source preference (higher priority sources get higher scores)
    if (document.metadata?.priority) {
      const priority = Number(document.metadata.priority);
      if (priority >= 1 && priority <= 5) {
        score += (6 - priority) * 0.1; // Higher priority = higher score
      }
    }

    // Recency boost (more recent documents get higher scores)
    const docAge = this.calculateDocumentAge(document.last_updated);
    if (docAge <= 7) { // Within a week
      score += 0.15;
    } else if (docAge <= 30) { // Within a month
      score += 0.1;
    } else if (docAge <= 90) { // Within 3 months
      score += 0.05;
    }

    // Success rate boost (for runbooks and procedures)
    if (document.metadata?.success_rate) {
      const successRate = Number(document.metadata.success_rate);
      if (successRate >= 0 && successRate <= 1) {
        score += successRate * 0.2;
      }
    }

    // Document length preference (not too short, not too long)
    const contentLength = document.content.length;
    if (contentLength >= 100 && contentLength <= 5000) {
      score += 0.1;
    } else if (contentLength > 5000 && contentLength <= 10000) {
      score += 0.05;
    }

    // Ensure score is within valid range
    return Math.min(score, maxScore);
  }

  /**
   * Calculate final weighted score with boost factors
   */
  private calculateFinalScore(
    document: SearchResult,
    query: string,
    semanticScore: number,
    fuzzyScore: number,
    metadataScore: number
  ): { finalScore: number; boostFactors: string[] } {
    // Base weighted score
    let finalScore = (
      semanticScore * this.weights.semantic +
      fuzzyScore * this.weights.fuzzy +
      metadataScore * this.weights.metadata
    );

    const boostFactors: string[] = [];

    // Apply boost factors
    const queryLower = query.toLowerCase();
    const titleLower = document.title.toLowerCase();
    const contentLower = document.content.toLowerCase();

    // Exact match in title (highest boost)
    if (titleLower.includes(queryLower)) {
      finalScore *= this.EXACT_MATCH_BOOST;
      boostFactors.push('title_match');
    }

    // Exact match in content
    if (contentLower.includes(queryLower)) {
      finalScore *= this.TITLE_MATCH_BOOST;
      boostFactors.push('content_match');
    }

    // Recent document boost
    const docAge = this.calculateDocumentAge(document.last_updated);
    if (docAge <= 7) {
      finalScore *= this.RECENT_DOC_BOOST;
      boostFactors.push('recent_document');
    }

    // Category match boost
    if (document.category === 'runbook' && (queryLower.includes('runbook') || queryLower.includes('procedure'))) {
      finalScore *= this.CATEGORY_MATCH_BOOST;
      boostFactors.push('category_match');
    }

    // High confidence existing score boost
    if (document.confidence_score >= 0.8) {
      finalScore *= 1.1;
      boostFactors.push('high_confidence');
    }

    // Ensure final score is within valid range [0, 1]
    finalScore = Math.min(Math.max(finalScore, 0), 1);

    return { finalScore, boostFactors };
  }

  /**
   * Get scoring performance metrics
   */
  getMetrics(): ScoringMetrics {
    return { ...this.metrics };
  }

  /**
   * Update scoring weights
   */
  updateWeights(weights: Partial<ScoringWeights>): void {
    this.weights = this.normalizeWeights({ ...this.weights, ...weights });
    logger.info('Scoring weights updated', { weights: this.weights });
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalScorings: 0,
      avgScoringTime: 0,
      semanticContribution: 0,
      fuzzyContribution: 0,
      metadataContribution: 0,
    };
  }

  /**
   * Analyze scoring distribution for optimization insights
   */
  analyzeScoring(results: ScoredResult[]): {
    semanticDominant: number;
    fuzzyDominant: number;
    metadataDominant: number;
    balanced: number;
  } {
    let semanticDominant = 0;
    let fuzzyDominant = 0;
    let metadataDominant = 0;
    let balanced = 0;

    for (const result of results) {
      const { semantic_score, fuzzy_score, metadata_score } = result.scoring_details;
      const max = Math.max(semantic_score, fuzzy_score, metadata_score);
      const diff = max - Math.min(semantic_score, fuzzy_score, metadata_score);

      if (diff < 0.2) {
        balanced++;
      } else if (semantic_score === max) {
        semanticDominant++;
      } else if (fuzzy_score === max) {
        fuzzyDominant++;
      } else {
        metadataDominant++;
      }
    }

    return {
      semanticDominant: semanticDominant / results.length,
      fuzzyDominant: fuzzyDominant / results.length,
      metadataDominant: metadataDominant / results.length,
      balanced: balanced / results.length,
    };
  }

  // Private helper methods

  private normalizeWeights(weights: ScoringWeights): ScoringWeights {
    const total = weights.semantic + weights.fuzzy + weights.metadata;
    
    if (total === 0) {
      throw new Error('Sum of scoring weights cannot be zero');
    }

    return {
      semantic: weights.semantic / total,
      fuzzy: weights.fuzzy / total,
      metadata: weights.metadata / total,
    };
  }

  private calculateDocumentAge(lastUpdated: string): number {
    try {
      const docDate = new Date(lastUpdated);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - docDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
    } catch (error) {
      logger.warn('Failed to calculate document age', { lastUpdated, error });
      return 365; // Assume old document if date parsing fails
    }
  }

  private updateMetrics(scoringTime: number, results: ScoredResult[]): void {
    // Update timing metrics
    const currentAvg = this.metrics.avgScoringTime;
    const count = this.metrics.totalScorings + 1;
    this.metrics.avgScoringTime = (currentAvg * this.metrics.totalScorings + scoringTime) / count;
    this.metrics.totalScorings = count;

    // Update contribution metrics
    if (results.length > 0) {
      const avgSemanticScore = results.reduce((sum, r) => sum + r.scoring_details.semantic_score, 0) / results.length;
      const avgFuzzyScore = results.reduce((sum, r) => sum + r.scoring_details.fuzzy_score, 0) / results.length;
      const avgMetadataScore = results.reduce((sum, r) => sum + r.scoring_details.metadata_score, 0) / results.length;

      this.metrics.semanticContribution = (this.metrics.semanticContribution + avgSemanticScore) / 2;
      this.metrics.fuzzyContribution = (this.metrics.fuzzyContribution + avgFuzzyScore) / 2;
      this.metrics.metadataContribution = (this.metrics.metadataContribution + avgMetadataScore) / 2;
    }
  }
}
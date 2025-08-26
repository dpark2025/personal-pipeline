import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';
export class HybridScoringAlgorithm {
    weights;
    metrics;
    EXACT_MATCH_BOOST = 1.5;
    TITLE_MATCH_BOOST = 1.3;
    RECENT_DOC_BOOST = 1.2;
    CATEGORY_MATCH_BOOST = 1.1;
    MIN_SEMANTIC_THRESHOLD = 0.1;
    MIN_FUZZY_THRESHOLD = 0.2;
    constructor(weights) {
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
    async combineResults(_query, documents, semanticScores, fuzzyResults, filters) {
        const startTime = performance.now();
        try {
            logger.debug('Starting hybrid scoring combination', {
                documentsCount: documents.length,
                semanticScoresCount: semanticScores.size,
                fuzzyResultsCount: fuzzyResults.length,
            });
            const fuzzyScoreMap = new Map();
            fuzzyResults.forEach(result => {
                const score = result.score ? Math.max(0, 1 - result.score) : 0;
                fuzzyScoreMap.set(result.item.id, score);
            });
            const scoredResults = [];
            for (const document of documents) {
                const semanticScore = semanticScores.get(document.id) || 0;
                const fuzzyScore = fuzzyScoreMap.get(document.id) || 0;
                if (semanticScore < this.MIN_SEMANTIC_THRESHOLD && fuzzyScore < this.MIN_FUZZY_THRESHOLD) {
                    continue;
                }
                const metadataScore = this.calculateMetadataScore(document, _query, filters);
                const { finalScore, boostFactors } = this.calculateFinalScore(document, _query, semanticScore, fuzzyScore, metadataScore);
                const scoredResult = {
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
        }
        catch (error) {
            logger.error('Hybrid scoring failed', { error });
            throw new Error(`Hybrid scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    calculateMetadataScore(document, _query, filters) {
        let score = 0.5;
        const maxScore = 1.0;
        if (filters?.categories?.includes(document.category || '')) {
            score += 0.2;
        }
        if (document.metadata?.priority) {
            const priority = Number(document.metadata.priority);
            if (priority >= 1 && priority <= 5) {
                score += (6 - priority) * 0.1;
            }
        }
        const docAge = this.calculateDocumentAge(document.last_updated);
        if (docAge <= 7) {
            score += 0.15;
        }
        else if (docAge <= 30) {
            score += 0.1;
        }
        else if (docAge <= 90) {
            score += 0.05;
        }
        if (document.metadata?.success_rate) {
            const successRate = Number(document.metadata.success_rate);
            if (successRate >= 0 && successRate <= 1) {
                score += successRate * 0.2;
            }
        }
        const contentLength = document.content.length;
        if (contentLength >= 100 && contentLength <= 5000) {
            score += 0.1;
        }
        else if (contentLength > 5000 && contentLength <= 10000) {
            score += 0.05;
        }
        return Math.min(score, maxScore);
    }
    calculateFinalScore(document, query, semanticScore, fuzzyScore, metadataScore) {
        let finalScore = (semanticScore * this.weights.semantic +
            fuzzyScore * this.weights.fuzzy +
            metadataScore * this.weights.metadata);
        const boostFactors = [];
        const queryLower = query.toLowerCase();
        const titleLower = document.title.toLowerCase();
        const contentLower = document.content.toLowerCase();
        if (titleLower.includes(queryLower)) {
            finalScore *= this.EXACT_MATCH_BOOST;
            boostFactors.push('title_match');
        }
        if (contentLower.includes(queryLower)) {
            finalScore *= this.TITLE_MATCH_BOOST;
            boostFactors.push('content_match');
        }
        const docAge = this.calculateDocumentAge(document.last_updated);
        if (docAge <= 7) {
            finalScore *= this.RECENT_DOC_BOOST;
            boostFactors.push('recent_document');
        }
        if (document.category === 'runbook' && (queryLower.includes('runbook') || queryLower.includes('procedure'))) {
            finalScore *= this.CATEGORY_MATCH_BOOST;
            boostFactors.push('category_match');
        }
        if (document.confidence_score >= 0.8) {
            finalScore *= 1.1;
            boostFactors.push('high_confidence');
        }
        finalScore = Math.min(Math.max(finalScore, 0), 1);
        return { finalScore, boostFactors };
    }
    getMetrics() {
        return { ...this.metrics };
    }
    updateWeights(weights) {
        this.weights = this.normalizeWeights({ ...this.weights, ...weights });
        logger.info('Scoring weights updated', { weights: this.weights });
    }
    resetMetrics() {
        this.metrics = {
            totalScorings: 0,
            avgScoringTime: 0,
            semanticContribution: 0,
            fuzzyContribution: 0,
            metadataContribution: 0,
        };
    }
    analyzeScoring(results) {
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
            }
            else if (semantic_score === max) {
                semanticDominant++;
            }
            else if (fuzzy_score === max) {
                fuzzyDominant++;
            }
            else {
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
    normalizeWeights(weights) {
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
    calculateDocumentAge(lastUpdated) {
        try {
            const docDate = new Date(lastUpdated);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - docDate.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        catch (error) {
            logger.warn('Failed to calculate document age', { lastUpdated, error });
            return 365;
        }
    }
    updateMetrics(scoringTime, results) {
        const currentAvg = this.metrics.avgScoringTime;
        const count = this.metrics.totalScorings + 1;
        this.metrics.avgScoringTime = (currentAvg * this.metrics.totalScorings + scoringTime) / count;
        this.metrics.totalScorings = count;
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
//# sourceMappingURL=hybrid-scoring.js.map
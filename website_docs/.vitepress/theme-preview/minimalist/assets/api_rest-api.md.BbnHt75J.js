import{_ as n,c as a,o as l,ag as p}from"./chunks/framework.DV2-evBA.js";const E=JSON.parse('{"title":"REST API Reference","description":"","frontmatter":{},"headers":[],"relativePath":"api/rest-api.md","filePath":"api/rest-api.md"}'),o={name:"api/rest-api.md"};function e(t,s,c,r,i,y){return l(),a("div",null,s[0]||(s[0]=[p(`<h1 id="rest-api-reference" tabindex="-1">REST API Reference <a class="header-anchor" href="#rest-api-reference" aria-label="Permalink to &quot;REST API Reference&quot;">​</a></h1><p>Personal Pipeline provides 11 REST API endpoints for flexible integration with web applications, scripts, and external systems alongside the native MCP protocol.</p><h2 id="overview" tabindex="-1">Overview <a class="header-anchor" href="#overview" aria-label="Permalink to &quot;Overview&quot;">​</a></h2><p>The REST API offers the same functionality as the MCP tools but through standard HTTP endpoints, making it accessible to any system that can make HTTP requests.</p><h3 id="base-url" tabindex="-1">Base URL <a class="header-anchor" href="#base-url" aria-label="Permalink to &quot;Base URL&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>http://localhost:3000/api</span></span></code></pre></div><h3 id="response-format" tabindex="-1">Response Format <a class="header-anchor" href="#response-format" aria-label="Permalink to &quot;Response Format&quot;">​</a></h3><p>All endpoints return JSON responses with consistent structure:</p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: boolean;</span></span>
<span class="line"><span style="color:#24292E;">  data</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> any;                </span><span style="color:#6A737D;">// Response data (on success)</span></span>
<span class="line"><span style="color:#24292E;">  error</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {                  </span><span style="color:#6A737D;">// Error details (on failure)</span></span>
<span class="line"><span style="color:#24292E;">    code: string;</span></span>
<span class="line"><span style="color:#24292E;">    message: string;</span></span>
<span class="line"><span style="color:#24292E;">    details</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> object;</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#6F42C1;">  meta</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    timestamp</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    request_id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    response_time_ms</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h2 id="search-endpoints" tabindex="-1">Search Endpoints <a class="header-anchor" href="#search-endpoints" aria-label="Permalink to &quot;Search Endpoints&quot;">​</a></h2><h3 id="post-api-search" tabindex="-1">POST /api/search <a class="header-anchor" href="#post-api-search" aria-label="Permalink to &quot;POST /api/search&quot;">​</a></h3><p>General documentation search across all sources.</p><p><strong>Request Body:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  query</span><span style="color:#24292E;">: string;              </span><span style="color:#6A737D;">// Search query</span></span>
<span class="line"><span style="color:#24292E;">  sources</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];         </span><span style="color:#6A737D;">// Specific sources to search</span></span>
<span class="line"><span style="color:#24292E;">  document_types</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];  </span><span style="color:#6A737D;">// Filter by document type</span></span>
<span class="line"><span style="color:#24292E;">  limit</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;            </span><span style="color:#6A737D;">// Max results (default: 10, max: 50)</span></span>
<span class="line"><span style="color:#24292E;">  include_content</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> boolean;  </span><span style="color:#6A737D;">// Include full content (default: false)</span></span>
<span class="line"><span style="color:#24292E;">  filters</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {                </span><span style="color:#6A737D;">// Additional filters</span></span>
<span class="line"><span style="color:#24292E;">    tags?: string[];</span></span>
<span class="line"><span style="color:#24292E;">    date_range</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">      start?: string;        </span><span style="color:#6A737D;">// ISO date string</span></span>
<span class="line"><span style="color:#24292E;">      end</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    author</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    results</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">      id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      content</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;        </span><span style="color:#6A737D;">// If include_content = true</span></span>
<span class="line"><span style="color:#E36209;">      excerpt</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;         </span><span style="color:#6A737D;">// Short excerpt with highlights</span></span>
<span class="line"><span style="color:#E36209;">      source</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      document_type</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      last_updated</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      confidence_score</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">; </span><span style="color:#6A737D;">// 0.0-1.0</span></span>
<span class="line"><span style="color:#E36209;">      match_highlights</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">      metadata</span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        author</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        tags</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">        url</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">    total_results</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">    query_suggestions</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">    facets</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">      sources: Record</span><span style="color:#D73A49;">&lt;</span><span style="color:#24292E;">string, number&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      document_types: Record</span><span style="color:#D73A49;">&lt;</span><span style="color:#24292E;">string, number&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      tags: Record</span><span style="color:#D73A49;">&lt;</span><span style="color:#24292E;">string, number&gt;;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  },</span></span>
<span class="line"><span style="color:#6F42C1;">  meta</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    timestamp</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;2025-08-16T10:30:00.000Z&quot;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">    request_id</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;req_abc123&quot;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">    response_time_ms</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">45</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p><strong>Example:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> POST</span><span style="color:#032F62;"> http://localhost:3000/api/search</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;Content-Type: application/json&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -d</span><span style="color:#032F62;"> &#39;{</span></span>
<span class="line"><span style="color:#032F62;">    &quot;query&quot;: &quot;disk space cleanup&quot;,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;limit&quot;: 5,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;include_content&quot;: false,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;filters&quot;: {</span></span>
<span class="line"><span style="color:#032F62;">      &quot;tags&quot;: [&quot;runbook&quot;, &quot;maintenance&quot;],</span></span>
<span class="line"><span style="color:#032F62;">      &quot;date_range&quot;: {</span></span>
<span class="line"><span style="color:#032F62;">        &quot;start&quot;: &quot;2024-01-01&quot;</span></span>
<span class="line"><span style="color:#032F62;">      }</span></span>
<span class="line"><span style="color:#032F62;">    }</span></span>
<span class="line"><span style="color:#032F62;">  }&#39;</span></span></code></pre></div><h3 id="post-api-runbooks-search" tabindex="-1">POST /api/runbooks/search <a class="header-anchor" href="#post-api-runbooks-search" aria-label="Permalink to &quot;POST /api/runbooks/search&quot;">​</a></h3><p>Search runbooks by alert characteristics.</p><p><strong>Request Body:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  alert_type</span><span style="color:#24292E;">: string;           </span><span style="color:#6A737D;">// Type of alert</span></span>
<span class="line"><span style="color:#6F42C1;">  severity</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;low&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;medium&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;high&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;critical&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">  affected_systems</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];  </span><span style="color:#6A737D;">// Systems experiencing issues</span></span>
<span class="line"><span style="color:#24292E;">  error_message</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;      </span><span style="color:#6A737D;">// Specific error message</span></span>
<span class="line"><span style="color:#24292E;">  limit</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;              </span><span style="color:#6A737D;">// Max results (default: 5, max: 20)</span></span>
<span class="line"><span style="color:#24292E;">  include_procedures</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> boolean; </span><span style="color:#6A737D;">// Include full procedures (default: true)</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    runbooks</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">      id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      severity_mapping</span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        low</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        medium</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        high</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        critical</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#E36209;">      triggers</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">      decision_tree</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      procedures</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        steps</span><span style="color:#D73A49;">:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          step_number</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          commands</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">          expected_output</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">        estimated_time</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">      escalation_path</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      confidence_score</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      match_reasons</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">      metadata</span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        last_updated</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        success_rate</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        avg_resolution_time</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">    total_found</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">    recommendations</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">      similar_incidents: string[];</span></span>
<span class="line"><span style="color:#24292E;">      prevention_tips: string[];</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="get-api-runbooks" tabindex="-1">GET /api/runbooks <a class="header-anchor" href="#get-api-runbooks" aria-label="Permalink to &quot;GET /api/runbooks&quot;">​</a></h3><p>List all runbooks with filtering and pagination.</p><p><strong>Query Parameters:</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>?limit=20                    # Results per page (default: 20, max: 100)</span></span>
<span class="line"><span>&amp;offset=0                    # Pagination offset (default: 0)</span></span>
<span class="line"><span>&amp;severity=high               # Filter by severity</span></span>
<span class="line"><span>&amp;systems=web,database        # Filter by affected systems</span></span>
<span class="line"><span>&amp;tags=maintenance,urgent     # Filter by tags</span></span>
<span class="line"><span>&amp;status=active               # Filter by status (active, archived)</span></span>
<span class="line"><span>&amp;sort=updated_desc           # Sort order (updated_desc, title_asc, severity_desc)</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    runbooks</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">      id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      severity_levels</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">      systems</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">      tags</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">      status</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;active&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;archived&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      last_updated</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      usage_stats</span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        times_used</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        success_rate</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        avg_resolution_time</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">    pagination</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      total</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      limit</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      offset</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      has_more</span><span style="color:#24292E;">: boolean;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#6F42C1;">    filters</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      available_severities</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      available_systems</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      available_tags</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="get-api-runbooks-id" tabindex="-1">GET /api/runbooks/:id <a class="header-anchor" href="#get-api-runbooks-id" aria-label="Permalink to &quot;GET /api/runbooks/:id&quot;">​</a></h3><p>Get specific runbook by ID.</p><p><strong>Path Parameters:</strong></p><ul><li><code>id</code> - Runbook identifier</li></ul><p><strong>Query Parameters:</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>?include_procedures=true     # Include full procedures (default: true)</span></span>
<span class="line"><span>&amp;include_history=false       # Include revision history (default: false)</span></span>
<span class="line"><span>&amp;include_stats=true          # Include usage statistics (default: true)</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    runbook</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      title</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      description</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      version</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      severity_mapping</span><span style="color:#24292E;">: object;</span></span>
<span class="line"><span style="color:#6F42C1;">      triggers</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      decision_tree</span><span style="color:#24292E;">: object;</span></span>
<span class="line"><span style="color:#6F42C1;">      procedures</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        prerequisites</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">        steps</span><span style="color:#D73A49;">:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          step_number</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          commands</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">          expected_output</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          troubleshooting</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">          estimated_time</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">        success_criteria</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">        rollback_procedure</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">      escalation_path</span><span style="color:#24292E;">: object;</span></span>
<span class="line"><span style="color:#6F42C1;">      metadata</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        created_at</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        updated_at</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        created_by</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        updated_by</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        tags</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">        systems</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">      statistics</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">        times_used: number;</span></span>
<span class="line"><span style="color:#24292E;">        success_rate: number;</span></span>
<span class="line"><span style="color:#24292E;">        avg_resolution_time: string;</span></span>
<span class="line"><span style="color:#24292E;">        last_used: string;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">      history</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        version</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        updated_at</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        updated_by</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        changes</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h2 id="operational-endpoints" tabindex="-1">Operational Endpoints <a class="header-anchor" href="#operational-endpoints" aria-label="Permalink to &quot;Operational Endpoints&quot;">​</a></h2><h3 id="post-api-decision-tree" tabindex="-1">POST /api/decision-tree <a class="header-anchor" href="#post-api-decision-tree" aria-label="Permalink to &quot;POST /api/decision-tree&quot;">​</a></h3><p>Get decision logic for specific scenarios.</p><p><strong>Request Body:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  scenario</span><span style="color:#24292E;">: string;            </span><span style="color:#6A737D;">// Scenario description</span></span>
<span class="line"><span style="color:#24292E;">  context</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {                 </span><span style="color:#6A737D;">// Additional context</span></span>
<span class="line"><span style="color:#24292E;">    systems?: string[];</span></span>
<span class="line"><span style="color:#24292E;">    error_codes</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">    user_role</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#24292E;">    business_impact</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#24292E;">  max_depth</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;         </span><span style="color:#6A737D;">// Maximum tree depth (default: 5, max: 10)</span></span>
<span class="line"><span style="color:#24292E;">  format</span><span style="color:#D73A49;">?:</span><span style="color:#032F62;"> &quot;tree&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;linear&quot;</span><span style="color:#24292E;">; </span><span style="color:#6A737D;">// Response format (default: &quot;tree&quot;)</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    decision_tree</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      title</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      scenario</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      root_decision</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        question</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;boolean&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;multiple_choice&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;numeric&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">        options</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          label</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          condition</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          action</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          next_decision_id</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          next_decision</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;     </span><span style="color:#6A737D;">// Nested decision (if max_depth &gt; 1)</span></span>
<span class="line"><span style="color:#E36209;">          estimated_time</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          confidence</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">        metadata</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">          difficulty: </span><span style="color:#032F62;">&quot;easy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;medium&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;hard&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">          required_skills: string[];</span></span>
<span class="line"><span style="color:#24292E;">          tools_needed: string[];</span></span>
<span class="line"><span style="color:#24292E;">        };</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    linear_flow</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> Array</span><span style="color:#D73A49;">&lt;</span><span style="color:#24292E;">{      </span><span style="color:#6A737D;">// If format = &quot;linear&quot;</span></span>
<span class="line"><span style="color:#6F42C1;">      step</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;decision&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;action&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">      content</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#24292E;">      conditions</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">    }</span><span style="color:#D73A49;">&gt;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">    confidence_score</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">    source</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      name</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      document_id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      last_updated</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="get-api-procedures-id" tabindex="-1">GET /api/procedures/:id <a class="header-anchor" href="#get-api-procedures-id" aria-label="Permalink to &quot;GET /api/procedures/:id&quot;">​</a></h3><p>Get detailed procedure steps by ID.</p><p><strong>Path Parameters:</strong></p><ul><li><code>id</code> - Procedure identifier</li></ul><p><strong>Query Parameters:</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>?include_prerequisites=true  # Include setup steps (default: true)</span></span>
<span class="line"><span>&amp;include_troubleshooting=true # Include troubleshooting info (default: true)</span></span>
<span class="line"><span>&amp;format=detailed             # Response format (detailed, compact)</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    procedure</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      title</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      description</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      category</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      difficulty</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;easy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;medium&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;hard&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      prerequisites</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        type</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;skill&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;tool&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;access&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;condition&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        required</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> boolean</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">      steps</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        step_number</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        type</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;action&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;verification&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;decision&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        commands</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          command</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          platform</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;linux&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;windows&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;macos&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;any&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          description</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">        expected_output</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        success_criteria</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#E36209;">        troubleshooting</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          issue</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          solution</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          escalation</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> boolean</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">        estimated_time</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        parallel_execution</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> boolean</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">      estimated_total_time</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      success_criteria</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">      rollback_procedure</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">        steps: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          step_number</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          commands</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#6F42C1;">      metadata</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        last_updated</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        success_rate</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        avg_execution_time</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        complexity_score</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="post-api-escalation" tabindex="-1">POST /api/escalation <a class="header-anchor" href="#post-api-escalation" aria-label="Permalink to &quot;POST /api/escalation&quot;">​</a></h3><p>Get escalation paths based on severity and context.</p><p><strong>Request Body:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  incident_type</span><span style="color:#24292E;">: string;       </span><span style="color:#6A737D;">// Type of incident</span></span>
<span class="line"><span style="color:#6F42C1;">  severity</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;low&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;medium&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;high&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;critical&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">  business_impact</span><span style="color:#D73A49;">?:</span><span style="color:#032F62;"> &quot;none&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;low&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;medium&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;high&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;critical&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">  affected_services</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  customer_impact</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> boolean;</span></span>
<span class="line"><span style="color:#24292E;">  time_since_start</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;   </span><span style="color:#6A737D;">// Minutes since incident started</span></span>
<span class="line"><span style="color:#24292E;">  attempted_solutions</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  context</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">    business_hours?: boolean;</span></span>
<span class="line"><span style="color:#24292E;">    on_call_available</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> boolean;</span></span>
<span class="line"><span style="color:#24292E;">    previous_escalations</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    escalation_path</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      current_level</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      escalation_required</span><span style="color:#24292E;">: boolean;</span></span>
<span class="line"><span style="color:#24292E;">      next_escalation_time</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#6F42C1;">      levels</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        level</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        description</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        contacts</span><span style="color:#D73A49;">:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          name</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          role</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          contact_methods</span><span style="color:#D73A49;">:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">            type</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;email&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;phone&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;slack&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;pager&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">            value</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">            priority</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">          }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">          response_time_sla</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          availability</span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">            timezone</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">            business_hours</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">            on_call_schedule</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">          };</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">        escalation_triggers</span><span style="color:#D73A49;">:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          condition</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          automatic</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> boolean</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          delay_minutes</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#E36209;">        actions</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">      business_impact_assessment</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        level</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        description</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#24292E;">        financial_impact</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#6F42C1;">        customer_impact</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        sla_breach_risk</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#6F42C1;">      communication_plan</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        internal_channels</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">        external_channels</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">        update_frequency</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        stakeholder_groups</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#6F42C1;">    recommendations</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      immediate_actions</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      prevention_measures</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      process_improvements</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#6F42C1;">    confidence_score</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="post-api-feedback" tabindex="-1">POST /api/feedback <a class="header-anchor" href="#post-api-feedback" aria-label="Permalink to &quot;POST /api/feedback&quot;">​</a></h3><p>Record resolution feedback for system improvement.</p><p><strong>Request Body:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  incident_id</span><span style="color:#24292E;">: string;        </span><span style="color:#6A737D;">// Unique incident identifier</span></span>
<span class="line"><span style="color:#24292E;">  runbook_used</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;      </span><span style="color:#6A737D;">// Runbook that was used</span></span>
<span class="line"><span style="color:#24292E;">  procedures_used</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[]; </span><span style="color:#6A737D;">// Procedures that were executed</span></span>
<span class="line"><span style="color:#6F42C1;">  resolution_time_minutes</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">  was_successful</span><span style="color:#24292E;">: boolean;</span></span>
<span class="line"><span style="color:#6F42C1;">  outcome</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;resolved&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;partially_resolved&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;escalated&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;workaround&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">  feedback</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#24292E;">    runbook_accuracy</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;     </span><span style="color:#6A737D;">// 1-5 rating</span></span>
<span class="line"><span style="color:#24292E;">    procedure_clarity</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;    </span><span style="color:#6A737D;">// 1-5 rating</span></span>
<span class="line"><span style="color:#24292E;">    completeness</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;         </span><span style="color:#6A737D;">// 1-5 rating</span></span>
<span class="line"><span style="color:#24292E;">    ease_of_use</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;         </span><span style="color:#6A737D;">// 1-5 rating</span></span>
<span class="line"><span style="color:#24292E;">    missing_information</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">    suggested_improvements</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#24292E;">    false_positives</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];   </span><span style="color:#6A737D;">// Incorrect matches/suggestions</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#24292E;">  root_cause</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">    category: string;</span></span>
<span class="line"><span style="color:#24292E;">    description: string;</span></span>
<span class="line"><span style="color:#24292E;">    contributing_factors</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#6F42C1;">  resolution_summary</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#24292E;">  lessons_learned</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  prevention_recommendations</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  metadata</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">    operator_name?: string;</span></span>
<span class="line"><span style="color:#24292E;">    operator_experience</span><span style="color:#D73A49;">?:</span><span style="color:#032F62;"> &quot;junior&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;mid&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;senior&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">    business_hours</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> boolean;</span></span>
<span class="line"><span style="color:#24292E;">    tools_used</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  };</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    feedback_id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    stored_at</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    analysis</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      runbook_effectiveness</span><span style="color:#24292E;">: number;    </span><span style="color:#6A737D;">// Overall score 0-100</span></span>
<span class="line"><span style="color:#6F42C1;">      improvement_areas</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        area</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        priority</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;low&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;medium&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;high&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        suggestion</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">      similar_incidents</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        count</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        patterns</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">        success_rate</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#6F42C1;">      trending_issues</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#6F42C1;">    recommendations</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      documentation_updates</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      process_improvements</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      training_needs</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#6F42C1;">      tool_enhancements</span><span style="color:#24292E;">: string[];</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#6F42C1;">    impact_metrics</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      mttr_improvement_potential</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">      accuracy_score_change</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      confidence_score_impact</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h2 id="management-endpoints" tabindex="-1">Management Endpoints <a class="header-anchor" href="#management-endpoints" aria-label="Permalink to &quot;Management Endpoints&quot;">​</a></h2><h3 id="get-api-sources" tabindex="-1">GET /api/sources <a class="header-anchor" href="#get-api-sources" aria-label="Permalink to &quot;GET /api/sources&quot;">​</a></h3><p>List all configured documentation sources with health status.</p><p><strong>Query Parameters:</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>?include_health=true         # Include health status (default: true)</span></span>
<span class="line"><span>&amp;include_stats=true          # Include usage statistics (default: false)</span></span>
<span class="line"><span>&amp;source_type=confluence      # Filter by source type</span></span>
<span class="line"><span>&amp;status=healthy              # Filter by health status</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    sources</span><span style="color:#24292E;">: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">      name</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      type</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      status</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;healthy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;degraded&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;offline&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;maintenance&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      configuration</span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        priority</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        refresh_interval</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        last_refresh</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        next_refresh</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#E36209;">      health</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        response_time_ms</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        success_rate</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        error_rate</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        last_error</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">          timestamp</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          message</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          code</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        };</span></span>
<span class="line"><span style="color:#E36209;">        uptime_percentage</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#E36209;">      statistics</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#E36209;">        document_count</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        queries_today</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        queries_total</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        avg_response_time</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        cache_hit_rate</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        last_query</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        most_queried_documents</span><span style="color:#D73A49;">:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          id</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          title</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          query_count</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#E36209;">      capabilities</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">[];    </span><span style="color:#6A737D;">// Available features</span></span>
<span class="line"><span style="color:#24292E;">    }&gt;;</span></span>
<span class="line"><span style="color:#6F42C1;">    summary</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      total_sources</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      healthy_sources</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      total_documents</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      cache_efficiency</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="get-api-health" tabindex="-1">GET /api/health <a class="header-anchor" href="#get-api-health" aria-label="Permalink to &quot;GET /api/health&quot;">​</a></h3><p>Consolidated API health status with performance metrics.</p><p><strong>Query Parameters:</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>?include_details=true        # Include detailed component health</span></span>
<span class="line"><span>&amp;include_metrics=true        # Include performance metrics</span></span>
<span class="line"><span>&amp;check_sources=true          # Perform source health checks</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    status</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;healthy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;degraded&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;offline&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">    version</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    uptime_seconds</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">    timestamp</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    components</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      api</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        status</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;healthy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;degraded&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;offline&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">        response_time_ms</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        requests_per_minute</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        error_rate</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#6F42C1;">      cache</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        status</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;healthy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;degraded&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;offline&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#6F42C1;">        type</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">        hit_rate</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">        memory_usage</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;</span></span>
<span class="line"><span style="color:#24292E;">        connection_count</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#6F42C1;">      sources</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">        total</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        healthy</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        degraded</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">        offline</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">        details</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">          name</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          status</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">          last_check</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">      database</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">        status: </span><span style="color:#032F62;">&quot;healthy&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;degraded&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;offline&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">        connection_count: number;</span></span>
<span class="line"><span style="color:#24292E;">        query_time_ms: number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    performance</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">      requests: {</span></span>
<span class="line"><span style="color:#24292E;">        total: number;</span></span>
<span class="line"><span style="color:#24292E;">        success_rate: number;</span></span>
<span class="line"><span style="color:#24292E;">        avg_response_time: number;</span></span>
<span class="line"><span style="color:#24292E;">        p95_response_time: number;</span></span>
<span class="line"><span style="color:#24292E;">        p99_response_time: number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">      resources: {</span></span>
<span class="line"><span style="color:#24292E;">        memory_usage_mb: number;</span></span>
<span class="line"><span style="color:#24292E;">        memory_usage_percent: number;</span></span>
<span class="line"><span style="color:#24292E;">        cpu_usage_percent: number;</span></span>
<span class="line"><span style="color:#24292E;">        open_file_descriptors: number;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">      cache_stats: {</span></span>
<span class="line"><span style="color:#24292E;">        hit_rate: number;</span></span>
<span class="line"><span style="color:#24292E;">        miss_rate: number;</span></span>
<span class="line"><span style="color:#24292E;">        eviction_rate: number;</span></span>
<span class="line"><span style="color:#24292E;">        memory_usage: string;</span></span>
<span class="line"><span style="color:#24292E;">      };</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    alerts</span><span style="color:#D73A49;">?:</span><span style="color:#6F42C1;"> Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">      level</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> &quot;warning&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;error&quot;</span><span style="color:#D73A49;"> |</span><span style="color:#032F62;"> &quot;critical&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      component</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      message</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      timestamp</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">      details</span><span style="color:#D73A49;">?:</span><span style="color:#005CC5;"> object</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">    }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="get-api-performance" tabindex="-1">GET /api/performance <a class="header-anchor" href="#get-api-performance" aria-label="Permalink to &quot;GET /api/performance&quot;">​</a></h3><p>API performance metrics and statistics.</p><p><strong>Query Parameters:</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span>?period=1h                   # Time period (1m, 5m, 15m, 1h, 24h)</span></span>
<span class="line"><span>&amp;include_breakdown=true      # Include endpoint breakdown</span></span>
<span class="line"><span>&amp;include_trends=true         # Include trend analysis</span></span></code></pre></div><p><strong>Response:</strong></p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  data</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    period</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    summary</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      total_requests</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      success_rate</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      error_rate</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      avg_response_time</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      p50_response_time</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      p95_response_time</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      p99_response_time</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      requests_per_minute</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      concurrent_connections</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    breakdown</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">      by_endpoint: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        endpoint</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        method</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        request_count</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        avg_response_time</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        error_rate</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        slowest_request</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      by_status_code: Record</span><span style="color:#D73A49;">&lt;</span><span style="color:#24292E;">string, number&gt;;</span></span>
<span class="line"><span style="color:#24292E;">      by_source: </span><span style="color:#6F42C1;">Array</span><span style="color:#24292E;">&lt;{</span></span>
<span class="line"><span style="color:#E36209;">        source</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> string</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        request_count</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        avg_response_time</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#E36209;">        cache_hit_rate</span><span style="color:#D73A49;">:</span><span style="color:#005CC5;"> number</span><span style="color:#24292E;">;</span></span>
<span class="line"><span style="color:#24292E;">      }&gt;;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    trends</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">      response_time_trend: string;    </span><span style="color:#6A737D;">// &quot;improving&quot;, &quot;stable&quot;, &quot;degrading&quot;</span></span>
<span class="line"><span style="color:#24292E;">      request_volume_trend: string;</span></span>
<span class="line"><span style="color:#24292E;">      error_rate_trend: string;</span></span>
<span class="line"><span style="color:#24292E;">      cache_performance_trend: string;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#6F42C1;">    thresholds</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      response_time_warning</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      response_time_critical</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      error_rate_warning</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#6F42C1;">      error_rate_critical</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    recommendations</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[];</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h2 id="error-handling" tabindex="-1">Error Handling <a class="header-anchor" href="#error-handling" aria-label="Permalink to &quot;Error Handling&quot;">​</a></h2><h3 id="http-status-codes" tabindex="-1">HTTP Status Codes <a class="header-anchor" href="#http-status-codes" aria-label="Permalink to &quot;HTTP Status Codes&quot;">​</a></h3><ul><li><code>200 OK</code> - Successful request</li><li><code>400 Bad Request</code> - Invalid request parameters</li><li><code>401 Unauthorized</code> - Authentication required</li><li><code>403 Forbidden</code> - Insufficient permissions</li><li><code>404 Not Found</code> - Resource not found</li><li><code>429 Too Many Requests</code> - Rate limit exceeded</li><li><code>500 Internal Server Error</code> - Server error</li><li><code>502 Bad Gateway</code> - Source adapter error</li><li><code>503 Service Unavailable</code> - Service temporarily unavailable</li></ul><h3 id="error-response-format" tabindex="-1">Error Response Format <a class="header-anchor" href="#error-response-format" aria-label="Permalink to &quot;Error Response Format&quot;">​</a></h3><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  error</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    code</span><span style="color:#24292E;">: string;              </span><span style="color:#6A737D;">// Machine-readable error code</span></span>
<span class="line"><span style="color:#6F42C1;">    message</span><span style="color:#24292E;">: string;           </span><span style="color:#6A737D;">// Human-readable error message</span></span>
<span class="line"><span style="color:#24292E;">    details</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> {               </span><span style="color:#6A737D;">// Additional error details</span></span>
<span class="line"><span style="color:#24292E;">      field?: string;          </span><span style="color:#6A737D;">// Field that caused the error</span></span>
<span class="line"><span style="color:#24292E;">      value</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> any;            </span><span style="color:#6A737D;">// Invalid value</span></span>
<span class="line"><span style="color:#24292E;">      constraints</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string[]; </span><span style="color:#6A737D;">// Validation constraints</span></span>
<span class="line"><span style="color:#24292E;">    };</span></span>
<span class="line"><span style="color:#24292E;">    suggestion</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string;      </span><span style="color:#6A737D;">// Suggested resolution</span></span>
<span class="line"><span style="color:#24292E;">    documentation_url</span><span style="color:#D73A49;">?:</span><span style="color:#24292E;"> string; </span><span style="color:#6A737D;">// Link to relevant documentation</span></span>
<span class="line"><span style="color:#24292E;">  },</span></span>
<span class="line"><span style="color:#6F42C1;">  meta</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    timestamp</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    request_id</span><span style="color:#24292E;">: string;</span></span>
<span class="line"><span style="color:#6F42C1;">    response_time_ms</span><span style="color:#24292E;">: number;</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="common-error-codes" tabindex="-1">Common Error Codes <a class="header-anchor" href="#common-error-codes" aria-label="Permalink to &quot;Common Error Codes&quot;">​</a></h3><p><strong>Request Validation Errors:</strong></p><ul><li><code>INVALID_REQUEST</code> - Malformed request body</li><li><code>MISSING_REQUIRED_FIELD</code> - Required field missing</li><li><code>INVALID_FIELD_VALUE</code> - Field value doesn&#39;t meet constraints</li><li><code>INVALID_JSON</code> - Request body is not valid JSON</li></ul><p><strong>Authentication/Authorization Errors:</strong></p><ul><li><code>AUTHENTICATION_REQUIRED</code> - API key or token required</li><li><code>INVALID_CREDENTIALS</code> - Invalid API key or token</li><li><code>INSUFFICIENT_PERMISSIONS</code> - User lacks required permissions</li><li><code>TOKEN_EXPIRED</code> - Authentication token has expired</li></ul><p><strong>Resource Errors:</strong></p><ul><li><code>RESOURCE_NOT_FOUND</code> - Requested resource doesn&#39;t exist</li><li><code>RUNBOOK_NOT_FOUND</code> - Specified runbook ID not found</li><li><code>PROCEDURE_NOT_FOUND</code> - Specified procedure ID not found</li><li><code>SOURCE_NOT_FOUND</code> - Specified source doesn&#39;t exist</li></ul><p><strong>System Errors:</strong></p><ul><li><code>SOURCE_UNAVAILABLE</code> - Documentation source is offline</li><li><code>CACHE_ERROR</code> - Cache system error</li><li><code>DATABASE_ERROR</code> - Database connection or query error</li><li><code>TIMEOUT</code> - Request exceeded time limit</li><li><code>RATE_LIMITED</code> - Too many requests from client</li></ul><p><strong>Business Logic Errors:</strong></p><ul><li><code>NO_MATCHING_RUNBOOKS</code> - No runbooks found for criteria</li><li><code>AMBIGUOUS_SEARCH</code> - Search query too vague</li><li><code>INVALID_ESCALATION_PATH</code> - Cannot determine escalation</li><li><code>FEEDBACK_VALIDATION_FAILED</code> - Invalid feedback data</li></ul><h2 id="api-versioning" tabindex="-1">API Versioning <a class="header-anchor" href="#api-versioning" aria-label="Permalink to &quot;API Versioning&quot;">​</a></h2><p>The REST API uses URL-based versioning:</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span># Current version (v1)</span></span>
<span class="line"><span>http://localhost:3000/api/search</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Explicit version</span></span>
<span class="line"><span>http://localhost:3000/api/v1/search</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Future versions</span></span>
<span class="line"><span>http://localhost:3000/api/v2/search</span></span></code></pre></div><h3 id="version-support-policy" tabindex="-1">Version Support Policy <a class="header-anchor" href="#version-support-policy" aria-label="Permalink to &quot;Version Support Policy&quot;">​</a></h3><ul><li><strong>Current Version (v1)</strong>: Fully supported</li><li><strong>Previous Version</strong>: Security updates only</li><li><strong>Future Versions</strong>: Beta features available</li></ul><h2 id="rate-limiting" tabindex="-1">Rate Limiting <a class="header-anchor" href="#rate-limiting" aria-label="Permalink to &quot;Rate Limiting&quot;">​</a></h2><h3 id="default-limits" tabindex="-1">Default Limits <a class="header-anchor" href="#default-limits" aria-label="Permalink to &quot;Default Limits&quot;">​</a></h3><ul><li><strong>Authenticated requests</strong>: 1000 requests/hour</li><li><strong>Anonymous requests</strong>: 100 requests/hour</li><li><strong>Search operations</strong>: 60 requests/minute</li><li><strong>Bulk operations</strong>: 10 requests/minute</li></ul><h3 id="rate-limit-headers" tabindex="-1">Rate Limit Headers <a class="header-anchor" href="#rate-limit-headers" aria-label="Permalink to &quot;Rate Limit Headers&quot;">​</a></h3><div class="language-http"><button title="Copy Code" class="copy"></button><span class="lang">http</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">X-RateLimit-Limit</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> 1000</span></span>
<span class="line"><span style="color:#22863A;">X-RateLimit-Remaining</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> 999</span></span>
<span class="line"><span style="color:#22863A;">X-RateLimit-Reset</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> 1625097600</span></span>
<span class="line"><span style="color:#22863A;">X-RateLimit-Window</span><span style="color:#D73A49;">:</span><span style="color:#032F62;"> 3600</span></span></code></pre></div><h3 id="rate-limit-response" tabindex="-1">Rate Limit Response <a class="header-anchor" href="#rate-limit-response" aria-label="Permalink to &quot;Rate Limit Response&quot;">​</a></h3><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  success</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">  error</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">    code</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;RATE_LIMITED&quot;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">    message</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;Too many requests. Please try again later.&quot;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">    details</span><span style="color:#24292E;">: {</span></span>
<span class="line"><span style="color:#6F42C1;">      limit</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1000</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">      remaining</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">0</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#6F42C1;">      reset_time</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;2025-08-16T11:00:00.000Z&quot;</span></span>
<span class="line"><span style="color:#24292E;">    },</span></span>
<span class="line"><span style="color:#6F42C1;">    suggestion</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;Reduce request frequency or upgrade to higher rate limits&quot;</span></span>
<span class="line"><span style="color:#24292E;">  }</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h2 id="authentication" tabindex="-1">Authentication <a class="header-anchor" href="#authentication" aria-label="Permalink to &quot;Authentication&quot;">​</a></h2><h3 id="api-key-authentication" tabindex="-1">API Key Authentication <a class="header-anchor" href="#api-key-authentication" aria-label="Permalink to &quot;API Key Authentication&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Include API key in header</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -H</span><span style="color:#032F62;"> &quot;X-API-Key: your_api_key&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  http://localhost:3000/api/search</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or as query parameter</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> &quot;http://localhost:3000/api/search?api_key=your_api_key&quot;</span></span></code></pre></div><h3 id="jwt-authentication" tabindex="-1">JWT Authentication <a class="header-anchor" href="#jwt-authentication" aria-label="Permalink to &quot;JWT Authentication&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Get JWT token</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> POST</span><span style="color:#032F62;"> http://localhost:3000/auth/login</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;Content-Type: application/json&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -d</span><span style="color:#032F62;"> &#39;{&quot;username&quot;: &quot;user&quot;, &quot;password&quot;: &quot;pass&quot;}&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use JWT token</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -H</span><span style="color:#032F62;"> &quot;Authorization: Bearer your_jwt_token&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  http://localhost:3000/api/search</span></span></code></pre></div><h2 id="client-libraries" tabindex="-1">Client Libraries <a class="header-anchor" href="#client-libraries" aria-label="Permalink to &quot;Client Libraries&quot;">​</a></h2><h3 id="javascript-typescript" tabindex="-1">JavaScript/TypeScript <a class="header-anchor" href="#javascript-typescript" aria-label="Permalink to &quot;JavaScript/TypeScript&quot;">​</a></h3><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#D73A49;">import</span><span style="color:#24292E;"> { PersonalPipelineClient } </span><span style="color:#D73A49;">from</span><span style="color:#032F62;"> &#39;@personal-pipeline/client&#39;</span><span style="color:#24292E;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">const</span><span style="color:#005CC5;"> client</span><span style="color:#D73A49;"> =</span><span style="color:#D73A49;"> new</span><span style="color:#6F42C1;"> PersonalPipelineClient</span><span style="color:#24292E;">({</span></span>
<span class="line"><span style="color:#24292E;">  baseUrl: </span><span style="color:#032F62;">&#39;http://localhost:3000&#39;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#24292E;">  apiKey: </span><span style="color:#032F62;">&#39;your_api_key&#39;</span></span>
<span class="line"><span style="color:#24292E;">});</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;">// Search runbooks</span></span>
<span class="line"><span style="color:#D73A49;">const</span><span style="color:#005CC5;"> runbooks</span><span style="color:#D73A49;"> =</span><span style="color:#D73A49;"> await</span><span style="color:#24292E;"> client.</span><span style="color:#6F42C1;">searchRunbooks</span><span style="color:#24292E;">({</span></span>
<span class="line"><span style="color:#24292E;">  alert_type: </span><span style="color:#032F62;">&#39;disk_space&#39;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#24292E;">  severity: </span><span style="color:#032F62;">&#39;high&#39;</span></span>
<span class="line"><span style="color:#24292E;">});</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;">// Get procedure</span></span>
<span class="line"><span style="color:#D73A49;">const</span><span style="color:#005CC5;"> procedure</span><span style="color:#D73A49;"> =</span><span style="color:#D73A49;"> await</span><span style="color:#24292E;"> client.</span><span style="color:#6F42C1;">getProcedure</span><span style="color:#24292E;">(</span><span style="color:#032F62;">&#39;proc_123&#39;</span><span style="color:#24292E;">);</span></span></code></pre></div><h3 id="python" tabindex="-1">Python <a class="header-anchor" href="#python" aria-label="Permalink to &quot;Python&quot;">​</a></h3><div class="language-python"><button title="Copy Code" class="copy"></button><span class="lang">python</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#D73A49;">from</span><span style="color:#24292E;"> personal_pipeline </span><span style="color:#D73A49;">import</span><span style="color:#24292E;"> Client</span></span>
<span class="line"></span>
<span class="line"><span style="color:#24292E;">client </span><span style="color:#D73A49;">=</span><span style="color:#24292E;"> Client(</span></span>
<span class="line"><span style="color:#E36209;">    base_url</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&#39;http://localhost:3000&#39;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#E36209;">    api_key</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&#39;your_api_key&#39;</span></span>
<span class="line"><span style="color:#24292E;">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Search runbooks</span></span>
<span class="line"><span style="color:#24292E;">runbooks </span><span style="color:#D73A49;">=</span><span style="color:#24292E;"> client.search_runbooks(</span></span>
<span class="line"><span style="color:#E36209;">    alert_type</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&#39;disk_space&#39;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#E36209;">    severity</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&#39;high&#39;</span></span>
<span class="line"><span style="color:#24292E;">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Get procedure</span></span>
<span class="line"><span style="color:#24292E;">procedure </span><span style="color:#D73A49;">=</span><span style="color:#24292E;"> client.get_procedure(</span><span style="color:#032F62;">&#39;proc_123&#39;</span><span style="color:#24292E;">)</span></span></code></pre></div><h3 id="curl-examples" tabindex="-1">cURL Examples <a class="header-anchor" href="#curl-examples" aria-label="Permalink to &quot;cURL Examples&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Search documentation</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> POST</span><span style="color:#032F62;"> http://localhost:3000/api/search</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;Content-Type: application/json&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;X-API-Key: your_api_key&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -d</span><span style="color:#032F62;"> &#39;{&quot;query&quot;: &quot;memory leak&quot;, &quot;limit&quot;: 10}&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Get runbook</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/api/runbooks/rb_123</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;X-API-Key: your_api_key&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Record feedback</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> POST</span><span style="color:#032F62;"> http://localhost:3000/api/feedback</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;Content-Type: application/json&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;X-API-Key: your_api_key&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -d</span><span style="color:#032F62;"> &#39;{</span></span>
<span class="line"><span style="color:#032F62;">    &quot;incident_id&quot;: &quot;inc_456&quot;,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;resolution_time_minutes&quot;: 30,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;was_successful&quot;: true,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;resolution_summary&quot;: &quot;Fixed by restarting service&quot;</span></span>
<span class="line"><span style="color:#032F62;">  }&#39;</span></span></code></pre></div><h2 id="next-steps" tabindex="-1">Next Steps <a class="header-anchor" href="#next-steps" aria-label="Permalink to &quot;Next Steps&quot;">​</a></h2><ul><li><a href="./mcp-tools">MCP Tools Reference</a> - Native MCP protocol tools</li><li><a href="./adapters">Source Adapters</a> - Configuring documentation sources</li><li><a href="./errors">Error Handling</a> - Comprehensive error handling guide</li><li><a href="./../examples/api-usage">API Examples</a> - Practical integration examples</li></ul>`,126)]))}const d=n(o,[["render",e]]);export{E as __pageData,d as default};

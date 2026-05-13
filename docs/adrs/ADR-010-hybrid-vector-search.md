# ADR-010: Hybrid Vector Search

## Status
Accepted — 2026-05-06

## Context
Keyword search is insufficient for modern ecommerce. Users search by intent: *"oil for joint pain"*, *"something for my mother's skin"*. Vector databases enable semantic search, but pure vector search suffers from drift, bias, and false positives. The 2026 default is **hybrid search** — combining vector similarity with BM25 keyword scoring. For existing PostgreSQL workloads under 50M vectors, **pgvector + pgvectorscale** is optimal.

## Decision
We will implement **Hybrid Vector Search** using:

1. **pgvector extension** — native PostgreSQL vector type with HNSW indexing
2. **Dual indexing** — `embedding vector(1536)` for semantic + `searchVector` JSON for BM25 fallback
3. **Hybrid ranking** — reciprocal rank fusion (RRF) combining vector and keyword scores
4. **Product embeddings** — generated via OpenAI `text-embedding-3-large` on product name + description + benefits
5. **Query embeddings** — real-time embedding of customer search queries
6. **Search analytics** — log every query with latency, result counts, clicks, conversions
7. **Uncertainty quantification** — for high-stakes queries, cross-verify with symbolic search

### Query Flow
```
1. Customer searches "oil for knee pain"
2. Embed query → vector(1536)
3. Run pgvector ANN: SELECT * FROM "Product" ORDER BY embedding <-> $1 LIMIT 20
4. Run BM25 on searchVector: SELECT * FROM "Product" WHERE searchVector @@ plainto_tsquery($1)
5. RRF fusion: score = 1/(k + rank_vector) + 1/(k + rank_keyword)
6. Return ranked results
```

## Consequences
- **Positive**: Semantic search captures intent that keyword search misses
- **Positive**: Hybrid approach reduces false positives vs pure vector
- **Positive**: Single database — no separate vector DB infrastructure
- **Negative**: pgvector HNSW index adds ~20% storage overhead per product
- **Negative**: Embedding generation adds ~200ms to product create/update

## Research Citations
- Firecrawl. (2026). Best Vector Databases in 2026. pgvector + pgvectorscale for <50M vectors.
- DevNewsletter. (2026). State of Databases 2026. Hybrid search as default pattern; uncertainty quantification for critical queries.
- Artsyltech. (2026). Navigating Vector Databases in Business in 2026. Real-time decision making via semantic search.

# C4 Level 3: Component Diagram - AI-Analytics Service (`apps/api-ai-analytics`)

This diagram details the internal software architecture of the **AI-Analytics Service** (`apps/api-ai-analytics`), built with Python 3.12, FastAPI, MongoDB, Redis, and Groq LLM API integration.

```mermaid
graph TB
    subgraph ExternalClients ["Clients & External APIs"]
        WebCRM["Web CRM Application<br/><i>[HTTP REST Client]</i>"]
        CRMService["CRM API Service<br/><i>[Data Source]</i>"]
        GroqAPI["Groq Cloud API<br/><i>[Llama 3.1 LLM]</i>"]
    end

    subgraph AIAnalytics ["apps/api-ai-analytics (FastAPI)"]
        subgraph RouteModules ["FastAPI Route Controllers (app/api/v1/routes/)"]
            ForecastRoute["forecasts.py<br/><i>[Router]</i>"]
            CustomerRoute["customers.py<br/><i>[Router]</i>"]
            DashboardRoute["dashboard.py<br/><i>[Router]</i>"]
            AnomalyRoute["anomalies.py<br/><i>[Router]</i>"]
            QueryRoute["query.py / ask.py<br/><i>[Router]</i>"]
        end

        subgraph ServiceModules ["Analytics Services (app/services/)"]
            ForecastSvc["ForecastService<br/><i>[Workload & Revenue Forecasting]</i>"]
            ChurnSvc["ChurnPredictionService<br/><i>[Churn Score Calculation]</i>"]
            SentimentSvc["SentimentAnalysisService<br/><i>[VADER / NLP Sentiment Engine]</i>"]
            AnomalySvc["AnomalyDetectionService<br/><i>[Statistical Anomaly Engine]</i>"]
            NBASvc["NextBestActionService<br/><i>[Retention & Campaign NBA Engine]</i>"]
            NLQuerySvc["NaturalLanguageQueryService<br/><i>[Ask AI Query Engine]</i>"]
        end

        subgraph LLMModule ["LLM & Heuristics Core (app/lib/)"]
            GroqClient["groq_client.py<br/><i>[Groq SDK Client]</i>"]
            HeuristicEngine["heuristic_fallback.py<br/><i>[Rule-Based Fallback Engine]</i>"]
        end

        subgraph DataAccessLayer ["Data Access & Cache"]
            CRMClient["CRM REST Data Ingestion Client"]
            MongoManager["MongoDB ODM Manager<br/><i>[Motor Async Driver]</i>"]
            RedisManager["Redis Cache Manager<br/><i>[redis-py]</i>"]
        end
    end

    subgraph Datastores ["Datastores"]
        MongoDB[("MongoDB 7<br/><i>[Collections: CustomerMetrics, ChurnHistory, AnomaliesLog, NLQueries]</i>")]
        RedisCache[("Redis 7<br/><i>[Keys: ForecastCache, ConfigOverrides]</i>")]
    end

    %% Inbound Routes
    WebCRM --> ForecastRoute
    WebCRM --> CustomerRoute
    WebCRM --> DashboardRoute
    WebCRM --> AnomalyRoute
    WebCRM --> QueryRoute

    %% Routes -> Services
    ForecastRoute --> ForecastSvc
    CustomerRoute --> ChurnSvc & NBASvc
    DashboardRoute --> AnomalySvc & ForecastSvc
    AnomalyRoute --> AnomalySvc
    QueryRoute --> NLQuerySvc

    %% Services -> LLM & Fallback
    NLQuerySvc --> GroqClient
    GroqClient -->|"On Timeout / Limit Error"| HeuristicEngine
    GroqClient --> GroqAPI

    %% Services -> CRM Client & DB
    ForecastSvc --> RedisManager
    ChurnSvc & SentimentSvc & AnomalySvc --> MongoManager
    ForecastSvc & ChurnSvc --> CRMClient
    CRMClient -->|"GET /api/v1/customers, /tickets"| CRMService

    MongoManager --> MongoDB
    RedisManager --> RedisCache
```

## Resilience & Architecture Principles
- **LLM Heuristic Fallback**: All natural language query endpoints try Groq API (`llama-3.1-8b-instant`) first; if unreachable or rate-limited, execution safely degrades to `heuristic_fallback.py`.
- **Async Processing**: Built fully asynchronously using Python `async/await`, FastAPI, Motor (Async MongoDB), and `httpx` async client.
- **In-Memory Caching**: Time-series forecast responses and heavy analytical aggregates are cached in Redis to maintain sub-50ms response SLAs.

CREATE TABLE public.api_endpoints (
    api_id SERIAL PRIMARY KEY,
    api_name VARCHAR(100) NOT NULL,     -- API명
    method VARCHAR(10) NOT NULL,       -- HTTP Method (GET, POST 등)
    endpoint_path VARCHAR(255) UNIQUE, -- API 경로 (예: /v1/employees)
    description TEXT,                  -- 기본 내역 (상세 설명)
    remarks TEXT,                      -- 비고 (참고 사항)
    version VARCHAR(10) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP, --
    updated_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP
);
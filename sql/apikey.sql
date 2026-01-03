CREATE TABLE public.api_keys (
    key_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,                 -- user_id 대신 emp.empno 사용
    api_key VARCHAR(64) UNIQUE NOT NULL, -- 해싱된 API 키
    key_name VARCHAR(100),              -- 키 별칭 (예: 'Mobile_App_Key')
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, REVOKED
    expires_at TIMESTAMPTZ(3),           -- 만료 시간
    created_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    
    -- 외래 키 설정: emp 테이블의 empno가 삭제되면 해당 키도 삭제되거나 제한됨
    CONSTRAINT fk_api_keys_emp FOREIGN KEY (empno) 
        REFERENCES public.emp(empno) ON DELETE CASCADE
);

-- 인증 속도 향상을 위한 인덱스
CREATE INDEX idx_api_key_lookup ON public.api_keys(api_key) WHERE status = 'ACTIVE';
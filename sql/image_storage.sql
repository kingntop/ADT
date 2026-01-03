CREATE TABLE public.image_storage (
    image_id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,    -- 파일명 (예: profile_king.png)
    content_type VARCHAR(50),           -- 파일 형식 (예: image/png, image/jpeg)
    file_size INT,                      -- 파일 크기 (bytes)
    image_data BYTEA NOT NULL,          -- 실제 이진 데이터 (Binary Data)
    created_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP
);

-- 기존에 만든 updated_at 자동 갱신 트리거 적용
CREATE TRIGGER trg_update_image_time
BEFORE UPDATE ON public.image_storage
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
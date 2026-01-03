-- tasks 테이블 생성
CREATE TABLE public.tasks (
    task_id SERIAL PRIMARY KEY,
    todo TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    empno INTEGER REFERENCES public.emp(empno)
);

-- scott 사용자가 접근할 수 있도록 권한 부여
GRANT ALL PRIVILEGES ON TABLE public.tasks TO scott;
GRANT USAGE, SELECT ON SEQUENCE tasks_task_id_seq TO scott;

INSERT INTO public.tasks (todo, status) VALUES
('가스터빈 6F.01 모델의 실시간 연소 모드(SPPM/PM) 데이터를 MQTT 브로커로부터 수신하여 PostgreSQL 테이블에 정확하게 매핑되고 있는지 전수 조사 및 유효성 검증 작업을 실시함.', 'RUNNING'),
('증기터빈(ST) 운전 5단계 중 Vacuum Up 과정에서 발생하는 열상태별(Cold/Warm/Hot) 로터 온도 기준치를 확인하고, 해당 임계값이 대시보드 알람 로직에 정상적으로 반영되었는지 테스트함.', 'PENDING'),
('Oracle APEX의 REST Data Source를 활용하여 Node.js Express API와 연동할 때, 특정 부서 정보 수정 시 발생하는 "수정 안 되는 버그"의 원인이 트랜잭션 커밋 누락인지 아니면 권한 문제인지 분석함.', 'PENDING'),
('MiniPC Ubuntu 24.04 환경에서 구동 중인 PostgreSQL 18 버전의 성능 최적화를 위해 shared_buffers 및 work_mem 설정을 튜닝하고, 대시보드의 세션 수와 트랜잭션 처리 속도를 비교 측정함.', 'COMPLETED'),
('Mosquitto MQTT 브로커에 접속하는 Python 데이터 수집기의 재접속 로직을 강화하고, 네트워크 순단 발생 시 데이터 손실을 방지하기 위한 로컬 버퍼링 기능을 구현하여 시스템의 신뢰성을 확보함.', 'RUNNING'),
('Antigravity 프로젝트의 메인 대시보드 UI 가독성을 높이기 위해 네이버 PC 사이트 스타일의 나눔스퀘어 및 Pretendard 폰트를 적용하고, CSS 미디어 쿼리를 사용해 다양한 해상도에 최적화함.', 'PENDING'),
('가스터빈 도면 시각화 페이지에서 특정 밸브 클릭 시 해당 태그의 최근 24시간 트렌드 그래프가 팝업으로 출력되는 기능을 구현하고, D3.js 라이브러리와의 데이터 연동 인터페이스를 표준화함.', 'PENDING'),
('PostgreSQL 내장 함수와 사용자 정의 프로시저(UDF/SP)를 사용하여 1초 단위의 원시 데이터를 1분 단위 평균값으로 요약하여 별도 아카이빙 테이블에 저장하는 배치 작업 프로세스를 구축함.', 'COMPLETED'),
('부서 관리 화면에서 입력된 데이터의 앞뒤 공백을 제거하고 대문자로 자동 변환해주는 BEFORE 트리거를 작성하여, 데이터 불일치로 인해 발생하는 검색 및 수정 오류를 원천적으로 차단함.', 'RUNNING'),
('시스템 보안 취약점 점검 리스트를 기반으로 Node.js 서버의 Helmet 미들웨어 설정, CORS 도메인 제한, 그리고 SQL Injection 방지를 위한 매개변수화 쿼리 적용 여부를 전수 점검함.', 'PENDING'),
('증기터빈 Rolling 단계 진입 전 필수 확인 항목인 HP STM Min. Temp 조건을 검증하는 복합 SQL 함수를 작성하고, 해당 조건 미충족 시 관리자 대시보드에 경고 팝업이 즉시 뜨도록 연동함.', 'RUNNING'),
('pgAdmin 4의 대시보드 지표를 분석하여 특정 시간대에 Tuples out 수치가 급증하는 원인을 파악하고, 불필요하게 전체 행을 스캔하는 쿼리를 인덱스 스캔 방식으로 변경하여 DB 부하를 경감함.', 'COMPLETED'),
('MQTT를 통해 수신된 가스터빈 출력(DWATT) 데이터가 비정상적인 범위(예: -999)로 들어올 경우 이를 자동으로 무시하고 직전 정상값을 유지하는 데이터 정제 필터 트리거를 구현함.', 'PENDING'),
('프로젝트의 소스 코드 관리 및 협업을 위해 Git 서버를 구축하고, 코드 리뷰 시 "Pending comments" 상태에서 멈추는 현상을 방지하기 위한 IDE 환경 설정 가이드를 팀원들에게 배포함.', 'RUNNING'),
('Node.js Express 서버의 로그 포맷을 Apache Common Log Format으로 통일하고, 매일 로그 파일을 로테이션하여 MiniPC의 디스크 용량이 부족해지는 현상을 사전에 예방하는 설정을 완료함.', 'COMPLETED'),
('Oracle APEX의 Tree Component를 사용하여 사원 계층 구조를 시각화할 때, MGR 컬럼이 NULL인 최상위 관리자부터 시작하도록 START WITH 조건을 수정하고 노드 펼침 상태를 최적화함.', 'RUNNING'),
('PostgreSQL의 Foreign Data Wrappers 기능을 검토하여 기존에 운영 중인 Oracle Database의 과거 운전 이력 테이블을 sampledb에서 실시간으로 직접 조회할 수 있는 가상 테이블을 생성함.', 'PENDING'),
('가스터빈 연소 진동(Combustion Vibration) 분석을 위해 고주파 샘플링 데이터를 수신하는 전용 테이블을 설계하고, 대용량 데이터 입력 성능을 높이기 위해 테이블 파티셔닝 기법을 적용함.', 'PENDING'),
('사용자 정의 프로시저 p_manage_dept에서 I, U, D 액션별 분기 처리가 정확한지 psql 도구를 사용하여 테스트 케이스별로 검증하고, 발생 가능한 예외 상황에 대한 에러 핸들링 코드를 보완함.', 'COMPLETED'),
('Antigravity 시스템의 최종 사용자 매뉴얼을 작성하고, 대시보드에서 각 태그의 의미와 차트 조작 방법, 그리고 긴급 상황 발생 시 알람 확인 및 조치 요령에 대한 내용을 상세히 기술함.', 'RUNNING');
-- Drop existing tables to ensure a clean state
DROP TABLE IF EXISTS EMP;
DROP TABLE IF EXISTS DEPT;

-- 1. DEPT Table Creation
CREATE TABLE DEPT (
    DEPTNO SMALLINT PRIMARY KEY,    -- Department Number
    DNAME  VARCHAR(14),            -- Department Name
    LOC    VARCHAR(13)             -- Location
);

-- 2. EMP Table Creation
CREATE TABLE EMP (
    EMPNO    SMALLINT PRIMARY KEY, -- Employee Number
    ENAME    VARCHAR(10),          -- Employee Name
    JOB      VARCHAR(9),           -- Job Title
    MGR      SMALLINT,             -- Manager's Employee Number
    HIREDATE DATE,                 -- Hire Date
    SAL      NUMERIC(7, 2),        -- Salary
    COMM     NUMERIC(7, 2),        -- Commission
    DEPTNO   SMALLINT,             -- Department Number
    
    -- Foreign Key Constraint
    CONSTRAINT FK_DEPTNO FOREIGN KEY (DEPTNO) REFERENCES DEPT(DEPTNO)
);

-- 3. Data Insertion (DEPT)
INSERT INTO DEPT VALUES (10, 'ACCOUNTING', 'NEW YORK');
INSERT INTO DEPT VALUES (20, 'RESEARCH', 'DALLAS');
INSERT INTO DEPT VALUES (30, 'SALES', 'CHICAGO');
INSERT INTO DEPT VALUES (40, 'OPERATIONS', 'BOSTON');

-- 4. Data Insertion (EMP)
INSERT INTO EMP (EMPNO, ENAME, JOB, MGR, HIREDATE, SAL, DEPTNO)
VALUES (7839, 'KING', 'PRESIDENT', NULL, '1981-11-17', 5000, 10);
INSERT INTO EMP (EMPNO, ENAME, JOB, MGR, HIREDATE, SAL, COMM, DEPTNO)
VALUES (7654, 'MARTIN', 'SALESMAN', 7698, '1981-09-28', 1250, 1400, 30);

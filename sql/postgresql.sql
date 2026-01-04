#트랜젝션 정보 확인
##접속된 사용자 확인
SELECT pid, datname, usename, query FROM pg_stat_activity;
##Active 세션 확인
SELECT datname, usename, state, query FROM pg_stat_activity WHERE state = 'active';
##현재 실행중인 SQL 상태 정보 확인
SELECT
    current_timestamp - query_start AS runtime,
    datname, usename, query
FROM pg_stat_activity
WHERE state = 'active' ORDER BY 1 DESC;
##1분 이상 실행되는 쿼리 확인
SELECT
    current_timestamp - query_start AS runtime,
    datname, usename, query
FROM pg_stat_activity
WHERE state = 'active'
      AND current_timestamp - query_start > '1 min'
ORDER BY 1 DESC;
##Query block user 찾기
SELECT
    w.query AS waiting_query,
    w.pid AS waiting_pid,
    w.usename AS waiting_user,
    l.query AS locking_query,
    l.pid AS locking_pid,
    l.usename AS locking_user,
    t.schemaname || '.' || t.relname AS tablename
 FROM pg_stat_activity w
       JOIN pg_locks l1 ON w.pid = l1.pid AND NOT l1.granted
       JOIN pg_locks l2 ON l1.relation = l2.relation AND l2.granted
       JOIN pg_stat_activity l ON l2.pid = l.pid
       JOIN pg_stat_user_tables t ON l1.relation = t.relid
 WHERE w.waiting;
##Lock 발생 쿼리 확인
SELECT
           lock1.pid AS locked_pid,
           stat1.usename AS locked_user,
           stat1.query AS locked_statement,
           stat1.state AS state,
           stat2.query AS locking_statement,
           stat2.state AS state,
           now()- stat1.query_start AS locking_duration,
           lock2.pid AS locking_pid,
           stat2.usename AS locking_user
FROM
           pg_catalog.pg_locks lock1
JOIN pg_catalog.pg_stat_activity stat1 ON
           lock1.pid = stat1.pid
JOIN pg_catalog.pg_locks lock2 ON
           (
                     lock1.locktype,
                     lock1.database,
                     lock1.relation,
                     lock1.page,
                     lock1.tuple,
                     lock1.virtualxid,
                     lock1.transactionid,
                     lock1.classid,
                     lock1.objid,
                     lock1.objsubid
           ) IS NOT DISTINCT
FROM
           (
                     lock2.locktype,
                     lock2.DATABASE,
                     lock2.relation,
                     lock2.page,
                     lock2.tuple,
                     lock2.virtualxid,
                     lock2.transactionid,
                     lock2.classid,
                     lock2.objid,
                     lock2.objsubid
           )
JOIN pg_catalog.pg_stat_activity stat2 ON
           lock2.pid = stat2.pid
WHERE
           NOT lock1.granted
           AND lock2.granted;
##Long run SQL 확인
SELECT
    current_timestamp - query_start AS runtime,
    datname, usename, query
FROM pg_stat_activity
WHERE state = 'active'
      AND current_timestamp - query_start > '1 min'
ORDER BY 1 DESC;
#사용량 정보 확인
##데이타베이스 사용량확인
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;
##테이블 스페이스 사이즈 확인
select spcname, pg_size_pretty(pg_tablespace_size(spcname)) from pg_tablespace;
##테이블 사이즈 확인
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables where schemaname NOT IN ('utl_file','information_schema','pg_catalog');
##인덱스 사이즈 확인
SELECT indexname, pg_size_pretty(pg_total_relation_size(schemaname||'.'||indexname)) FROM pg_indexes where schemaname NOT IN ('utl_file','information_schema','pg_catalog');
#Vacuum 관련
WITH vbt AS (SELECT setting AS autovacuum_vacuum_threshold FROM
pg_settings WHERE name = 'autovacuum_vacuum_threshold')
, vsf AS (SELECT setting AS autovacuum_vacuum_scale_factor FROM
pg_settings WHERE name = 'autovacuum_vacuum_scale_factor')
, fma AS (SELECT setting AS autovacuum_freeze_max_age FROM
pg_settings WHERE name = 'autovacuum_freeze_max_age')
, sto AS (select opt_oid, split_part(setting, '=', 1) as param,
split_part(setting, '=', 2) as value from (select oid opt_oid,
unnest(reloptions) setting from pg_class) opt)
SELECT
    '"'||ns.nspname||'"."'||c.relname||'"' as relation
    , pg_size_pretty(pg_table_size(c.oid)) as table_size
    , age(relfrozenxid) as xid_age
    , coalesce(cfma.value::float, autovacuum_freeze_max_age::float)
autovacuum_freeze_max_age
    , (coalesce(cvbt.value::float, autovacuum_vacuum_threshold::float)
+ coalesce(cvsf.value::float,autovacuum_vacuum_scale_factor::float) *
pg_table_size(c.oid)) as autovacuum_vacuum_tuples
    , n_dead_tup as dead_tuples
FROM pg_class c join pg_namespace ns on ns.oid = c.relnamespace
join pg_stat_all_tables stat on stat.relid = c.oid
join vbt on (1=1) join vsf on (1=1) join fma on (1=1)
left join sto cvbt on cvbt.param = 'autovacuum_vacuum_threshold' and
c.oid = cvbt.opt_oid
left join sto cvsf on cvsf.param = 'autovacuum_vacuum_scale_factor' and
c.oid = cvsf.opt_oid
left join sto cfma on cfma.param = 'autovacuum_freeze_max_age' and
c.oid = cfma.opt_oid
WHERE c.relkind = 'r' and nspname <> 'pg_catalog'
and (
    age(relfrozenxid) >= coalesce(cfma.value::float,
autovacuum_freeze_max_age::float)
    or
    coalesce(cvbt.value::float, autovacuum_vacuum_threshold::float) +
coalesce(cvsf.value::float,autovacuum_vacuum_scale_factor::float) *
pg_table_size(c.oid) <= n_dead_tup
   -- or 1 = 1
)
ORDER BY age(relfrozenxid) DESC LIMIT 50;



-- 모두의 성장 2.4: 상품·서비스 등록 정보 확장
-- 기존 offers 데이터와 회원 계정은 삭제하거나 초기화하지 않습니다.
-- 기존 offers 테이블에 상품 영업정보 컬럼만 추가합니다.

alter table public.offers
  add column if not exists revenue_model text,
  add column if not exists price_type text,
  add column if not exists price_amount numeric(14,2),
  add column if not exists target_customers text,
  add column if not exists supply_regions text,
  add column if not exists key_strength text;

alter table public.offers
  drop constraint if exists offers_revenue_model_check;
alter table public.offers
  add constraint offers_revenue_model_check
  check (revenue_model is null or revenue_model in ('one_time','recurring','mixed'));

alter table public.offers
  drop constraint if exists offers_price_type_check;
alter table public.offers
  add constraint offers_price_type_check
  check (price_type is null or price_type in ('quote','fixed'));

alter table public.offers
  drop constraint if exists offers_price_amount_nonnegative_check;
alter table public.offers
  add constraint offers_price_amount_nonnegative_check
  check (price_amount is null or price_amount >= 0);

comment on column public.offers.revenue_model is '수익 모델: one_time(일회성), recurring(정기·반복), mixed(최초 계약+유지관리)';
comment on column public.offers.price_type is '가격 방식: quote(별도 견적), fixed(판매가격 입력)';
comment on column public.offers.price_amount is '판매가격(원), 별도 견적이면 NULL';
comment on column public.offers.target_customers is '주요 고객층';
comment on column public.offers.supply_regions is '공급 가능 지역';
comment on column public.offers.key_strength is '상품·서비스 핵심 경쟁력';

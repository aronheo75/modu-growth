-- 모두의 성장 2.5: 상품 정보 확장 + 관리자 승인 권한 보호
-- 기존 회원, 로그인, profiles, offers 데이터는 삭제/초기화하지 않습니다.
-- 기존 offers 테이블에 컬럼/제약/트리거만 추가합니다.
-- Supabase SQL Editor에서 실행 전 백업을 권장합니다.

-- 1) 상품 영업정보 컬럼 추가 (기존 행은 NULL로 유지)
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS revenue_model text,
  ADD COLUMN IF NOT EXISTS price_type text,
  ADD COLUMN IF NOT EXISTS price_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS target_customers text,
  ADD COLUMN IF NOT EXISTS supply_regions text,
  ADD COLUMN IF NOT EXISTS key_strength text;

-- 2) 입력값 검증
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_revenue_model_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_revenue_model_check
  CHECK (revenue_model IS NULL OR revenue_model IN ('one_time','recurring','mixed'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_price_type_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_price_type_check
  CHECK (price_type IS NULL OR price_type IN ('quote','fixed'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_price_amount_nonnegative_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_price_amount_nonnegative_check
  CHECK (price_amount IS NULL OR price_amount >= 0);

COMMENT ON COLUMN public.offers.revenue_model IS '수익 모델: one_time(일회성), recurring(정기·반복), mixed(최초 계약+유지관리)';
COMMENT ON COLUMN public.offers.price_type IS '가격 방식: quote(별도 견적), fixed(판매가격 입력)';
COMMENT ON COLUMN public.offers.price_amount IS '판매가격(원), 별도 견적이면 NULL';
COMMENT ON COLUMN public.offers.target_customers IS '주요 고객층';
COMMENT ON COLUMN public.offers.supply_regions IS '공급 가능 지역';
COMMENT ON COLUMN public.offers.key_strength IS '상품·서비스 핵심 경쟁력';

-- 3) 기업회원의 상태 위조 방지
-- 기업회원이 INSERT 시 status를 직접 active로 보내더라도 pending으로 강제합니다.
-- 기업회원은 UPDATE에서 status를 변경할 수 없고, admin 역할만 상태를 변경할 수 있습니다.
CREATE OR REPLACE FUNCTION public.guard_offer_status_by_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT p.role
    INTO actor_role
    FROM public.profiles AS p
   WHERE p.id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(actor_role, '') <> 'admin' THEN
      NEW.status := 'pending';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND COALESCE(actor_role, '') <> 'admin' THEN
      RAISE EXCEPTION '상품 승인 상태는 플랫폼 관리자만 변경할 수 있습니다.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_guard_status_by_role ON public.offers;
CREATE TRIGGER offers_guard_status_by_role
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.guard_offer_status_by_role();

-- 트리거 함수는 테이블 트리거를 통해서만 사용합니다.
REVOKE ALL ON FUNCTION public.guard_offer_status_by_role() FROM PUBLIC;

-- 참고: 기존 offers RLS 정책은 이 마이그레이션에서 삭제하거나 완화하지 않습니다.
-- 기존 offers_update_owner 정책이 본인 소유 행의 일반 필드 수정을 허용하더라도,
-- 위 트리거가 기업회원의 status 변경을 차단합니다.

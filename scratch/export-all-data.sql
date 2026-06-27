-- =====================================================
-- EXECUTE NO PROJETO ANTIGO (gsdweukrawfmgqprngyl)
-- SQL Editor → New Query → Cole isto → Run
-- Depois copie o resultado e me envie
-- =====================================================

SELECT json_build_object(
  'providers',           (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.providers) t),
  'audit_logs',          (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.audit_logs) t),
  'attendance',          (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.attendance) t),
  'vehicles',            (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.vehicles) t),
  'fuel_supplies',       (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.fuel_supplies) t),
  'fuel_audit_logs',     (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.fuel_audit_logs) t),
  'face_descriptors',    (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.face_descriptors) t),
  'monthly_evaluations', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.monthly_evaluations) t),
  'service_swaps',       (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.service_swaps) t),
  'station_nicknames',   (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.station_nicknames) t),
  'sys_config',          (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.sys_config) t),
  'profiles',            (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM public.profiles) t)
) AS backup;

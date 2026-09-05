-- PALE ASCENDANCY — ADMIN PERMISSIONS V1
-- Execute once in Supabase SQL Editor.
-- Existing administrators are preserved. The first existing admin is marked as owner if none exists.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true}'::jsonb;

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin','moderator'));

UPDATE public.admin_users
SET is_owner = true,
    role = 'admin',
    permissions = '{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true}'::jsonb
WHERE user_id = (
  SELECT user_id FROM public.admin_users ORDER BY created_at ASC LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE is_owner = true);

CREATE OR REPLACE FUNCTION public.admin_has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE a.user_id = auth.uid()
      AND (
        a.is_owner = true
        OR COALESCE((a.permissions ->> p_permission)::boolean, false) = true
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_access()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'user_id', a.user_id,
      'role', a.role,
      'is_owner', a.is_owner,
      'permissions', a.permissions
    )
    FROM public.admin_users a
    WHERE a.user_id = auth.uid()
  ), jsonb_build_object('is_owner',false,'role',null,'permissions','{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  role text,
  is_owner boolean,
  permissions jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id, u.email::text, a.role, a.is_owner, a.permissions, a.created_at
  FROM public.admin_users a
  JOIN auth.users u ON u.id = a.user_id
  WHERE public.admin_has_permission('admins') OR EXISTS (
    SELECT 1 FROM public.admin_users me WHERE me.user_id = auth.uid() AND me.is_owner = true
  )
  ORDER BY a.is_owner DESC, a.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.upsert_admin_user(
  p_email text,
  p_role text,
  p_permissions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_permissions jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true) THEN
    RAISE EXCEPTION 'Somente o administrador principal pode gerenciar administradores';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta com este e-mail ainda não existe na Pale Ascendancy';
  END IF;

  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION 'A conta principal não precisa ser adicionada novamente';
  END IF;

  IF p_role NOT IN ('admin','moderator') THEN
    RAISE EXCEPTION 'Nível administrativo inválido';
  END IF;

  v_permissions := COALESCE(p_permissions, '{}'::jsonb);
  INSERT INTO public.admin_users(user_id, role, is_owner, permissions)
  VALUES (v_user_id, p_role, false, v_permissions)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        is_owner = false;

  RETURN jsonb_build_object('success',true,'user_id',v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_user_role(
  p_user_id uuid,
  p_role text,
  p_permissions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true) THEN
    RAISE EXCEPTION 'Somente o administrador principal pode alterar permissões';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'O administrador principal não pode perder o acesso principal';
  END IF;

  IF p_role NOT IN ('admin','moderator') THEN
    RAISE EXCEPTION 'Nível administrativo inválido';
  END IF;

  UPDATE public.admin_users
  SET role = p_role,
      permissions = COALESCE(p_permissions,'{}'::jsonb),
      is_owner = false
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrador não encontrado';
  END IF;

  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_profile_id uuid,
  p_patch jsonb
)
RETURNS public.profile
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profile;
  v_patch jsonb := COALESCE(p_patch,'{}'::jsonb);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso administrativo necessário';
  END IF;

  IF (v_patch ? 'is_featured' OR v_patch ? 'professional_login_enabled' OR v_patch ? 'is_editor' OR v_patch ? 'is_designer')
     AND NOT public.admin_has_permission('professionals') THEN
    RAISE EXCEPTION 'Você não possui permissão para gerenciar profissionais';
  END IF;

  IF (v_patch ? 'professional_plan' OR v_patch ? 'portfolio_limit' OR v_patch ? 'plan_status' OR v_patch ? 'plan_expires_at')
     AND NOT public.admin_has_permission('plans') THEN
    RAISE EXCEPTION 'Você não possui permissão para gerenciar planos';
  END IF;

  UPDATE public.profile
  SET
    is_featured = CASE WHEN v_patch ? 'is_featured' THEN (v_patch->>'is_featured')::boolean ELSE is_featured END,
    professional_login_enabled = CASE WHEN v_patch ? 'professional_login_enabled' THEN (v_patch->>'professional_login_enabled')::boolean ELSE professional_login_enabled END,
    is_editor = CASE WHEN v_patch ? 'is_editor' THEN (v_patch->>'is_editor')::boolean ELSE is_editor END,
    is_designer = CASE WHEN v_patch ? 'is_designer' THEN (v_patch->>'is_designer')::boolean ELSE is_designer END,
    professional_plan = CASE WHEN v_patch ? 'professional_plan' THEN v_patch->>'professional_plan' ELSE professional_plan END,
    portfolio_limit = CASE WHEN v_patch ? 'portfolio_limit' THEN (v_patch->>'portfolio_limit')::integer ELSE portfolio_limit END,
    plan_status = CASE WHEN v_patch ? 'plan_status' THEN v_patch->>'plan_status' ELSE plan_status END,
    plan_expires_at = CASE WHEN v_patch ? 'plan_expires_at' THEN NULLIF(v_patch->>'plan_expires_at','')::timestamptz ELSE plan_expires_at END
  WHERE id = p_profile_id
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  RETURN v_profile;
END;
$$;

-- Review of professional applications is restricted to the applications permission.
CREATE OR REPLACE FUNCTION public.review_professional_application(
    p_application_id uuid,
    p_decision text
)
RETURNS public.professional_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    app public.professional_applications;
    admin_profile uuid;
    result public.professional_applications;
BEGIN
    IF NOT public.admin_has_permission('applications') THEN
        RAISE EXCEPTION 'Você não possui permissão para analisar solicitações';
    END IF;
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Decisão inválida';
    END IF;
    SELECT id INTO admin_profile FROM public.profile WHERE id = auth.uid() LIMIT 1;
    SELECT * INTO app FROM public.professional_applications WHERE id = p_application_id FOR UPDATE;
    IF app.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
    IF app.status <> 'pending' THEN RAISE EXCEPTION 'Esta solicitação já foi analisada'; END IF;

    IF p_decision = 'approved' THEN
        UPDATE public.profile
        SET is_editor = (app.requested_role IN ('editor','editor_designer')),
            is_designer = (app.requested_role IN ('designer','editor_designer')),
            professional_login_enabled = true
        WHERE id = app.profile_id;
    ELSE
        UPDATE public.profile SET professional_login_enabled = false WHERE id = app.profile_id;
    END IF;

    UPDATE public.professional_applications
    SET status = p_decision, reviewed_at = now(), reviewed_by = admin_profile
    WHERE id = app.id
    RETURNING * INTO result;
    RETURN result;
END;
$$;

-- Appearance save requires the appearance permission.
-- This replaces the existing function if present, preserving its expected signature.
CREATE OR REPLACE FUNCTION public.save_site_appearance(p_settings jsonb)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned jsonb;
  v_row public.site_settings;
BEGIN
  IF NOT public.admin_has_permission('appearance') THEN
    RAISE EXCEPTION 'Você não possui permissão para alterar a aparência';
  END IF;

  cleaned := jsonb_build_object(
    'primary', lower(coalesce(p_settings->>'primary','#9fe8ff')),
    'secondary', lower(coalesce(p_settings->>'secondary','#a894ff')),
    'background', lower(coalesce(p_settings->>'background','#09080d')),
    'text', lower(coalesce(p_settings->>'text','#f7f4fb')),
    'accent', lower(coalesce(p_settings->>'accent','#e9cf91')),
    'muted', lower(coalesce(p_settings->>'muted','#9c94a8')),
    'text_soft', lower(coalesce(p_settings->>'text_soft','#ddd6e8')),
    'line', coalesce(p_settings->>'line','rgba(235,225,250,.12)'),
    'line_strong', coalesce(p_settings->>'line_strong','rgba(235,225,250,.22)'),
    'button_mode', coalesce(p_settings->>'button_mode','gradient'),
    'surface_preset', coalesce(p_settings->>'surface_preset','obsidian'),
    'font_preset', coalesce(p_settings->>'font_preset','modern'),
    'card_bg', coalesce(p_settings->>'card_bg','rgba(12,10,17,.86)'),
    'card_border', coalesce(p_settings->>'card_border','rgba(255,255,255,.11)'),
    'card_shadow', coalesce(p_settings->>'card_shadow','0 18px 60px rgba(0,0,0,.22)'),
    'card_hover', coalesce(p_settings->>'card_hover','0 24px 70px rgba(0,0,0,.34)'),
    'radius', coalesce(p_settings->>'radius','22px'),
    'font_display', coalesce(p_settings->>'font_display','"Space Grotesk",system-ui,sans-serif'),
    'font_body', coalesce(p_settings->>'font_body','"Manrope",system-ui,sans-serif'),
    'font_mono', coalesce(p_settings->>'font_mono','"JetBrains Mono",monospace'),
    'button_text', lower(coalesce(p_settings->>'button_text','#061018'))
  );

  IF NOT (cleaned->>'primary' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'secondary' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'background' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'text' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'accent' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'muted' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'text_soft' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'button_mode' IN ('gradient','solid','outline','glass','minimal')
      AND cleaned->>'surface_preset' IN ('obsidian','glass','soft','neon','editorial','minimal')
      AND cleaned->>'font_preset' IN ('modern','editorial','clean','neo','elegant','technical')) THEN
    RAISE EXCEPTION 'Configuração visual inválida';
  END IF;

  UPDATE public.site_settings
     SET settings = cleaned, updated_at = now()
   WHERE id = true
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    INSERT INTO public.site_settings(id, settings) VALUES (true, cleaned) RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_admin_user(text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_user_role(uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_professional_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_site_appearance(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

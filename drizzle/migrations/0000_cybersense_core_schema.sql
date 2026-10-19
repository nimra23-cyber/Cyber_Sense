-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  skill text NOT NULL CHECK (skill IN ('phishing','incident','code')),
  item_id text NOT NULL,
  correct boolean NOT NULL,
  points int NOT NULL CHECK (points BETWEEN 0 AND 10),
  max_points int NOT NULL CHECK (max_points BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_idx ON public.attempts(user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts read" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own attempts insert" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attempts delete" ON public.attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.mission_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mission_key text NOT NULL,
  skill text NOT NULL CHECK (skill IN ('phishing','incident','code')),
  title text NOT NULL,
  score int NOT NULL CHECK (score >= 0),
  max_score int NOT NULL CHECK (max_score > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (score <= max_score)
);
CREATE INDEX missions_user_idx ON public.mission_completions(user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.mission_completions TO authenticated;
GRANT ALL ON public.mission_completions TO service_role;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own missions read" ON public.mission_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own missions insert" ON public.mission_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own missions delete" ON public.mission_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_events_created_idx ON public.login_events(created_at);
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM login_events WHERE user_id = auth.uid() AND created_at > now() - interval '10 seconds') THEN RETURN; END IF;
  INSERT INTO login_events(user_id) VALUES (auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.record_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'login_events', (SELECT count(*) FROM login_events),
    'unique_login_users', (SELECT count(DISTINCT user_id) FROM login_events),
    'signups_7d', (SELECT count(*) FROM profiles WHERE created_at > now() - interval '7 days'),
    'recent_signups', COALESCE((SELECT jsonb_agg(r) FROM (SELECT full_name, email, created_at FROM profiles ORDER BY created_at DESC LIMIT 10) r), '[]'::jsonb),
    'daily_logins', COALESCE((SELECT jsonb_agg(d ORDER BY d.day) FROM (
        SELECT gs::date AS day,
          (SELECT count(*) FROM login_events WHERE created_at::date = gs::date) AS events,
          (SELECT count(DISTINCT user_id) FROM login_events WHERE created_at::date = gs::date) AS users
        FROM generate_series(current_date - 13, current_date, interval '1 day') gs) d), '[]'::jsonb),
    'missions', COALESCE((SELECT jsonb_agg(m) FROM (
        SELECT skill, count(*) AS completions, count(DISTINCT user_id) AS users,
          round(avg(score::numeric * 100 / max_score)) AS avg_pct
        FROM mission_completions GROUP BY skill ORDER BY skill) m), '[]'::jsonb),
    'total_completions', (SELECT count(*) FROM mission_completions)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, left(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 100), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('pre','post')),
  score integer NOT NULL,
  total integer NOT NULL,
  by_skill jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assessments read" ON public.assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own assessments insert" ON public.assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own assessments delete" ON public.assessments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(u ORDER BY u.created_at DESC) FROM (
      SELECT p.id, p.full_name, p.email, p.created_at,
        (au.email_confirmed_at IS NOT NULL) AS email_verified,
        au.last_sign_in_at,
        (SELECT count(*) FROM login_events le WHERE le.user_id = p.id) AS login_count,
        (SELECT count(*) FROM mission_completions mc WHERE mc.user_id = p.id) AS mission_count,
        (SELECT count(*) FROM attempts a WHERE a.user_id = p.id) AS attempt_count
      FROM profiles p JOIN auth.users au ON au.id = p.id
    ) u
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_logins(_limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM login_events),
    'rows', COALESCE((
      SELECT jsonb_agg(r) FROM (
        SELECT le.id, le.user_id, le.created_at, p.full_name, p.email
        FROM login_events le LEFT JOIN profiles p ON p.id = le.user_id
        ORDER BY le.created_at DESC
        LIMIT least(greatest(_limit, 1), 200) OFFSET greatest(_offset, 0)
      ) r
    ), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_user_progress(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'profile', (SELECT jsonb_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'created_at', p.created_at) FROM profiles p WHERE p.id = _user_id),
    'missions', COALESCE((SELECT jsonb_agg(m ORDER BY m.created_at DESC) FROM (SELECT mission_key, skill, title, score, max_score, created_at FROM mission_completions WHERE user_id = _user_id) m), '[]'::jsonb),
    'attempts', COALESCE((SELECT jsonb_agg(a ORDER BY a.created_at DESC) FROM (SELECT skill, item_id, correct, points, max_points, created_at FROM attempts WHERE user_id = _user_id) a), '[]'::jsonb),
    'assessments', COALESCE((SELECT jsonb_agg(s ORDER BY s.created_at DESC) FROM (SELECT kind, score, total, by_skill, created_at FROM assessments WHERE user_id = _user_id) s), '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_logins(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_logins(int, int) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_user_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_progress(uuid) TO authenticated;

-- One-time admin bootstrap: only works while no admin exists, and only for a confirmed email.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL) THEN RETURN false; END IF;
  INSERT INTO user_roles(user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin')
$$;
REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

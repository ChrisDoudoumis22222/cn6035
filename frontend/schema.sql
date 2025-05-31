
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  salt text,
  password_hash text,
  avatar_url text,
  auth_token uuid,
  token_expires_at timestamp with time zone,
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booked_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved boolean DEFAULT false,
  owner_id uuid,
  customer_name character varying,
  customer_email character varying,
  party_size integer DEFAULT 1,
  duration_minutes integer DEFAULT 120 CHECK (duration_minutes IS NULL OR duration_minutes >= 30 AND duration_minutes <= 480),
  customer_phone character varying,
  table_id integer,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'declined'::character varying, 'cancelled'::character varying]::text[])),
  accept_code text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT bookings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  category text NOT NULL DEFAULT 'General'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  salt text NOT NULL DEFAULT ''::text,
  password_hash text NOT NULL DEFAULT ''::text,
  full_name text,
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  created_at timestamp with time zone DEFAULT now(),
  category_id integer,
  image_urls ARRAY,
  image_url text,
  menu_pdf_url text,
  owner_id uuid,
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT stores_category_fk FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.table_bookings (
  id integer NOT NULL DEFAULT nextval('table_bookings_id_seq'::regclass),
  table_id integer,
  booking_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT table_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT table_bookings_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT table_bookings_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id)
);
CREATE TABLE public.tables (
  id integer NOT NULL DEFAULT nextval('tables_id_seq'::regclass),
  name text NOT NULL,
  capacity integer,
  menu_image_url text,
  store_id uuid,
  category text NOT NULL DEFAULT 'Indoor'::text,
  location text,
  is_indoor boolean NOT NULL DEFAULT true,
  smoking_allowed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available'::text,
  owner_id uuid,
  description text,
  is_active boolean DEFAULT true,
  CONSTRAINT tables_pkey PRIMARY KEY (id),
  CONSTRAINT tables_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT tables_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
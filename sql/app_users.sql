
CREATE TABLE public.app_users (
	user_id serial4 NOT NULL,
	email varchar(255) NOT NULL,
	username varchar(50) NOT NULL,
	password_hash varchar(255) NOT NULL,
	login_count int4 DEFAULT 0 NULL,
	is_locked bool DEFAULT false NULL,
	failed_attempts int4 DEFAULT 0 NULL,
	last_login_at timestamptz(3) NULL,
	created_at timestamptz(3) DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz(3) DEFAULT CURRENT_TIMESTAMP NULL,
	role_id int4 NULL,
	CONSTRAINT app_users_email_key UNIQUE (email),
	CONSTRAINT app_users_pkey PRIMARY KEY (user_id),
	CONSTRAINT app_users_username_key UNIQUE (username)
);


-- public.app_users foreign keys

ALTER TABLE public.app_users ADD CONSTRAINT app_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);
# Better Auth Nuxt Module _(for personal use case)_

This project is a starter template which requires basic authentication in [Nuxt](https://nuxt.com/) using [Better Auth](https://better-auth.com/).
Most of code in the project is taken from [nuxt-modules/better-auth](http://github.com/nuxt-modules/better-auth).

## Why this was made?

- The [nuxt-modules/better-auth](http://github.com/nuxt-modules/better-auth) already is a solid module with all native nuxt related stuff. But the module does not support dynamic `baseURL` feature of Better Auth which for my use case is required.
- It may be added in future but for now as per my need I just made this project so that I can add to my own project.

## Who this is for

- Anyone can use it who need basic authentication of Better Auth in your Nuxt app and don't want to use [nuxt-modules/better-auth](http://github.com/nuxt-modules/better-auth).
- For more in-built feature such as NuxtHub it recommanded to use [nuxt-modules/better-auth](http://github.com/nuxt-modules/better-auth).

## Requirement

- Nuxt 4.0 or newer
- Node.js `^22.19.0`, `^24.11.0`, or `>=26.0.0`
- A Better Auth `^1.7.0`.
- Postgresql `^17.0` and `pg`.
- Drizzle ORM `^0.45`.

## Installation

- Download `zip` file, extract it, run `pnpm i` and its done.
- Or, use `git clone --depth 1` to clone latest history and delete `.git` _(important)_.

## Step after installation

1. Create `.env` file in root directory and define `NUXT_BETTER_AUTH_SECRET` and `NUXT_DATABASE_URL`.
2. Generate database migration file by running `pnpm db:generate`.
3. Migrate to database by running `pnpm db:migrate`. You can check the database by running `pnpm db:studio`.
4. Run `pnpm dev` to run nuxt development server.

If goes well, your terminal and typescript will happy and you app will be running as expected on http://localhost:3000.

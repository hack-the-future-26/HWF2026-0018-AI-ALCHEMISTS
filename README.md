# PeerSpace

PeerSpace is a college-exclusive peer learning and collaboration platform. Students search by skill, connect directly, schedule sessions, review each other, and form project teams without feed ranking.

## Run Locally

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`. The API runs at `http://localhost:4000`.

Supabase is optional for local UI exploration. Without Supabase env vars, the frontend uses sample campus data and the API exposes an in-memory contract. Add the values from `.env.example`, run `supabase/schema.sql` in your Supabase SQL editor, and enable auth email confirmations for a real project.

## Scripts

```bash
npm run dev       # web + api
npm run build     # typecheck + production bundle
npm run preview   # preview production bundle
npm run api       # api only
```

## Supabase

The SQL schema includes all requested tables, RLS policies, helper functions, and realtime publication setup:

- users
- skills
- user_skills
- conversations
- messages
- sessions
- reviews
- campus_feed
- collaborations
- collab_applications
- notifications

Realtime is configured for messages, notifications, sessions, and collab_applications.

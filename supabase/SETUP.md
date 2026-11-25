# Supabase setup for Color Me!

1. Create a project at supabase.com.
2. SQL Editor -> New query -> paste `supabase/schema.sql` -> Run.
3. Project Settings -> API: copy the **Project URL** and the **anon public** key
   into the top of `js/supabase.js`.
4. Authentication -> Providers -> Email: for classroom testing, turn OFF
   "Confirm email" so teachers can log in right after creating an account.
5. Open `index.html` (use a local server, e.g. `npx serve` or VS Code Live Server).

Tables: profiles, classes, students (login database) and activity_log (student activity log).

# Express Server Starter (through Who Can Edit What)

This is a working web server with every lesson done up to and including **Who Can Edit What**:

- **Accounts:** register, log in (with "Remember me"), log out. Passwords are hashed with bcrypt.
- **An admin account** made automatically from your settings, and an admin-only dashboard
- **A guestbook** with full CRUD: post, read, edit and delete messages
- **Ownership rules:** you can only edit or delete your own messages, but the admin can change any of them
- **Server validation** and a bad-words filter
- **A NASA picture of the day** page, with your API key kept on the server, a cache and its own rate limiter
- **Security:** Helmet headers, rate limiters, safe cookie settings, a 404 page and an error handler

Use it to catch up. The next lesson is **Important Security Update: Stopping Form Bots**.

## Setup

1. **Check Node.** Run `node -v`. You need version 20 or higher.
2. **Install packages.** In this folder, run:

   ```bash
   npm install
   ```

3. **Create your `.env` file.** Copy `.env.example` to a new file named `.env`, then fill in real values:
   - `SESSION_SECRET`: any long random string
   - `NASA_API_KEY`: your free key from api.nasa.gov
   - `ADMIN_USERNAME`: the admin's username, 3 to 20 lowercase letters, numbers or underscores
   - `ADMIN_PASSWORD`: the admin's password, at least 8 characters

4. **Start the server:**

   ```bash
   npm start
   ```

   The first time, you should see `Created admin account`.

5. **Open** http://localhost:3000 and log in with your admin username and password.

## Try it out

1. Post a message in the guestbook as the admin.
2. Log out, then click **Make an account** and register a second user.
3. As that user, post a message. You can edit and delete **your** message, but the admin's message has no buttons.
4. Log back in as the admin. You can edit and delete **every** message, and the **Dashboard** page works.

## The files

| File | What it does |
| --- | --- |
| `server.js` | The server: settings, middleware and all the routes |
| `db.js` | The only file that reads and writes `users.json` and `guestbook.json` |
| `public/` | The pages, `styles.css`, and each page's script in `public/js/` |
| `users.json`, `guestbook.json` | Made by the server when it needs them. **Do not create or upload these.** |

## Make it yours

The pages in `public/` are plain on purpose. Restyle `styles.css`, rewrite the page text and add your own pages. Keep the element `id`s (like `#guestbook-form`, `#msg` and `#form-error`) the same, because the scripts in `public/js/` use them, and so do the next lessons.

## Deploying to Render

1. **Upload this project to GitHub** through the web interface. Do **not** upload `.env`, `node_modules`, `users.json`, `guestbook.json` or `server.log`. The web upload ignores `.gitignore`, so leave them out yourself.
2. In Render, set the **Build Command** to `npm install` and the **Start Command** to `npm start`.
3. In Render's **Environment** settings, add `SESSION_SECRET`, `NASA_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `NODE_ENV` set to `production`.
4. After it deploys, check Render's **Logs** for `Created admin account`, then log in on your live site.

**Why not upload `users.json`?** It would hold the admin password from your computer's `.env`. The server would see that an admin already exists and skip making one from Render's settings, so you could not log in.

**Accounts and messages disappear on Render's free plan.** The server's files are erased whenever it restarts or redeploys. The admin account comes back automatically, but other accounts and messages are lost. Your code is not broken: this is exactly what the database lesson will fix.

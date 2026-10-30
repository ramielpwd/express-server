# Important Security Update: Stopping Form Bots

Sep 30, 2026 · @Kevin

## Overview

As soon as a site is live on the internet, automated programs called **bots** start finding its forms and filling them with spam: ads, junk links and scam messages. Your guestbook is a perfect target.

You will add two free defenses that are invisible to real people:

| Defense | The trick | Why it works |
| --- | --- | --- |
| **Honeypot** | A hidden form field that humans never see and never fill in | Simple bots fill in **every** field they find. If the hidden one has a value, it was a bot. |
| **Time trap** | The server records when it sent you the form, and checks how long you took | A real person needs at least several seconds to type a message. A bot submits in milliseconds. |

Together these catch most simple bots, with **zero** extra effort for real users: no puzzles, no "click all the traffic lights." Use them on every form you build.

When a bot is caught, your server will **pretend** the post worked but quietly throw it away. If the bot got an error, its creator would know to change tactics.

Files you will change: `server.js`, `guestbook.html`, your guestbook script, and `styles.css`.

## Before you start

1. **Finish Who Can Edit What first.** Both account lessons rewrite your guestbook's POST route, so adding the bot check last means it is never lost.
2. **Your guestbook script is in `public/js/guestbook.js`,** from the Helmet lesson.
3. **Make a backup** of your project folder, so you can go back if something breaks.

## Part 0: Attack your site first

Before you add any defenses, see what a spam bot can do to your guestbook. Your teacher will give you a file called `spambot.js`. It is a pretend bot that only works on `localhost`, so it can never attack anyone else's site.

**Step 1.** Make a new folder **outside** your project folder, named `bot`, and put `spambot.js` in it. Keeping it outside your project means it never gets uploaded to GitHub.

```
my-server/     <- your project
bot/
    spambot.js
```

**Step 2.** Start your server in one terminal as usual. Open a **second** terminal, go into the `bot` folder, and run:

```bash
node spambot.js
```

The bot makes an account called `spambot`, logs in, and posts 5 spam messages. At the end it tells you two numbers: how many posts it *thinks* worked, and how many were *actually saved*. Right now both should be **5 of 5**.

**Step 3.** Refresh your guestbook page in the browser. Your guestbook is full of spam.

> **Screenshot 1:** your bot terminal showing `Messages ACTUALLY saved: 5 of 5`.

**Step 4.** Clean up the spam:

```bash
node spambot.js clean
```

| Command | What the bot does |
| --- | --- |
| `node spambot.js` | Fills in every field and posts instantly, like most real bots |
| `node spambot.js sneaky` | Skips hidden fields, but still posts instantly |
| `node spambot.js smart` | Loads your page, waits 3 seconds, and skips hidden fields |
| `node spambot.js clean` | Deletes every message the bot posted |

If the bot says `Could not log in (429)`, you ran it too many times and your login rate limiter stopped it. That is a defense working! Wait 15 minutes and try again.

## Part 1: Add the honeypot field

A honeypot is a trap that looks tempting to a bot. You will add a field called `website`, since spam bots love posting links, and move it off the edge of the screen so people never see it.

**Step 1.** In `guestbook.html`, add this **inside** your `<form>`, anywhere between the other fields:

```html
<!-- Honeypot: hidden from people, bots fill it in -->
<div class="hp-field" aria-hidden="true">
    <label for="website">Leave this field empty</label>
    <input id="website" name="website" type="text" tabindex="-1" autocomplete="off" />
</div>
```

**Step 2.** Add this to `styles.css`:

```css
/* Moves the honeypot off-screen, where no person will see it */
.hp-field {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}
```

Every attribute has a job:

| Part | Why it is there |
| --- | --- |
| `left: -9999px` | Pushes the field 9,999 pixels off the left edge of the screen. It exists in the page, so bots find it, but no one can see it. |
| `tabindex="-1"` | Pressing Tab skips it, so keyboard users never land in it by accident |
| `aria-hidden="true"` | Screen readers skip it, so blind users are never asked to fill it in |
| `autocomplete="off"` | Asks the browser not to auto-fill it with the user's saved website |
| The label "Leave this field empty" | A last safety net: if anyone ever does see it, the label tells them what to do |

**Why not `display: none` or `type="hidden"`?** Those are the first things smarter bots check for, and they skip fields hidden that way. A field that is technically visible, just off-screen, fools more of them.

**Step 3.** Reload your guestbook page. It should look exactly the same as before. Now open DevTools, go to the **Elements** tab, and find the `website` input in the HTML. It is there; you just cannot see it.

## Part 2: Send the honeypot with your form

Your form sends its data with `fetch` and `JSON.stringify`, so the server only receives fields you list yourself. The honeypot has to be on that list, or the server can never check it.

**Step 1.** In `public/js/guestbook.js`, find the `body: JSON.stringify({ ... })` line in your submit handler, and add `website` next to the message:

```js
body: JSON.stringify({
    msg: document.querySelector('#msg').value,
    website: document.querySelector('#website').value
})
```

**Step 2.** Post a normal message. It should still work. In the Network tab, click the POST request and look at its **Payload**: you should see `website: ""`, an empty string, because you are a human.

## Part 3: Record when the form loads

For the time trap, the server needs to know when the visitor got the form. You could have the browser record the time and send it, but that has two problems:

- **Bots can lie.** Anything the browser sends can be faked, including a timestamp.
- **Clocks disagree.** A student's laptop clock might be minutes off from the server's clock.

Instead, the **server** writes down the time in the visitor's session at the moment it sends the guestbook page. Your session already stores things like whether someone is logged in, so it can store this too.

**Step 1.** In `server.js`, find your guestbook **page** route (the one that sends `guestbook.html`, not `/api/guestbook`) and add one line:

```js
app.get('/guestbook', requireLoginPage, (req, res) => {
    req.session.formLoadedAt = Date.now(); // start the clock
    res.sendFile(path.join(PUBLIC_DIR, 'guestbook.html'));
});
```

The only new line is `req.session.formLoadedAt = Date.now();`. Keep the rest of your route as it is.

`Date.now()` returns the current time as a number of milliseconds (since January 1, 1970). Subtracting two of these numbers tells you how many milliseconds passed between them.

## Part 4: The botCheck middleware

Both checks go into one middleware function. Like `requireAuth`, it runs **before** your route, and it only calls `next()` if the request passes.

**Step 1.** Add this to `server.js`, near your `requireAuth` function:

```js
const MIN_FILL_TIME = 2000; // 2 seconds, in milliseconds

// Writes a note about a caught bot to the console and server.log
function logBot(req, reason) {
    const line = `[${new Date().toISOString()}] BOT BLOCKED (${reason}) from ${req.ip} on ${req.path}\n`;
    console.log(line.trim());
    fs.appendFile(LOG_FILE, line, () => {});
}

// Blocks bot submissions using a honeypot and a time trap.
// Bots get a fake "success" so they don't learn they were caught.
function botCheck(req, res, next) {
    // Check 1: the honeypot. Humans leave it empty.
    if (req.body.website) {
        logBot(req, 'honeypot filled');
        return res.status(201).json({});
    }

    // Check 2: the time trap. Humans need more than 2 seconds.
    const loadedAt = req.session.formLoadedAt;
    if (!loadedAt || Date.now() - loadedAt < MIN_FILL_TIME) {
        logBot(req, 'submitted too fast');
        return res.status(201).json({});
    }

    next(); // passed both checks
}
```

Key ideas:

- **`if (req.body.website)`** is `false` for an empty string `""` and for a missing field, and `true` for anything a bot typed in.
- **`!loadedAt`** catches requests from something that never loaded your page at all, such as a script posting straight to your API.
- **`Date.now() - loadedAt`** is how many milliseconds passed since the server sent the page.
- **The fake success:** status `201` with an empty object looks like a normal post to the bot, but nothing is saved. Your page's code will just reload the list, and the message will not be there.
- **`req.ip`** is the visitor's IP address. It is accurate on Render because of `app.set('trust proxy', 1)`.

**Step 2.** Add `botCheck` to your POST guestbook route, **after** `requireAuth`:

```js
app.post('/api/guestbook', requireAuth, botCheck, async (req, res) => {
```

Keep the rest of your route exactly as it is.

The order matters: `requireAuth` first, so logged-out visitors get a clear `401`, then `botCheck`, then your route.

## Part 5: Test like a bot

Restart your server, log in, and open the guestbook page. Keep your terminal visible, so you can watch for `BOT BLOCKED` messages.

**Test 1: a normal human.** Wait a few seconds, type a message and post it. It should appear in the list as usual, with no `BOT BLOCKED` message.

**Test 2: a bot that fills every field.** Paste this into the Console to fill in the honeypot, the way a bot would:

```js
document.querySelector('#website').value = 'http://cheap-spam.example';
```

Now type a message and post it with the form. The form clears as if it worked, but the message **never appears** in the list, and your terminal shows `BOT BLOCKED (honeypot filled)`.

**Test 3: a bot that is too fast.** Two seconds is too quick to paste code by hand, so make the trap easier to trigger while testing. In `server.js`, **temporarily** change `MIN_FILL_TIME` to `10000` (10 seconds) and restart. Log in again, because restarting the server logs everyone out. Then open the guestbook page and, within 10 seconds, paste this into the Console and press Enter:

```js
fetch('/api/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg: 'Buy cheap stuff!', website: '' })
}).then(r => console.log(r.status));
```

The Console shows `201`, which looks like success, but the terminal shows `BOT BLOCKED (submitted too fast)` and the message is not saved.

**Test 4: the same request, but slower.** Wait more than 10 seconds, then run the same code again. This time it is saved, because it passed both checks. Now **change `MIN_FILL_TIME` back to `2000`** and restart.

**Test 5: check the log.** Open `server.log` and find your `BOT BLOCKED` lines. On a live site, this log is how you would find out bots are visiting.

## Part 6: Attack your site again

Now run the same bot against your protected guestbook. Keep your **server** terminal and your **bot** terminal side by side, so both show up in your screenshots.

**Step 1.** Run the dumb bot again:

```bash
node spambot.js
```

The bot still gets status `201` for every post, so it thinks it worked. But `Messages ACTUALLY saved` is now **0 of 5**, and your server terminal shows `BOT BLOCKED (honeypot filled)`.

> **Screenshot 2:** the bot terminal showing `0 of 5`, next to your server terminal showing `honeypot filled`.

**Step 2.** Run the sneaky bot, which leaves the honeypot empty:

```bash
node spambot.js sneaky
```

It is still caught, this time by the time trap: `BOT BLOCKED (submitted too fast)`.

> **Screenshot 3:** the bot terminal showing `0 of 5`, next to your server terminal showing `submitted too fast`.

**Step 3.** Run the smart bot:

```bash
node spambot.js smart
```

This one takes about 15 seconds, and it gets through: **5 of 5**. It loads your page, waits like a person, and skips the honeypot, so it passes both checks.

> **Screenshot 4:** the bot terminal showing the smart bot's `5 of 5`.

Under Screenshot 4, answer in one or two sentences: **Why did the smart bot get through, and which other layer from the table below could slow it down?**

**Step 4.** Clean up:

```bash
node spambot.js clean
```

## What these defenses can't do

Honeypots and time traps are a **filter**, not a lock. They stop lazy, automated bots, which is most of them, but a bot built specifically to attack **your** site could skip the honeypot and wait a few seconds before posting. That is exactly what the smart bot did.

That is why real sites stack several defenses in **layers**. You already have some:

| Layer | What it stops | Where you added it |
| --- | --- | --- |
| Honeypot | Bots that fill every field | This lesson |
| Time trap | Bots that submit instantly | This lesson |
| Rate limiters | Anyone sending too many requests, or guessing passwords | Your original server and the Production Readiness Checkup |
| User accounts | Anonymous posting; every message is tied to a real account | User Accounts and Password Hashing |
| Server validation | Empty, huge or malformed messages | The guestbook upgrade |

If a site is still flooded with spam after all this, the next step is a CAPTCHA service. That adds friction for real people, so it is saved for when the free layers are not enough.

## Testing checklist

- [ ] Before the lesson, the dumb bot saved 5 of 5 messages (Screenshot 1)
- [ ] The guestbook page looks exactly the same as before; the honeypot is invisible
- [ ] Pressing Tab through the form never lands in the honeypot
- [ ] A normal post, after a few seconds, still works
- [ ] The POST request's payload includes `website: ""`
- [ ] Filling the honeypot from the Console blocks the post, and the terminal shows `honeypot filled`
- [ ] A post sent too quickly after loading the page is blocked, and the terminal shows `submitted too fast`
- [ ] Blocked posts return `201`, but nothing is saved
- [ ] `BOT BLOCKED` lines appear in `server.log`
- [ ] `MIN_FILL_TIME` is set back to `2000`
- [ ] After the lesson, the dumb and sneaky bots save 0 of 5 (Screenshots 2 and 3)
- [ ] The smart bot gets through, and you explained why (Screenshot 4)
- [ ] You ran `node spambot.js clean`, and `spambot.js` is **not** in your project folder

## Stretch goals

1. **Protect your login form.** Add a honeypot to the login form on `index.html`, send it with your login request, and add `botCheck` to your `/login` route. The time trap needs the page route to record `formLoadedAt`. How will you record it for the home page, which is served by your `/` route?
2. **Count caught bots.** Keep a `botsBlocked` counter in `server.js`, increase it in `logBot`, and add it to your `/api/stats` route.
3. **Too slow is suspicious too.** Some bots load a page and submit it hours later. Reject submissions where the form was loaded more than 1 hour ago, and show a friendly "Please reload the page" error instead of a fake success. Why is a real error okay here?
4. **One post per page load.** After a successful post, reset `req.session.formLoadedAt` to the current time, so each new message also has to wait 2 seconds. Does this change anything for a real user?

## Submit

1. **Upload your changed files** to your GitHub repo in the browser: `server.js`, `guestbook.html`, `styles.css` and `public/js/guestbook.js`. As always, do not upload `.env`, `node_modules`, `users.json` or `guestbook.json`, and do not upload `spambot.js`.
2. **Wait for Render to redeploy,** then post a normal message on your live site to make sure real users are not blocked.
3. **Send your teacher the Render URL and your 4 screenshots,** with your answer under Screenshot 4.

## Grading rubric (10 points)

| Criterion | Points | Full credit | Partial credit |
| --- | --- | --- | --- |
| **Live deployment** | 1 | Render URL submitted; normal posts still work on the live site | — |
| **Honeypot field** | 2 | A `website` field inside the form, positioned off-screen with CSS, with `tabindex="-1"`, `aria-hidden="true"` and `autocomplete="off"` | 1 pt: field exists but uses `display: none` or `type="hidden"`, or is missing the accessibility attributes |
| **Honeypot sent** | 1 | The `fetch` body includes the `website` value | — |
| **Load time recorded** | 1 | The guestbook page route sets `req.session.formLoadedAt` | — |
| **botCheck middleware** | 3 | Rejects a filled honeypot, a missing load time, and submissions under 2 seconds; blocked requests get a fake `201` and nothing is saved; it runs on the POST route after `requireAuth`, and blocked attempts are logged with the reason | 2 pts: one check is missing, or it is in the wrong place, or nothing is logged. 1 pt: checks work but return an error instead of a fake success |
| **Bot test screenshots** | 2 | All 4 screenshots: 5 of 5 before; 0 of 5 for the dumb and sneaky bots after, with the matching `BOT BLOCKED` reason; the smart bot's 5 of 5 with a correct explanation | 1 pt: some screenshots are missing, or there is no explanation |
| **Total** | **10** |  |  |

> **Grading tip:** on the student's live site, open DevTools, run `document.querySelector('#website').value = 'spam'`, and post a message. It should appear to succeed but never show up in the list.

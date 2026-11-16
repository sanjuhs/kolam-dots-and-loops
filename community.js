"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const format = (ms) => {
    const seconds = Math.floor(ms / 1000);
    return (
      Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0")
    );
  };
  async function request(path, body, signal) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 10000),
      abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch("/api/" + path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) {
        const error = Error(
          result.error || result.message || "Please try again.",
        );
        error.status = response.status;
        throw error;
      }
      return result;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  function setup({
    show,
    load,
    loadPuzzleKey,
    store,
    doneSet,
    save,
    puzzleKey,
  }) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
 <section id="account" class="screen"><div class="bar"><button data-account-home>‹ Home</button><b class="serif">Your Kolam</b></div><div class="scroll accountContent">
 <div id="accountGuest"><h2>Keep your beautiful work</h2><p class="lead">Free account · save across devices · join the leaderboard. You can always play as a guest.</p>
 <div class="packOptions"><button data-form="loginForm">Sign in</button><button data-form="registerForm">Create account</button><button data-form="recoverForm">Recover account</button></div>
 <form id="loginForm" class="accountForm"><label>Username or email<input name="identifier" autocomplete="username" required maxlength="254" autocapitalize="none" spellcheck="false"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label><button type="button" class="showPassword">Show password</button><button class="primary">Sign in</button></form>
 <form id="registerForm" class="accountForm" hidden><label>Choose a username<input name="username" autocomplete="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" autocapitalize="none" spellcheck="false"></label><p class="formHelp">3–24 letters, numbers or underscores. Your username appears on leaderboards.</p><label>Choose a password<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128"></label><p class="formHelp">At least 12 characters. A few memorable words work well.</p><button type="button" class="showPassword">Show password</button><label>Email (optional)<input name="email" type="email" autocomplete="email" maxlength="254"></label><p class="formHelp" id="emailHelp">You can sign in with this email too. Save your recovery code to recover your account.</p><button class="primary">Create free account</button></form>
 <form id="recoverForm" class="accountForm" hidden><label>Username<input name="username" autocomplete="username" required maxlength="24" autocapitalize="none"></label><label>Saved recovery code<input name="code" autocomplete="off" required maxlength="80" spellcheck="false"></label><label>New password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="primary">Reset password</button></form>
 <form id="emailResetForm" class="accountForm" hidden><label>Recovery email<input name="email" type="email" autocomplete="email" required></label><button>Send reset link</button></form>
 <button id="emailResetBtn" hidden>Use email recovery</button>
 </div><div id="accountMember" hidden><h2 id="playerName"></h2><p id="playerStats" class="lead"></p><p id="playerBadge"></p><div id="recentPuzzles" class="packOptions"></div><p class="lead">Only verified solves earn leaderboard points. Practice completed before signing in can be saved without adding leaderboard points.</p><button id="importProgress">Save this phone’s completed levels</button><button id="signOut">Sign out</button><details><summary>Account settings</summary><label>Current password<input id="deletePassword" type="password" autocomplete="current-password"></label><button id="deleteAccount">Delete my account and cloud progress</button></details></div>
 <div id="recoveryBox" hidden><h2>Save your recovery code</h2><p class="lead">Keep this somewhere safe. It can reset your password without email. Each use replaces it with a new code.</p><output id="recoveryCode"></output><div class="packOptions"><button id="copyRecovery">Copy code</button><a id="downloadRecovery" download="kolam-recovery.txt">Download code</a><button id="savedRecovery">I’ve saved it</button></div></div><p id="accountStatus" role="status" aria-live="polite"></p>
 </div></section>
 <section id="leaderboard" class="screen"><div class="bar"><button data-account-home>‹ Home</button><b class="serif">Leaderboard</b></div><div class="scroll"><p class="lead">A little friendly competition. Each puzzle awards points once; a better solve can improve them. Hints reduce points. Fastest times require a solve without hints.</p><label>View<select id="leaderMode"><option value="all">All-time points</option><option value="today">Today’s points (India time)</option><option value="fastest">Fastest · last puzzle</option></select></label><p id="leaderPuzzle"></p><p id="leaderStatus" role="status"></p><ol id="leaderRows" class="leaderRows"></ol><button id="refreshLeaders">Refresh</button></div></section>`,
    );
    let flushing = false;
    let player = null,
      active = null,
      clock = null,
      sequence = 0,
      lastKey = "n-1",
      authBusy = false,
      boardRequest = 0;
    const clearClock = () => {
      if (clock) {
        clearInterval(clock);
        clock = null;
      }
    };
    const updateClock = () => {
      if (active)
        $("puzzleTimer").textContent = format(
          performance.now() - active.started,
        );
    };
    function setRecovery(code) {
      $("recoveryBox").hidden = !code;
      $("recoveryCode").textContent = code || "";
      $("downloadRecovery").href = code
        ? "data:text/plain;charset=utf-8," +
          encodeURIComponent(
            "Kolam recovery code\n" +
              code +
              "\nKeep this private. It can reset your password.",
          )
        : "";
    }
    function renderPlayer() {
      $("accountGuest").hidden = Boolean(player);
      $("accountMember").hidden = !player;
      $("accountBtn").textContent = player
        ? "Your progress · " + player.username
        : "Sign in / save progress";
      if (!player) return;
      $("recentPuzzles").replaceChildren();
      for (const key of player.progress.slice(-8)) {
        const b = document.createElement("button");
        b.textContent = key.startsWith("n-")
          ? "Level " + key.slice(2)
          : key.replace(/^[gprm]-/, "").replaceAll("-", " · ");
        b.onclick = () => loadPuzzleKey(key);
        $("recentPuzzles").appendChild(b);
      }
      $("playerName").textContent = "Hello, " + player.username;
      $("playerStats").textContent =
        `${player.stats.puzzles} ranked puzzles · ${player.stats.points} points`;
      const n = player.stats.puzzles;
      $("playerBadge").textContent =
        n >= 100
          ? "✦ Master gardener · 100 puzzles"
          : n >= 50
            ? "❀ Festival artist · 50 puzzles"
            : n >= 10
              ? "❀ Blossom keeper · 10 puzzles"
              : n >= 1
                ? "✧ First bloom"
                : "Your first bloom is waiting.";
    }
    async function refreshPlayer() {
      try {
        player = await request("me");
        for (const key of player.progress) {
          const m = key.match(/^n-(\d+)$/);
          if (m) doneSet.add(+m[1]);
        }
        store.done = [...doneSet];
        save();
        renderPlayer();
        flushOutbox();
        return true;
      } catch (e) {
        if (e.status === 401) player = null;
        renderPlayer();
        return false;
      }
    }
    async function runForm(form, fn) {
      if (authBusy) return;
      authBusy = true;
      const buttons = [...form.querySelectorAll("button")];
      buttons.forEach((b) => (b.disabled = true));
      $("accountStatus").textContent = "One moment…";
      try {
        await fn(Object.fromEntries(new FormData(form)));
        form
          .querySelectorAll("input[type=password]")
          .forEach((i) => (i.value = ""));
      } catch (e) {
        $("accountStatus").textContent = navigator.onLine
          ? e.message
          : "You’re offline. You can keep playing; sign in when you reconnect.";
      } finally {
        authBusy = false;
        buttons.forEach((b) => (b.disabled = false));
      }
    }
    document.querySelectorAll("[data-account-home]").forEach(
      (b) =>
        (b.onclick = () => {
          setRecovery(null);
          show("home");
        }),
    );
    document.querySelectorAll("[data-form]").forEach(
      (b) =>
        (b.onclick = () => {
          document
            .querySelectorAll(".accountForm")
            .forEach((f) => (f.hidden = f.id !== b.dataset.form));
          $("accountStatus").textContent = "";
        }),
    );
    document.querySelectorAll(".showPassword").forEach(
      (b) =>
        (b.onclick = () => {
          const input = b.closest("form").querySelector("[name=password]");
          input.type = input.type === "password" ? "text" : "password";
          b.textContent =
            input.type === "password" ? "Show password" : "Hide password";
        }),
    );
    $("accountBtn").onclick = () => {
      show("account");
      refreshPlayer();
    };
    $("loginForm").onsubmit = (e) => {
      e.preventDefault();
      runForm(e.currentTarget, async (fields) => {
        const email = fields.identifier.includes("@");
        await request("auth/sign-in/" + (email ? "email" : "username"), {
          [email ? "email" : "username"]: fields.identifier.trim(),
          password: fields.password,
        });
        await refreshPlayer();
        $("accountStatus").textContent =
          "Signed in. Your next solves will be saved.";
      });
    };
    $("registerForm").onsubmit = (e) => {
      e.preventDefault();
      runForm(e.currentTarget, async (fields) => {
        const data = await request("register", {
          ...fields,
          username: fields.username.trim(),
          email: fields.email.trim(),
        });
        await refreshPlayer();
        setRecovery(data.recoveryCode);
        $("accountStatus").textContent =
          "Your account is ready. Save your recovery code.";
      });
    };
    $("recoverForm").onsubmit = (e) => {
      e.preventDefault();
      runForm(e.currentTarget, async (fields) => {
        const data = await request("recover", fields);
        setRecovery(data.recoveryCode);
        $("accountStatus").textContent =
          "Password changed. Save your new code, then sign in.";
      });
    };
    $("copyRecovery").onclick = async () => {
      try {
        await navigator.clipboard.writeText($("recoveryCode").textContent);
        $("accountStatus").textContent = "Recovery code copied.";
      } catch {
        $("accountStatus").textContent =
          "Select and copy the code, or use Download code.";
      }
    };
    $("savedRecovery").onclick = () => {
      setRecovery(null);
      if (player) show("home");
    };
    $("signOut").onclick = async () => {
      try {
        await request("auth/sign-out", {});
        player = null;
        renderPlayer();
        $("accountStatus").textContent =
          "Signed out. This phone’s local progress is still here.";
      } catch (e) {
        $("accountStatus").textContent = e.message;
      }
    };
    $("importProgress").onclick = async () => {
      try {
        await request("progress", {
          keys: [
            ...new Set([
              ...(store.practice || []),
              ...[...doneSet]
                .filter((n) => Number.isInteger(n) && n > 0 && n <= 100000)
                .slice(0, 10000)
                .map((n) => "n-" + n),
            ]),
          ],
        });
        $("accountStatus").textContent =
          "This phone’s completed levels are saved to your account.";
      } catch (e) {
        $("accountStatus").textContent = e.message;
      }
    };
    $("deleteAccount").onclick = async () => {
      if (
        !confirm(
          "Delete your account, scores and cloud progress permanently? Your progress on this phone stays.",
        )
      )
        return;
      try {
        await request("delete-account", {
          password: $("deletePassword").value,
        });
        player = null;
        renderPlayer();
        $("accountStatus").textContent =
          "Your account and cloud progress were deleted.";
      } catch (e) {
        $("accountStatus").textContent = e.message;
      }
    };
    $("emailResetBtn").onclick = () => {
      document
        .querySelectorAll(".accountForm")
        .forEach((f) => (f.hidden = f.id !== "emailResetForm"));
    };
    $("emailResetForm").onsubmit = (e) => {
      e.preventDefault();
      runForm(e.currentTarget, async (f) => {
        await request("auth/request-password-reset", {
          email: f.email,
          redirectTo: location.origin + "/#reset-password",
        });
        $("accountStatus").textContent =
          "If an account uses that email, a reset link is on its way.";
      });
    };
    async function leaders() {
      const token = ++boardRequest,
        mode = $("leaderMode").value;
      $("leaderStatus").textContent = "Loading…";
      $("leaderRows").replaceChildren();
      $("leaderPuzzle").textContent =
        mode === "fastest" ? "Puzzle: " + lastKey : "";
      try {
        const data = await request(
          "leaderboard?mode=" + mode + "&puzzle=" + encodeURIComponent(lastKey),
        );
        if (token !== boardRequest) return;
        $("leaderStatus").textContent = data.rows.length
          ? "Top " + data.rows.length + " players"
          : "No ranked solves yet. Your first solve can start the board.";
        data.rows.forEach((r, i) => {
          const li = document.createElement("li"),
            name = document.createElement("b"),
            value = document.createElement("span");
          name.textContent = i + 1 + ". " + r.username;
          value.textContent =
            mode === "fastest"
              ? format(r.milliseconds) + " · " + (r.milliseconds % 1000) + " ms"
              : `${r.points} points · ${r.puzzles} puzzles`;
          li.append(name, value);
          $("leaderRows").appendChild(li);
        });
      } catch (e) {
        if (token === boardRequest)
          $("leaderStatus").textContent = navigator.onLine
            ? "The leaderboard is unavailable. Please try again."
            : "You’re offline. The leaderboard will be available when you reconnect.";
      }
    }
    $("leaderBtn").onclick = () => {
      show("leaderboard");
      leaders();
    };
    $("leaderMode").onchange = leaders;
    $("refreshLeaders").onclick = leaders;
    $("dailyBtn").onclick = () => {
      const day = Math.floor((Date.now() + 19800000) / 86400000);
      load(1 + ((day * 37) % 2000));
    };
    document.addEventListener("visibilitychange", () => {
      clearClock();
      if (!document.hidden && active && !active.finished) {
        updateClock();
        clock = setInterval(updateClock, 250);
      }
    });
    request("health")
      .then((c) => {
        if (c.emailRecovery) {
          $("emailHelp").textContent =
            "Optional: use this email to sign in or recover your password.";
          $("emailResetBtn").hidden = false;
        }
      })
      .catch(() => {});
    refreshPlayer();
    // Better Auth email reset links are consumed on the same site, with no token stored persistently.
    if (location.hash === "#account") show("account");
    if (
      location.hash === "#reset-password" &&
      new URLSearchParams(location.search).has("token")
    ) {
      const token = new URLSearchParams(location.search).get("token");
      show("account");
      const form = $("recoverForm");
      document
        .querySelectorAll(".accountForm")
        .forEach((f) => (f.hidden = f !== form));
      form.querySelector("[name=username]").closest("label").hidden = true;
      form.querySelector("[name=code]").closest("label").hidden = true;
      form.querySelector("[name=username]").required = false;
      form.querySelector("[name=code]").required = false;
      history.replaceState(null, "", location.pathname);
      form.onsubmit = (e) => {
        e.preventDefault();
        runForm(form, async (f) => {
          await request("auth/reset-password", {
            newPassword: f.password,
            token,
          });
          location.replace(location.pathname + "#account");
        });
      };
    }
    async function flushOutbox() {
      if (flushing || !player || !navigator.onLine) return;
      const username = player.username,
        items = (store.outbox || []).filter((x) => x.username === username);
      if (!items.length) return;
      flushing = true;
      try {
        await request("progress", { keys: items.map((x) => x.key) });
        const sent = new Set(items.map((x) => x.key));
        store.outbox = (store.outbox || []).filter(
          (x) => x.username !== username || !sent.has(x.key),
        );
        save();
      } catch {
      } finally {
        flushing = false;
      }
    }
    window.addEventListener("online", () => {
      flushOutbox();
      if (!player) refreshPlayer();
    });
    return {
      start(lv) {
        clearClock();
        active?.controller.abort();
        const seq = ++sequence,
          controller = new AbortController();
        lastKey = puzzleKey(lv);
        const session = (active = {
          seq,
          controller,
          key: lastKey,
          started: performance.now(),
          moves: [],
          turns: 0,
          hints: 0,
          finished: false,
          username: player?.username,
        });
        $("puzzleTimer").textContent = "0:00";
        $("moveCount").textContent = "0 turns · 0 hints";
        $("scoreNote").textContent = player
          ? navigator.onLine
            ? "Online timed solve · progress saves automatically"
            : "Offline practice · progress will sync later"
          : "Guest play · sign in to save and rank your next puzzles";
        if (!document.hidden) clock = setInterval(updateClock, 250);
        session.ready =
          player && navigator.onLine
            ? request("attempts", { puzzle: lastKey }, controller.signal).catch(
                () => null,
              )
            : Promise.resolve(null);
      },
      record(i, type) {
        if (!active || active.finished) return;
        if (active.moves.length < 8192) active.moves.push({ i, type });
        else active.unranked = true;
        if (type === "hint") active.hints++;
        else active.turns++;
        $("moveCount").textContent =
          `${active.turns} turns · ${active.hints} hints`;
      },
      complete() {
        if (!active) return;
        const session = active;
        session.finished = true;
        store.practice = [
          ...(store.practice || []).filter((k) => k !== session.key),
          session.key,
        ].slice(-500);
        if (session.username)
          store.outbox = [
            ...(store.outbox || []).filter(
              (x) => x.username !== session.username || x.key !== session.key,
            ),
            { username: session.username, key: session.key },
          ].slice(-1000);
        save();
        flushOutbox();
        clearClock();
        updateClock();
        const localMs = performance.now() - session.started;
        $("scoreNote").textContent =
          "Finished in " +
          format(localMs) +
          (session.hints ? " · " + session.hints + " hints" : " · no hints");
        session.ready.then(async (attempt) => {
          if (!attempt || session.unranked) return;
          try {
            const result = await request("attempts/" + attempt.id + "/finish", {
              moves: session.moves,
            });
            if (active === session)
              $("scoreNote").textContent =
                `${result.points} difficulty points · ${format(result.elapsedMs)}` +
                (result.hints ? " · hints used" : " · ranked time");
            if (player?.username === session.username) await refreshPlayer();
          } catch {
            if (active === session)
              $("scoreNote").textContent =
                "Saved on this phone. This solve could not be ranked; you can try again.";
          }
        });
      },
      leave() {
        clearClock();
        if (active && !active.finished) active.controller.abort();
        active = null;
        ++sequence;
      },
    };
  }
  globalThis.KolamCommunity = { setup };
})();

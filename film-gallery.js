/* =========================================
   FILM & ANIMATION — TWO-PART EXPERIENCE
   Video 1 -> interactive ARCHE phone -> Video 2

   FLOW (a small three-state machine, see setStage()):
     "first"  video 1 plays; when it ends, move on to "phone"
     "phone"  the phone animation runs; the visitor taps the fingerprint
              scanner, and after "VERIFIED" we move on to "second"
     "second" video 2 starts; "Replay experience" goes back to "first"

   TO CHANGE A VIDEO: edit VIDEO_SOURCES below. Nothing else needs touching.

   FILE MAP
     index.html        markup: #film-animation and everything inside it
     film-gallery.css  styling (page layout + the .fy phone)
     film-gallery.js   this file
   The phone's HTML is not in index.html: FutureApp.mount() creates it inside
   #future-phone only when the phone stage is reached, then removes it again.
========================================= */

(() => {
  "use strict";

  const view = document.querySelector("#film-animation");
  if (!view) return;

  // Shorthand for "find this element inside the Film view only".
  const $ = (selector) => view.querySelector(selector);

  const experience = $("#film-experience");
  const firstStage = $("#film-first-stage");
  const phoneStage = $("#film-phone-stage");
  const secondStage = $("#film-second-stage");
  const phoneHost = $("#future-phone");
  const firstVideo = $("#film-first-video");
  const secondVideo = $("#film-second-video");
  const firstPlaceholder = $("#film-first-placeholder");
  const secondPlaceholder = $("#film-second-placeholder");
  const previewPhoneButton = $("#film-preview-phone");
  const replayButton = $("#film-replay-experience");

  const requiredElements = [
    experience,
    firstStage,
    phoneStage,
    secondStage,
    phoneHost,
    firstVideo,
    secondVideo,
    firstPlaceholder,
    secondPlaceholder,
    previewPhoneButton,
    replayButton,
  ];

  // Safety net: if someone renames an id in index.html, stop here with a clear
  // console message instead of failing later with a confusing error.
  if (!requiredElements.every(Boolean)) {
    console.error("Film experience: required HTML elements are missing.");
    return;
  }

  /*
    VIDEO PATHS (relative to index.html).
    The folder name is case-sensitive on most web servers: "Video" and
    "video" are different folders once the site is online, even if both
    work on your computer.
    Set a path to "" to show the placeholder card for that video instead.
  */
  const VIDEO_SOURCES = {
    first: "./assets/Video/Part1.mp4",
    second: "./assets/Video/Part2.mp4",
  };

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  let currentStage = "first";
  let phoneApp = null; // handle returned by FutureApp.mount(); null = no phone
  let phoneMountFrame = 0; // pending requestAnimationFrame id for mounting
  let destroyed = false; // true after the page is closed (see "pagehide")

  function pauseVideos() {
    [firstVideo, secondVideo].forEach((video) => {
      if (!video.paused) video.pause();
    });
  }

  // Points a <video> at its file and hides its placeholder card, or does the
  // reverse when `source` is empty.
  function configureVideo(video, placeholder, source) {
    if (source && source.trim()) {
      video.src = source.trim();
      video.hidden = false;
      placeholder.hidden = true;
      video.load();
    } else {
      video.removeAttribute("src");
      video.hidden = true;
      placeholder.hidden = false;
    }
  }

  // Tears the phone down completely: stops its timers and empties
  // #future-phone. Called whenever we leave the phone stage.
  function destroyPhone() {
    if (phoneMountFrame) {
      cancelAnimationFrame(phoneMountFrame);
      phoneMountFrame = 0;
    }

    if (phoneApp) {
      phoneApp.destroy();
      phoneApp = null;
    } else {
      phoneHost.replaceChildren();
    }
  }

  /*
    Builds the phone. The mount waits one animation frame so the stage has
    become visible and laid out first; the phone's canvas measures its own
    size on creation and would otherwise measure 0x0 inside a hidden stage.
    The repeated checks inside the callback cover the visitor leaving the
    page during that single frame.
  */
  function mountPhone() {
    if (destroyed || view.hidden || currentStage !== "phone" || phoneApp) {
      return;
    }

    phoneMountFrame = requestAnimationFrame(() => {
      phoneMountFrame = 0;

      if (destroyed || view.hidden || currentStage !== "phone" || phoneApp) {
        return;
      }

      // Text shown in the phone. Changing these changes the story; see the
      // list of options in FutureApp.mount() below.
      phoneApp = FutureApp.mount(phoneHost, {
        brand: "ARCHE",
        cta: "ASK ARCHE",
        quote:
          "You see things; and you say, ‘Why?’\nBut I dream things that never were;\nand I say, ‘Why not?’",
        userLine: "Show me what’s possible.",
        hint: "TAP HERE",
        scanning: "SCANNING",
        verified: "VERIFIED",
        allowSkip: false,
        onNext: () => setStage("second"), // fingerprint verified
      });
    });
  }

  // The one place where the experience changes stage: shows the matching
  // section, hides the others, and starts/stops what each stage needs.
  function setStage(nextStage) {
    if (!["first", "phone", "second"].includes(nextStage)) return;

    currentStage = nextStage;
    experience.dataset.stage = nextStage;

    firstStage.hidden = nextStage !== "first";
    phoneStage.hidden = nextStage !== "phone";
    secondStage.hidden = nextStage !== "second";

    if (nextStage !== "phone") {
      destroyPhone();
    } else {
      pauseVideos();
      mountPhone();
    }

    if (nextStage === "first") {
      pauseVideos();

      try {
        firstVideo.currentTime = 0;
      } catch (_) {
        // The video may not have loaded metadata yet.
      }
    }

    if (nextStage === "second") {
      pauseVideos();

      try {
        secondVideo.currentTime = 0;
      } catch (_) {
        // The video may not have loaded metadata yet.
      }

      // Try to start the second film right after fingerprint verification.
      // The visitor has already tapped the page by now, which most browsers
      // accept, but some (Safari in particular) block playback that starts
      // after a delay. In that case the visitor presses play on the video's
      // own controls, so nothing breaks.
      if (VIDEO_SOURCES.second) {
        const playAttempt = secondVideo.play();

        if (playAttempt && typeof playAttempt.catch === "function") {
          playAttempt.catch(() => {
            // The visitor can start the video with its built-in controls.
          });
        }
      }
    }
  }

  /*
    THE ARCHE PHONE (class prefix "fy" in the CSS)

    A self-contained animated phone. FutureApp.mount(hostElement, options)
    fills `hostElement` with the phone and starts playing, and returns:
      { reset(), destroy() }   reset replays the intro; destroy cleans up.

    Options (all optional, defaults shown in `settings` below):
      brand        name in the advert and chat header
      cta          label of the button tapped in the advert
      quote        the AI's chat message ("\n" = new line)
      userLine     the visitor's typed reply
      hint         label above the fingerprint scanner
      scanning     label while scanning
      verified     label once verified
      allowSkip    true = tapping early skips straight to the scanner
      onNext       function called after verification

    It also fires a "futureisyours:next" event on the host, for code that
    prefers events over callbacks.
  */
  const FutureApp = (() => {
    function mount(host, options) {
      const settings = Object.assign(
        {
          brand: "ARCHE",
          cta: "ASK ARCHE",
          quote:
            "You see things; and you say, ‘Why?’\nBut I dream things that never were;\nand I say, ‘Why not?’",
          userLine: "Show me what’s possible.",
          hint: "TAP HERE",
          scanning: "SCANNING",
          verified: "VERIFIED",
          allowSkip: false,
          onNext: null,
        },
        options || {},
      );

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const fingerprintSvg =
        '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M10 38V30C10 18 19 9 32 9s22 9 22 21v6"/><path d="M17 46V30c0-8 6-14 15-14s15 6 15 14v8"/>' +
        '<path d="M24 54V31c0-5 3-9 8-9s8 4 8 9v12"/><path d="M32 54V32"/><path d="M10 46c0 4 1 7 3 10"/>' +
        '<path d="M54 44c0 5-1 8-3 12"/><path d="M44 52c-1 3-2 5-3 8"/></svg>';

      host.innerHTML =
        '<div class="fy" role="button" tabindex="0" aria-disabled="true" aria-label="Phone animation playing">' +
        '<canvas class="fy-rain"></canvas>' +
        '<section class="fy-scene fy-ad"><div class="fy-vline"></div><div class="fy-brand"></div>' +
        '<div class="fy-slogan"><span>THE FUTURE</span><span>IS YOURS</span></div><div class="fy-cta"></div></section>' +
        '<section class="fy-scene fy-chat"><div class="fy-top"><div class="fy-dot"></div><b></b><i>online</i></div>' +
        '<div class="fy-msgs"></div><div class="fy-bar"><span class="fy-inp"></span><div class="fy-send">↑</div></div></section>' +
        '<div class="fy-fp"><div class="fy-fp-label"></div><div class="fy-chev"></div>' +
        '<div class="fy-scan"><div class="fy-scan-in">' +
        fingerprintSvg +
        '<div class="fy-line"></div></div></div></div>' +
        '<div class="fy-tap"></div><div class="fy-pulse"></div></div>';

      const query = (selector) => host.querySelector(selector);
      const root = query(".fy");
      const canvas = query(".fy-rain");
      const context = canvas.getContext("2d");
      const ad = query(".fy-ad");
      const chat = query(".fy-chat");
      const slogan = query(".fy-slogan");
      const cta = query(".fy-cta");
      const tap = query(".fy-tap");
      const pulse = query(".fy-pulse");
      const messages = query(".fy-msgs");
      const input = query(".fy-inp");
      const send = query(".fy-send");
      const fingerprint = query(".fy-fp");
      const fingerprintLabel = query(".fy-fp-label");
      const scan = query(".fy-scan");

      query(".fy-brand").textContent = settings.brand;
      cta.textContent = settings.cta;
      query(".fy-top b").textContent = settings.brand;
      fingerprintLabel.textContent = settings.hint;

      /*
        Matrix-style rain on a <canvas> behind the scenes.
        Every 50ms (drawRain) each column draws one character and moves down.
        `rainAlpha` is the brightness, raised in steps as the story advances.
        The canvas is resized on window resize; the pixel-ratio maths keeps it
        sharp on high-density screens.
      */
      let fontSize = 12;
      let columns = 0;
      let drops = [];
      let rainAlpha = 0.14;
      let animationTimer = null;
      let animationRun = 0;
      let state = "playing";
      let nextWasFired = false;
      let destroyedPhone = false;

      const characters = "アイウエオカキクケコサシスセソ0123456789";

      function sizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
        canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
        fontSize = 12 * pixelRatio;

        columns = Math.max(1, Math.floor(canvas.width / fontSize));

        drops = Array.from(
          { length: columns },
          () => -Math.floor(Math.random() * 60),
        );
      }

      function drawRain() {
        if (!context || !canvas.width || !canvas.height) return;

        context.fillStyle = "rgba(3,6,5,.12)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = `${fontSize}px monospace`;
        context.fillStyle = `rgba(61,255,138,${rainAlpha})`;

        for (let index = 0; index < columns; index += 1) {
          const character =
            characters[Math.floor(Math.random() * characters.length)];

          context.fillText(
            character,
            index * fontSize,
            drops[index] * fontSize,
          );

          if (
            drops[index] * fontSize > canvas.height &&
            Math.random() > 0.975
          ) {
            drops[index] = 0;
          }

          drops[index] += 1;
        }
      }

      sizeCanvas();

      if (!prefersReducedMotion) {
        animationTimer = window.setInterval(drawRain, 50);
      }

      window.addEventListener("resize", sizeCanvas);

      /*
        Cancellable pause used by the whole animation timeline.
        Each run of the sequence gets a number (animationRun). If another run
        starts, or the phone is destroyed, a pending wait() REJECTS instead of
        resolving, which stops the old sequence at its next step. The `catch`
        blocks in playSequence/startScan swallow that rejection on purpose.
      */
      const wait = (runId, milliseconds) =>
        new Promise((resolve, reject) => {
          window.setTimeout(() => {
            if (runId === animationRun && !destroyedPhone) resolve();
            else reject(new Error("Phone animation cancelled"));
          }, milliseconds);
        });

      // Types `text` into `element` one character at a time (delay in ms,
      // with some random variation so it feels human). Instant when the OS
      // asks for reduced motion.
      async function typeText(runId, element, text, delay) {
        if (prefersReducedMotion) {
          element.textContent = text;
          return;
        }

        for (const character of text) {
          element.textContent += character;
          await wait(runId, delay + Math.random() * delay * 0.6);
        }
      }

      // Restarts a CSS animation by removing the class, forcing a reflow
      // (the offsetWidth read), and adding the class again.
      function retrigger(element, className) {
        element.classList.remove(className);
        void element.offsetWidth;
        element.classList.add(className);
      }

      // Centre point of `element`, measured from the phone's top-left corner.
      // Used to place the tap ripple exactly on a button.
      function centerOf(element) {
        const rootRect = root.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        return [
          elementRect.left + elementRect.width / 2 - rootRect.left,
          elementRect.top + elementRect.height / 2 - rootRect.top,
        ];
      }

      function showRipple(x, y) {
        tap.style.left = `${x}px`;
        tap.style.top = `${y}px`;
        retrigger(tap, "go");
      }

      // Notifies the page that the visitor passed the scanner. The guard
      // makes sure it can only fire once per run.
      function fireNext() {
        if (nextWasFired) return;
        nextWasFired = true;

        if (typeof settings.onNext === "function") {
          settings.onNext();
        }

        host.dispatchEvent(
          new CustomEvent("futureisyours:next", { bubbles: true }),
        );
      }

      function addMessage(className, text) {
        const message = document.createElement("div");
        message.className = `fy-m ${className}`;
        message.textContent = text;
        messages.appendChild(message);

        return message;
      }

      // Puts the phone back to its blank starting state (before the advert).
      function clearScene() {
        ad.classList.remove("on");
        chat.classList.remove("on", "done");
        slogan.classList.remove("in");
        cta.classList.remove("in", "press");
        tap.classList.remove("go");
        pulse.classList.remove("go");
        fingerprint.classList.remove("in", "scanning");
        root.classList.remove("ready");
        messages.innerHTML = "";
        input.textContent = "";
        fingerprintLabel.textContent = settings.hint;
        rainAlpha = 0.14;
      }

      // Final "waiting for a tap" state: chat visible, fingerprint scanner
      // pulsing. `fillMessages` is only true when the intro was skipped, so
      // the chat bubbles must be filled in instantly.
      function showReady(fillMessages) {
        if (fillMessages) {
          messages.innerHTML = "";
          addMessage("fy-ai", settings.quote);
          addMessage("fy-me", settings.userLine);
          input.textContent = "";
        }

        ad.classList.remove("on");
        chat.classList.add("on", "done");
        rainAlpha = 0.38;
        fingerprintLabel.textContent = settings.hint;
        fingerprint.classList.remove("scanning");
        fingerprint.classList.add("in");
        state = "ready";
        root.classList.add("ready");
        root.removeAttribute("aria-disabled");
        root.setAttribute("aria-label", "Scan your fingerprint to continue");
      }

      /*
        THE INTRO TIMELINE, step by step:
          advert fades in -> slogan -> "ASK ARCHE" button -> simulated tap ->
          chat opens -> typing dots -> AI quote is typed -> user reply is typed
          -> send -> pulse -> fingerprint scanner ready.
        The numbers passed to wait() are milliseconds; change them to speed up
        or slow down individual steps (the whole intro takes roughly 16 seconds).
      */
      async function playSequence() {
        const runId = ++animationRun;
        state = "playing";
        nextWasFired = false;

        clearScene();

        root.setAttribute("aria-disabled", "true");
        root.setAttribute("aria-label", "Phone animation playing");

        try {
          await Promise.race([
            document.fonts ? document.fonts.ready : Promise.resolve(),
            new Promise((resolve) => window.setTimeout(resolve, 1500)),
          ]);

          if (runId !== animationRun || destroyedPhone) return;

          await wait(runId, 300);
          ad.classList.add("on");

          await wait(runId, 900);
          slogan.classList.add("in");

          await wait(runId, 1900);
          cta.classList.add("in");

          await wait(runId, 800);

          const [ctaX, ctaY] = centerOf(cta);
          showRipple(ctaX, ctaY);
          cta.classList.add("press");

          await wait(runId, 250);
          cta.classList.remove("press");

          await wait(runId, 450);
          ad.classList.remove("on");
          chat.classList.add("on");
          rainAlpha = 0.38;

          await wait(runId, 900);

          const aiMessage = addMessage("fy-ai", "");

          aiMessage.innerHTML =
            '<span class="fy-dots"><u></u><u></u><u></u></span>';

          await wait(runId, 1100);
          aiMessage.textContent = "";

          await typeText(runId, aiMessage, settings.quote, 28);

          await wait(runId, 1300);
          await typeText(runId, input, settings.userLine, 70);

          await wait(runId, 600);
          send.classList.add("press");

          await wait(runId, 200);
          send.classList.remove("press");

          addMessage("fy-me", settings.userLine);
          input.textContent = "";

          await wait(runId, 800);
          retrigger(pulse, "go");

          await wait(runId, 1300);
          showReady(false);
        } catch (_) {
          // The sequence is intentionally cancelled when the view is left.
        }
      }

      // Runs after the visitor taps the ready phone: ripple at the tap point,
      // ~1.2s of SCANNING, then VERIFIED, then hands over via fireNext().
      async function startScan(point) {
        const runId = ++animationRun;
        state = "scanning";
        root.classList.remove("ready");
        root.setAttribute("aria-disabled", "true");

        showRipple(point[0], point[1]);
        fingerprint.classList.add("scanning");
        fingerprintLabel.textContent = settings.scanning;
        rainAlpha = 0.6;

        try {
          await wait(runId, 1150);

          fingerprintLabel.textContent = settings.verified;
          retrigger(pulse, "go");
          rainAlpha = 0.8;

          await wait(runId, 800);
          state = "done";
          fireNext();
        } catch (_) {
          // The scan is cancelled if the phone is unmounted.
        }
      }

      // Single entry point for mouse, touch and keyboard (Enter / Space).
      // While the intro plays, taps are ignored unless allowSkip is on.
      function handlePress(event) {
        if (state === "playing") {
          if (settings.allowSkip) {
            animationRun += 1;
            showReady(true);
          }

          return;
        }

        if (state !== "ready") return;

        const rect = root.getBoundingClientRect();

        const point =
          event && event.type === "click" && (event.clientX || event.clientY)
            ? [event.clientX - rect.left, event.clientY - rect.top]
            : centerOf(scan);

        startScan(point);
      }

      root.addEventListener("click", handlePress);

      root.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlePress(event);
        }
      });

      playSequence();

      return {
        reset: playSequence,

        destroy() {
          if (destroyedPhone) return;

          destroyedPhone = true;
          animationRun += 1;

          if (animationTimer !== null) {
            window.clearInterval(animationTimer);
          }

          window.removeEventListener("resize", sizeCanvas);
          host.replaceChildren();
        },
      };
    }

    return { mount };
  })();

  /* ---- Wiring: videos, buttons and the view lifecycle ---- */

  configureVideo(firstVideo, firstPlaceholder, VIDEO_SOURCES.first);
  configureVideo(secondVideo, secondPlaceholder, VIDEO_SOURCES.second);

  // Video 1 finishing is what moves the visitor into the phone stage.
  firstVideo.addEventListener("ended", () => {
    if (currentStage === "first") setStage("phone");
  });

  // A missing or misspelt file shows up here. Check the path (and its
  // capitalisation) in VIDEO_SOURCES and the Network tab in dev tools.
  firstVideo.addEventListener("error", () => {
    if (VIDEO_SOURCES.first) {
      console.error(
        "Film experience: first video failed to load:",
        firstVideo.currentSrc,
      );
    }
  });

  secondVideo.addEventListener("error", () => {
    if (VIDEO_SOURCES.second) {
      console.error(
        "Film experience: second video failed to load:",
        secondVideo.currentSrc,
      );
    }
  });

  // The preview button only exists inside video 1's placeholder card, so it
  // appears only while VIDEO_SOURCES.first is empty. It is a shortcut for
  // testing the phone without a video.
  previewPhoneButton.addEventListener("click", () => setStage("phone"));
  replayButton.addEventListener("click", () => setStage("first"));

  /*
    mainpage.js shows and hides this whole view by toggling its `hidden`
    attribute. We watch that attribute so that:
      - leaving the Film page pauses the videos and removes the phone
      - coming back always restarts from video 1
    The phone is only built while the view is visible, because its canvas
    measures its size on creation (a hidden view would measure 0 x 0).
  */
  const viewObserver = new MutationObserver(() => {
    if (view.hidden) {
      pauseVideos();
      destroyPhone();
      currentStage = "first";
      experience.dataset.stage = "first";
    } else {
      setStage("first");
    }
  });

  viewObserver.observe(view, {
    attributes: true,
    attributeFilter: ["hidden"],
  });

  if (!view.hidden) {
    setStage("first");
  } else {
    experience.dataset.stage = "first";
  }

  // Page closing or being put into the back/forward cache: stop everything
  // so no timers keep running in the background.
  window.addEventListener("pagehide", () => {
    destroyed = true;
    pauseVideos();
    destroyPhone();
    viewObserver.disconnect();
  });
})();

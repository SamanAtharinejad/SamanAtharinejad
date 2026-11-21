/*
  MAIN PAGE SCRIPT  (loaded with `defer` from index.html)

  Three independent features, in this order:
    1. NAVIGATION          view switching + the sliding glass indicator
    2. EXPLORE BUTTON      pointer tilt on the home "Explore my work" button
    3. BACKGROUND MUSIC    audio player widget (still the original version)

  The whole file is wrapped in an IIFE so none of its variables leak onto
  `window`. film-gallery.js is a separate file that reacts to this one: it
  watches the Film & Animation <section> for its `hidden` attribute, which
  activateView() below toggles.
*/

(() => {
  "use strict";

  /* =====================================
     1. NAVIGATION

     How it connects to the HTML:
       <button class="nav-item" data-view="film-animation">
       <section class="view" id="film-animation">
     The data-view value MUST match the section's id. To add a page, add one
     button and one section with the same name; no JS change is needed.

     The glass indicator is an absolutely positioned element inside the nav
     (see CSS section 5.1). It is moved by writing an inline width and
     translateX(); CSS animates the movement.
  ===================================== */

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const navigation = document.querySelector(".main-navigation");
  const navItems = navigation
    ? [...navigation.querySelectorAll(".nav-item")]
    : [];

  const indicator = navigation?.querySelector(".glass-indicator");
  const views = [...document.querySelectorAll(".view")];

  /*
    Slides the glass capsule under `target` (a .nav-item).

    The capsule is positioned inside the nav, so its x must be measured in the
    nav's own scrolling coordinates. On phones the tab row scrolls sideways,
    and getBoundingClientRect() reports positions on SCREEN, which already
    include that scroll. Adding navigation.scrollLeft converts back; without
    it the capsule ended up far away from its tab after the row was scrolled.
    (The "+ 2" matches the capsule's `left: -2px` in CSS.)
  */
  function moveIndicator(target) {
    if (!navigation || !indicator || !target) return;

    const navRect = navigation.getBoundingClientRect();
    const buttonRect = target.getBoundingClientRect();

    const x = buttonRect.left - navRect.left + navigation.scrollLeft + 2;

    indicator.style.width = `${buttonRect.width}px`;
    indicator.style.transform = `translateX(${x}px)`;

    navigation.classList.add("has-indicator");
  }

  // Resting position: the capsule always settles back under the active tab.
  function returnIndicatorToActive() {
    const active = navigation?.querySelector(".nav-item.active");
    if (active) moveIndicator(active);
  }

  /*
    Phones only: when the tabs are wider than the screen the row scrolls
    sideways. This centres the given tab so the active page is never hidden
    off-screen. It scrolls the nav row itself, never the page, so the page
    doesn't jump. Does nothing when all tabs already fit (desktop).
  */
  function scrollNavToTab(target, smooth) {
    if (!navigation || !target) return;
    if (navigation.scrollWidth <= navigation.clientWidth) return;

    const left =
      target.offsetLeft - (navigation.clientWidth - target.offsetWidth) / 2;

    navigation.scrollTo({
      left: Math.max(0, left),
      behavior: smooth && !prefersReducedMotion ? "smooth" : "auto",
    });
  }

  /*
    Shows the section whose id is `viewId` and hides all the others, then
    syncs the nav buttons (.active class + aria-current for screen readers).
    Pass { smooth: false } to skip animated scrolling of the tab row.
  */
  function activateView(viewId, { smooth = true } = {}) {
    const targetView = document.getElementById(viewId);

    if (!targetView || !targetView.classList.contains("view")) return;

    views.forEach((view) => {
      const active = view === targetView;

      view.hidden = !active;
      view.classList.toggle("active", active);
    });

    navItems.forEach((item) => {
      const active = item.dataset.view === viewId;

      item.classList.toggle("active", active);

      if (active) {
        item.setAttribute("aria-current", "page");
        scrollNavToTab(item, smooth);
      } else {
        item.removeAttribute("aria-current");
      }
    });

    // Wait one frame so the new .active class has been applied before
    // measuring.
    requestAnimationFrame(returnIndicatorToActive);
  }

  // :focus-visible is true for keyboard focus but not for a mouse/touch tap.
  // The try/catch keeps very old browsers (no :focus-visible) working.
  function isKeyboardFocus(element) {
    try {
      return element.matches(":focus-visible");
    } catch (_) {
      return true;
    }
  }

  navItems.forEach((item) => {
    /*
      Hover preview: the capsule follows the mouse. Ignored for touch because
      a finger "enters" the tab on touch-down and "leaves" on lift-off, just
      before the click arrives. That made the capsule jump to the tapped tab,
      snap back, then jump forward again on phones. On touch, the click alone
      decides where the capsule goes.
    */
    item.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") moveIndicator(item);
    });

    // Keyboard users tabbing through the nav get the same preview as hover.
    item.addEventListener("focus", () => {
      if (isKeyboardFocus(item)) moveIndicator(item);
    });

    item.addEventListener("click", () => activateView(item.dataset.view));
  });

  if (navigation) {
    navigation.addEventListener("pointerleave", returnIndicatorToActive);

    navigation.addEventListener("focusout", (event) => {
      if (!navigation.contains(event.relatedTarget)) {
        returnIndicatorToActive();
      }
    });
  }

  // Rotating the phone or resizing the window changes the tab positions.
  window.addEventListener("resize", returnIndicatorToActive);

  // First page shown: whichever tab has .active in the HTML, otherwise the
  // first .active section, otherwise "home".
  const initialView =
    navigation?.querySelector(".nav-item.active")?.dataset.view ||
    document.querySelector(".view.active")?.id ||
    "home";

  activateView(initialView, { smooth: false });

  /* =====================================
     2. EXPLORE BUTTON  (#explore-work on the home page)

     While the pointer moves over the button, --tilt-x / --tilt-y are written
     onto it (up to 5deg and 7deg) and CSS turns them into a 3D tilt (see
     "9. Explore my work" in mainpage.css). .is-hovered and .is-pressed are
     plain state classes for the extra glow and the pressed-in look.
     Clicking the button opens the Film & Animation page.
  ===================================== */

  const exploreButton = document.querySelector("#explore-work");

  if (exploreButton) {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Converts the pointer position to -1..1 across the button, then to a
    // small rotation. Skipped entirely when the OS asks for reduced motion.
    function updateTilt(event) {
      if (reducedMotion) return;

      const rect = exploreButton.getBoundingClientRect();

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

      const tiltX = -y * 5;
      const tiltY = x * 7;

      exploreButton.style.setProperty("--tilt-x", `${tiltX}deg`);
      exploreButton.style.setProperty("--tilt-y", `${tiltY}deg`);

      exploreButton.classList.add("is-hovered");
    }

    // Back to flat: pointer left the button, or the button lost focus.
    function resetButton() {
      exploreButton.style.setProperty("--tilt-x", "0deg");
      exploreButton.style.setProperty("--tilt-y", "0deg");

      exploreButton.classList.remove("is-hovered", "is-pressed");
    }

    function releaseButton() {
      exploreButton.classList.remove("is-pressed");
    }

    exploreButton.addEventListener("pointerenter", updateTilt);
    exploreButton.addEventListener("pointermove", updateTilt);
    exploreButton.addEventListener("pointerleave", resetButton);

    exploreButton.addEventListener("pointerdown", () => {
      exploreButton.classList.add("is-pressed");
    });

    // Listen on `window`, not the button, so the pressed look is released
    // even when the pointer is let go somewhere else on the page.
    window.addEventListener("pointerup", releaseButton);
    window.addEventListener("pointercancel", releaseButton);

    exploreButton.addEventListener("blur", resetButton);

    exploreButton.addEventListener("click", () => {
      activateView("film-animation");
    });
  }

  /* =====================================
     3. BACKGROUND MUSIC PLAYER

     Expects these elements from index.html: #site-music (the <audio>),
     #music-widget, #music-toggle, #music-toggle-icon, #music-disc,
     #music-status and #music-volume. If #site-music is missing, the whole
     player quietly does nothing.

     Behaviour: tries to autoplay; browsers usually block that, so the first
     click or key press anywhere on the page starts the music instead. Music
     pauses while a video plays and resumes afterwards, unless the visitor
     paused it themselves.
  ===================================== */

  (() => {
    const audio = document.querySelector("#site-music");

    if (!audio) return;

    const widget = document.querySelector("#music-widget");
    const toggle = document.querySelector("#music-toggle");
    const toggleIcon = document.querySelector("#music-toggle-icon");
    const disc = document.querySelector("#music-disc");
    const status = document.querySelector("#music-status");
    const volume = document.querySelector("#music-volume");

    let userPaused = false;
    let pausedForOtherMedia = false;
    let collapseTimer = null;
    let playAttempt = null;

    const otherMediaPlaying = new Set();

    audio.loop = true;
    audio.preload = "auto";

    audio.volume = volume
      ? Math.max(0, Math.min(1, Number(volume.value)))
      : 0.3;

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function expandPlayer() {
      widget?.classList.remove("is-compact");
      disc?.setAttribute("aria-expanded", "true");
    }

    function collapsePlayer() {
      if (!widget || !disc) return;

      widget.classList.add("is-compact");
      disc.setAttribute("aria-expanded", "false");
    }

    function scheduleCollapse() {
      if (!widget || !disc) return;

      clearTimeout(collapseTimer);

      collapseTimer = setTimeout(() => {
        if (!audio.paused) collapsePlayer();
      }, 4000);
    }

    function updatePlayerState() {
      const playing = !audio.paused;

      widget?.classList.toggle("is-playing", playing);

      if (toggleIcon) {
        toggleIcon.textContent = playing ? "Ⅱ" : "▶";
      }

      toggle?.setAttribute(
        "aria-label",
        playing ? "Pause music" : "Play music",
      );
    }

    function removeUnlockListeners() {
      document.removeEventListener("pointerdown", unlockPlayback, true);
      document.removeEventListener("keydown", unlockPlayback, true);
    }

    async function playMusic() {
      if (userPaused) return;

      if (otherMediaPlaying.size > 0) {
        pausedForOtherMedia = true;
        setStatus("Waiting for other media...");
        return;
      }

      if (!audio.paused && !audio.ended) return;
      if (playAttempt) return playAttempt;

      try {
        playAttempt = audio.play();
        await playAttempt;

        pausedForOtherMedia = false;
        updatePlayerState();
        removeUnlockListeners();
      } catch (error) {
        expandPlayer();
        updatePlayerState();

        if (error.name === "NotAllowedError") {
          setStatus("Click play to start music");
        } else if (error.name === "NotSupportedError") {
          setStatus("Audio format not supported");
        } else {
          setStatus("Unable to load audio — check file path");
        }

        console.error("Music playback failed:", {
          error,
          source: audio.currentSrc,
          audioError: audio.error,
        });
      } finally {
        playAttempt = null;
      }
    }

    audio.addEventListener("loadedmetadata", () => {
      if (audio.paused) setStatus("Ready to play");
    });

    audio.addEventListener("play", () => {
      updatePlayerState();
      setStatus("Now playing");
      expandPlayer();
      scheduleCollapse();
      removeUnlockListeners();
    });

    audio.addEventListener("pause", () => {
      updatePlayerState();
      clearTimeout(collapseTimer);

      if (userPaused) setStatus("Paused");
    });

    audio.addEventListener("error", () => {
      expandPlayer();

      const messages = {
        1: "Audio loading aborted",
        2: "Network or file loading error",
        3: "Audio decoding failed",
        4: "Audio source not supported",
      };

      setStatus(messages[audio.error?.code] || "Unable to load audio file");

      console.error("Audio error:", {
        code: audio.error?.code,
        source: audio.currentSrc,
        error: audio.error,
      });
    });

    /* PLAY / PAUSE */

    toggle?.addEventListener("click", async () => {
      if (!audio.paused) {
        userPaused = true;
        pausedForOtherMedia = false;

        audio.pause();
        expandPlayer();
        setStatus("Paused");

        clearTimeout(collapseTimer);
        removeUnlockListeners();
      } else {
        userPaused = false;
        expandPlayer();

        await playMusic();
      }
    });

    /* COMPACT DISC */

    disc?.addEventListener("click", () => {
      expandPlayer();

      if (!audio.paused) {
        scheduleCollapse();
      } else if (!userPaused) {
        playMusic();
      }
    });

    /* VOLUME */

    volume?.addEventListener("input", () => {
      audio.volume = Math.max(0, Math.min(1, Number(volume.value)));
    });

    /* OTHER MEDIA */

    function isOtherMedia(event) {
      return event.target instanceof HTMLMediaElement && event.target !== audio;
    }

    document.addEventListener(
      "play",
      (event) => {
        if (!isOtherMedia(event)) return;

        otherMediaPlaying.add(event.target);

        if (!audio.paused) {
          pausedForOtherMedia = true;

          audio.pause();
          expandPlayer();
          setStatus("Paused for other media");

          clearTimeout(collapseTimer);
        }
      },
      true,
    );

    function handleOtherMediaStopped(event) {
      if (!isOtherMedia(event)) return;

      otherMediaPlaying.delete(event.target);

      if (otherMediaPlaying.size === 0 && pausedForOtherMedia && !userPaused) {
        pausedForOtherMedia = false;
        playMusic();
      }
    }

    document.addEventListener("pause", handleOtherMediaStopped, true);
    document.addEventListener("ended", handleOtherMediaStopped, true);

    document.querySelectorAll("audio, video").forEach((media) => {
      if (media !== audio && !media.paused && !media.ended) {
        otherMediaPlaying.add(media);
      }
    });

    /* AUTOPLAY FALLBACK */

    function unlockPlayback(event) {
      if (event.target.closest?.("#music-widget")) return;
      if (userPaused || !audio.paused) return;
      if (otherMediaPlaying.size > 0) return;

      playMusic();
    }

    document.addEventListener("pointerdown", unlockPlayback, true);
    document.addEventListener("keydown", unlockPlayback, true);

    expandPlayer();
    setStatus("Starting music...");

    playMusic();
  })();
})();

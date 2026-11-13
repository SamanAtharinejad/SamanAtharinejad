(() => {
  "use strict";

  /* =====================================
     NAVIGATION
  ===================================== */

  const navigation = document.querySelector(".main-navigation");
  const navItems = navigation
    ? [...navigation.querySelectorAll(".nav-item")]
    : [];

  const indicator = navigation?.querySelector(".glass-indicator");
  const views = [...document.querySelectorAll(".view")];

  function moveIndicator(target) {
    if (!navigation || !indicator || !target) return;

    const navRect = navigation.getBoundingClientRect();
    const buttonRect = target.getBoundingClientRect();

    const x = buttonRect.left - navRect.left + 2;

    indicator.style.width = `${buttonRect.width}px`;
    indicator.style.transform = `translateX(${x}px)`;

    navigation.classList.add("has-indicator");
  }

  function returnIndicatorToActive() {
    const active = navigation?.querySelector(".nav-item.active");
    if (active) moveIndicator(active);
  }

  function activateView(viewId) {
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
      } else {
        item.removeAttribute("aria-current");
      }
    });

    requestAnimationFrame(returnIndicatorToActive);
  }

  navItems.forEach((item) => {
    item.addEventListener("pointerenter", () => moveIndicator(item));
    item.addEventListener("focus", () => moveIndicator(item));
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

  window.addEventListener("resize", returnIndicatorToActive);

  const initialView =
    navigation?.querySelector(".nav-item.active")?.dataset.view ||
    document.querySelector(".view.active")?.id ||
    "home";

  activateView(initialView);

  /* =====================================
     EXPLORE BUTTON
  ===================================== */

  const exploreButton = document.querySelector("#explore-work");

  if (exploreButton) {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

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

    window.addEventListener("pointerup", releaseButton);
    window.addEventListener("pointercancel", releaseButton);

    exploreButton.addEventListener("blur", resetButton);

    exploreButton.addEventListener("click", () => {
      activateView("film-animation");
    });
  }

  /* =====================================
     BACKGROUND MUSIC PLAYER
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

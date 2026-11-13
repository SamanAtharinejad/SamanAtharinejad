/* =========================================
   FILM & ANIMATION GALLERY
========================================= */

(() => {
  const view = document.querySelector("#film-animation");
  if (!view) return;

  const $ = (selector) => view.querySelector(selector);

  const stage = $("#film-gallery-stage");
  const previousCard = $("#film-previous-card");
  const activeCard = $("#film-active-card");
  const nextCard = $("#film-next-card");

  if (![stage, previousCard, activeCard, nextCard].every(Boolean)) {
    console.error("Film gallery: required HTML elements are missing.");
    return;
  }

  const projects = [
    {
      scene: "cinema",
      sceneLabel: "CINEMATIC STUDY",
      kicker: "01 · FILM",
      src: "",
      poster: "",
    },
    {
      scene: "animation",
      sceneLabel: "ANIMATED BRAND FILM",
      kicker: "02 · ANIMATION",
      src: "",
      poster: "",
    },
    {
      scene: "short",
      sceneLabel: "SHORT-FORM EXPERIMENT",
      kicker: "03 · SHORT FORM",
      src: "",
      poster: "",
    },
  ];

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const canAnimate =
    !reducedMotion && typeof Element.prototype.animate === "function";

  const mod = (value, length) => (value + length) % length;
  const cards = [previousCard, activeCard, nextCard];

  let activeIndex = 0;
  let isTransitioning = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let isPointerDown = false;
  let isDragging = false;
  let suppressClick = false;

  function escapeAttribute(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function sceneMarkup(project) {
    const extra =
      project.scene === "cinema"
        ? `
          <span class="film-mountain film-mountain-back"></span>
          <span class="film-mountain film-mountain-front"></span>
          <span class="film-horizon"></span>
        `
        : project.scene === "animation"
          ? '<span class="film-scene-shape"></span>'
          : "";

    const posterStyle = project.poster
      ? ` style="background-image:url('${escapeAttribute(project.poster)}')"`
      : "";

    return `
      <span class="film-card-scene film-scene-${escapeAttribute(project.scene)}"${posterStyle}>
        ${extra}
        <span class="film-scene-lines"></span>
      </span>
    `;
  }

  function cardMarkup(project, isActive = false) {
    const video =
      isActive && project.src
        ? `
          <video
            class="film-card-video"
            src="${escapeAttribute(project.src)}"
            ${project.poster ? `poster="${escapeAttribute(project.poster)}"` : ""}
            playsinline
            preload="metadata"
          ></video>
        `
        : "";

    const playControl =
      isActive && project.src
        ? '<span class="film-play-indicator" aria-hidden="true">▶</span>'
        : "";

    return `
      ${sceneMarkup(project)}
      ${video}
      ${playControl}
    `;
  }

  function updateVideoState() {
    const video = activeCard.querySelector(".film-card-video");
    const indicator = activeCard.querySelector(".film-play-indicator");
    const playing = Boolean(video && !video.paused && !video.ended);

    activeCard.classList.toggle("is-playing", playing);

    if (indicator) {
      indicator.textContent = playing ? "Ⅱ" : "▶";
    }
  }

  function bindActiveVideo() {
    const video = activeCard.querySelector(".film-card-video");

    if (!video) {
      updateVideoState();
      return;
    }

    video.addEventListener("play", updateVideoState);
    video.addEventListener("pause", updateVideoState);
    video.addEventListener("ended", updateVideoState);

    video.addEventListener("error", () => {
      console.error("Film gallery: unable to load video:", video.currentSrc);
    });

    updateVideoState();
  }

  function renderCards() {
    const previousIndex = mod(activeIndex - 1, projects.length);
    const nextIndex = mod(activeIndex + 1, projects.length);

    previousCard.className = "film-gallery-card film-previous";
    activeCard.className = "film-gallery-card film-active";
    nextCard.className = "film-gallery-card film-next";

    previousCard.innerHTML = cardMarkup(projects[previousIndex]);
    activeCard.innerHTML = cardMarkup(projects[activeIndex], true);
    nextCard.innerHTML = cardMarkup(projects[nextIndex]);

    bindActiveVideo();
  }

  function render() {
    renderCards();
  }

  function pauseActiveVideo() {
    const video = activeCard.querySelector(".film-card-video");

    if (video && !video.paused) {
      video.pause();
    }
  }

  async function toggleActiveVideo() {
    const video = activeCard.querySelector(".film-card-video");
    if (!video) return;

    if (video.paused || video.ended) {
      document.querySelectorAll("video").forEach((other) => {
        if (other !== video && !other.paused) {
          other.pause();
        }
      });

      try {
        await video.play();
      } catch (error) {
        console.error("Film gallery playback failed:", error);
      }
    } else {
      video.pause();
    }
  }

  function animateCardOut(snapshot, direction) {
    const style = getComputedStyle(snapshot);
    const transform =
      style.transform === "none" ? "translate(0, 0)" : style.transform;
    const sign = direction > 0 ? -1 : 1;

    return snapshot.animate(
      [
        {
          transform,
          opacity: style.opacity,
          filter: style.filter,
        },
        {
          transform: `${transform} translateX(${sign * 115}px) scale(.94)`,
          opacity: 0,
          filter: "blur(7px)",
        },
      ],
      {
        duration: 690,
        easing: "cubic-bezier(.65, 0, .25, 1)",
        fill: "forwards",
      },
    );
  }

  function animateCardIn(card, direction) {
    card.style.transition = "none";

    const computed = getComputedStyle(card);
    const targetTransform = computed.transform;
    const targetOpacity = computed.opacity;
    const targetFilter = computed.filter;
    const offset = direction > 0 ? 62 : -62;

    const startTransform =
      targetTransform === "none"
        ? `translateX(${offset}px)`
        : `${targetTransform} translateX(${offset}px) scale(.97)`;

    card.style.opacity = "0";
    card.style.filter = "blur(7px)";
    card.style.transform = startTransform;

    return card.animate(
      [
        {
          transform: startTransform,
          opacity: 0,
          filter: "blur(7px)",
        },
        {
          transform: targetTransform,
          opacity: targetOpacity,
          filter: targetFilter,
        },
      ],
      {
        duration: 820,
        easing: "cubic-bezier(.16, 1, .3, 1)",
        fill: "forwards",
      },
    );
  }

  async function selectProject(index, requestedDirection = 0) {
    if (isTransitioning) return;

    const nextIndex = mod(index, projects.length);
    if (nextIndex === activeIndex) return;

    let direction = requestedDirection;

    if (!direction) {
      const forward = mod(nextIndex - activeIndex, projects.length);
      const backward = mod(activeIndex - nextIndex, projects.length);
      direction = forward <= backward ? 1 : -1;
    }

    pauseActiveVideo();

    if (!canAnimate) {
      activeIndex = nextIndex;
      render();
      return;
    }

    isTransitioning = true;
    stage.classList.add("is-transitioning");

    const snapshots = cards.map((card) => {
      const clone = card.cloneNode(true);

      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((node) => {
        node.removeAttribute("id");
      });

      clone.setAttribute("aria-hidden", "true");
      clone.tabIndex = -1;
      clone.classList.add("film-transition-snapshot");

      clone.style.zIndex = String(
        (Number(getComputedStyle(card).zIndex) || 1) + 4,
      );

      clone.style.transition = "none";
      clone.style.pointerEvents = "none";

      stage.appendChild(clone);
      return clone;
    });

    const outgoing = snapshots.map((snapshot) =>
      animateCardOut(snapshot, direction),
    );

    await Promise.all(
      outgoing.map((animation) => animation.finished.catch(() => {})),
    );

    activeIndex = nextIndex;
    render();

    const incoming = cards.map((card) => animateCardIn(card, direction));

    await Promise.all(
      incoming.map((animation) => animation.finished.catch(() => {})),
    );

    snapshots.forEach((snapshot) => snapshot.remove());

    cards.forEach((card) => {
      card.getAnimations().forEach((animation) => animation.cancel());
      card.style.transition = "";
      card.style.opacity = "";
      card.style.filter = "";
      card.style.transform = "";
    });

    stage.classList.remove("is-transitioning");
    isTransitioning = false;
  }

  stage.addEventListener("click", (event) => {
    const card = event.target.closest(".film-gallery-card");

    if (!card || suppressClick || isTransitioning) return;

    if (card === previousCard) {
      selectProject(activeIndex - 1, -1);
    } else if (card === nextCard) {
      selectProject(activeIndex + 1, 1);
    } else if (card === activeCard) {
      toggleActiveVideo();
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (isTransitioning || !event.target.closest(".film-gallery-card")) {
      return;
    }

    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    isPointerDown = true;
    isDragging = false;
  });

  window.addEventListener("pointermove", (event) => {
    if (!isPointerDown || isTransitioning) return;

    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;

    if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      isDragging = true;
    }
  });

  window.addEventListener("pointerup", (event) => {
    if (!isPointerDown) return;

    const dx = event.clientX - pointerStartX;

    if (isDragging && Math.abs(dx) > 45) {
      suppressClick = true;
      selectProject(activeIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);

      window.setTimeout(() => {
        suppressClick = false;
      }, 350);
    }

    isPointerDown = false;
    isDragging = false;
  });

  window.addEventListener("pointercancel", () => {
    isPointerDown = false;
    isDragging = false;
  });

  document.addEventListener("keydown", (event) => {
    if (view.hidden || !view.classList.contains("active")) return;

    const target = event.target;

    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
    ) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectProject(activeIndex + 1, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectProject(activeIndex - 1, -1);
    }
  });

  const viewObserver = new MutationObserver(() => {
    if (view.hidden) pauseActiveVideo();
  });

  viewObserver.observe(view, {
    attributes: true,
    attributeFilter: ["hidden"],
  });

  render();
})();

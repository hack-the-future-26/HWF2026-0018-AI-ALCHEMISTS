import { ArrowUp } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 320;

// The scroll container differs by viewport: .center-column scrolls on desktop,
// while below 768px the shell is height:auto and the window scrolls instead.
// Watching both keeps one button working everywhere.
function getScroller() {
  return document.getElementById("main-content");
}

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const columnTop = getScroller()?.scrollTop ?? 0;
      setIsVisible(Math.max(window.scrollY, columnTop) > SHOW_AFTER_PX);
    };

    update();
    const column = getScroller();
    window.addEventListener("scroll", update, { passive: true });
    column?.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      column?.removeEventListener("scroll", update);
    };
  }, []);

  function scrollToTop() {
    getScroller()?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      className={isVisible ? "back-to-top is-visible" : "back-to-top"}
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
    >
      <ArrowUp size={18} weight="bold" />
    </button>
  );
}

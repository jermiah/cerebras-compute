"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const TOTAL_SLIDES = 7;

export default function PresentationViewer() {
  const [slide, setSlide] = useState(1);

  const previousSlide = () => setSlide((current) => current === 1 ? TOTAL_SLIDES : current - 1);
  const nextSlide = () => setSlide((current) => current === TOTAL_SLIDES ? 1 : current + 1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previousSlide();
      if (event.key === "ArrowRight") nextSlide();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="presentation-player">
      <div className="slide-canvas">
        <Image
          key={slide}
          className="slide-image"
          src={`/slides/cerebras-intro-${slide}.png`}
          alt={`Cerebras introduction slide ${slide} of ${TOTAL_SLIDES}`}
          width={1920}
          height={1080}
          priority
        />
        <button className="slide-hit-area slide-hit-area-previous" type="button" onClick={previousSlide} aria-label="Previous slide">←</button>
        <button className="slide-hit-area slide-hit-area-next" type="button" onClick={nextSlide} aria-label="Next slide">→</button>
      </div>

      <div className="slide-controls">
        <button className="slide-button" type="button" onClick={previousSlide}>← Previous</button>
        <div className="slide-dots" aria-label={`Slide ${slide} of ${TOTAL_SLIDES}`}>
          {Array.from({ length: TOTAL_SLIDES }, (_, index) => {
            const number = index + 1;
            return (
              <button
                aria-label={`Go to slide ${number}`}
                aria-current={slide === number ? "true" : undefined}
                className={slide === number ? "slide-dot is-active" : "slide-dot"}
                key={number}
                onClick={() => setSlide(number)}
                type="button"
              />
            );
          })}
        </div>
        <button className="slide-button" type="button" onClick={nextSlide}>Next →</button>
      </div>
    </div>
  );
}

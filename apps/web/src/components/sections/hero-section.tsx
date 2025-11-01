"use client";

import React, { useState, useEffect } from "react";

const LogoPlaceholder = () => (
  <div style={{ width: 78, height: 90 }} className="bg-border" />
);

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="flex flex-col items-center mt-[10%] px-6 md:px-0">
      <div
        className={`transition-opacity duration-1000 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex justify-center items-center mb-8">
          <LogoPlaceholder />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-xl mb-2 text-foreground">
            Join the Supernotebooklm community
          </h1>
          <p className="text-sm text-muted-foreground max-w-[620px] mx-auto">
            The home for NotebookLM enthusiasts where you can explore and{" "}
            <a
              href="/upload"
              className="border-b border-border border-dashed hover:text-foreground transition-colors"
            >
              upload
            </a>{" "}
            notebooks, browse{" "}
            <a
              href="/authors"
              className="border-b border-border border-dashed hover:text-foreground transition-colors"
            >
              authors
            </a>
            , discover collections, and connect with the community all in one place.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
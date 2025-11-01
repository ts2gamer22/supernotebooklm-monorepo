"use client";

import React from 'react';

const SearchBar = () => {
    const placeholderText = "Search for a rule or MCP server...";
    const characters = placeholderText.split('');

    // This is to define the keyframes for the animation.
    // It is injected in a style tag, which is a workaround since we can't edit tailwind.config.js
    // and styled-jsx is forbidden.
    const keyframes = `
      @keyframes char-fade-in {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;

    return (
        <div className="max-w-[620px] mx-auto w-full mb-14">
            <style>{keyframes}</style>
            <div className="w-full h-[60px] border border-[#2C2C2C] transition-colors focus-within:border-[#878787]">
                <form className="h-full w-full">
                    <div className="relative h-full">
                        <input
                            className="w-full h-full text-[#585858] text-xs bg-transparent p-4 resize-none focus:outline-none pt-5"
                            aria-label="Search for a rule or MCP server"
                        />
                        <div className="absolute top-4 left-4 pointer-events-none w-full flex text-[#585858] text-xs">
                            {characters.map((char, index) => (
                                <span
                                    key={index}
                                    style={{
                                        animation: `char-fade-in 0.5s ease-out forwards`,
                                        animationDelay: `${index * 0.03}s`,
                                        opacity: 0,
                                    }}
                                >
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
                            ))}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SearchBar;
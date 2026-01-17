import React from "react";

const GridShape: React.FC = () => {
  return (
    <div className="absolute top-0 right-0 -z-1">
      <svg
        width="111"
        height="115"
        viewBox="0 0 111 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M109.833 113.834H41.1664V45.1669H109.833V113.834ZM41.1664 45.1669V113.834"
          stroke="url(#paint0_linear_101_13)"
          strokeWidth="2"
        />
        <path
          d="M75.5 45.1669V113.834"
          stroke="url(#paint1_linear_101_13)"
          strokeWidth="2"
        />
        <path
          d="M109.833 79.5H41.1664"
          stroke="url(#paint2_linear_101_13)"
          strokeWidth="2"
        />
        <defs>
          <linearGradient
            id="paint0_linear_101_13"
            x1="75.5"
            y1="45.1669"
            x2="75.5"
            y2="113.834"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="white" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_101_13"
            x1="76.5"
            y1="45.1669"
            x2="76.5"
            y2="113.834"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="white" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient
            id="paint2_linear_101_13"
            x1="109.833"
            y1="80.5"
            x2="41.1664"
            y2="80.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="white" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default GridShape;

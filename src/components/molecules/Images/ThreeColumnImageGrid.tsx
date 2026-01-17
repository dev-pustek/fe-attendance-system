import React from "react";

const ThreeColumnImageGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="overflow-hidden rounded-xl">
        <img
          src="/images/blog/blog-04.jpg"
          alt="Grid"
          className="w-full h-auto"
        />
      </div>
      <div className="overflow-hidden rounded-xl">
        <img
          src="/images/blog/blog-05.jpg"
          alt="Grid"
          className="w-full h-auto"
        />
      </div>
      <div className="overflow-hidden rounded-xl">
        <img
          src="/images/blog/blog-06.jpg"
          alt="Grid"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
};

export default ThreeColumnImageGrid;

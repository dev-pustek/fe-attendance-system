import React from "react";

const TwoColumnImageGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="overflow-hidden rounded-xl">
        <img
          src="/images/blog/blog-02.jpg"
          alt="Grid"
          className="w-full h-auto"
        />
      </div>
      <div className="overflow-hidden rounded-xl">
        <img
          src="/images/blog/blog-03.jpg"
          alt="Grid"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
};

export default TwoColumnImageGrid;

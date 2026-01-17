import React from "react";

const ResponsiveImage: React.FC = () => {
  return (
    <div className="overflow-hidden rounded-xl">
      <img
        src="/images/blog/blog-01.jpg"
        alt="Responsive"
        className="w-full h-auto"
      />
    </div>
  );
};

export default ResponsiveImage;

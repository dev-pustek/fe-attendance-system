import React from "react";

const OneIsToOne: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden pt-[100%] rounded-xl">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0"
        title="Video 1:1"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default OneIsToOne;

import React from "react";

const GradientBG = () => {
  return (
    <div>
      <div class="relative h-full w-full bg-slate-950">
        <div class="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,200,120,.15),rgba(255,255,255,0))]"></div>
        <div class="absolute bottom-0 right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,200,120,.15),rgba(255,255,255,0))]"></div>
      </div>
    </div>
  );
};

export default GradientBG;

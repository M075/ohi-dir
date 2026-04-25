import logo from "@/public/logo.png";

const Loading = () => {
  return (
    <div data-oid="ac0yemk">
      <CutoutTextLoader
        height="780px"
        background="white"
        darkBackground="black"
        // NOTE: Using GIFs for the background looks super cool :)
        imgUrlDesktop="https://plus.unsplash.com/premium_photo-1723575832464-2c0c772593b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=870"
        imgUrlMobile="https://images.unsplash.com/photo-1588153990953-7c681e89682a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=391"
        data-oid="r-1pgwo"
      />
    </div>
  );
};

const CutoutTextLoader = ({ height, background, darkBackground, imgUrlDesktop, imgUrlMobile }) => {
  return (
    <div className="relative" style={{ height }} data-oid="nqa3ocg">
      {/* Desktop background (visible on md and up) */}
      <div
        className="absolute inset-0 z-0 hidden md:block"
        style={{
          backgroundImage: `url(${imgUrlDesktop})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        data-oid="7_pcuf6_desktop"
      />

      {/* Mobile background (visible below md) */}
      <div
        className="absolute inset-0 z-0 md:hidden"
        style={{
          backgroundImage: `url(${imgUrlMobile})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        data-oid="7_pcuf6_mobile"
      />

      <div
        className={`absolute inset-0 animate-pulse z-10 bg-${background} dark:bg-${darkBackground}`}
        data-oid="s8j2bou"
      />

      {/* Text with desktop background image */}
      <span
        className="font-black dark:text-zinc-50/20 absolute inset-0 z-20 text-center bg-clip-text text-transparent pointer-events-none hidden md:block"
        style={{
          backgroundImage: `url(${imgUrlDesktop})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          fontSize: "clamp(3rem, 12vw, 10rem)",
          lineHeight: height,
        }}
        data-oid="ja2vlrz_desktop"
      >
        Loading...
      </span>

      {/* Text with mobile background image */}
      <span
        className="font-black absolute inset-0 z-20 text-center bg-clip-text text-transparent pointer-events-none md:hidden"
        style={{
          backgroundImage: `url(${imgUrlMobile})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          fontSize: "clamp(3rem, 12vw, 10rem)",
          lineHeight: height,
        }}
        data-oid="ja2vlrz_mobile"
      >
        Loading...
      </span>
    </div>
  );
};

export default Loading;

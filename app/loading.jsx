const Loading = () => {
  return (
    <div className="fixed inset-0 z-50" data-oid="ac0yemk">
      {/* Desktop background */}
      <div
        className="absolute inset-0 z-0 hidden md:block"
        style={{
          backgroundImage: "url(https://plus.unsplash.com/premium_photo-1723575832464-2c0c772593b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=870)",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />

      {/* Mobile background */}
      <div
        className="absolute inset-0 z-0 md:hidden"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1588153990953-7c681e89682a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=391)",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />

      {/* Overlay — white in light mode, black in dark mode */}
      <div className="absolute inset-0 z-10 bg-white/80 dark:bg-black/80" />

      {/* Content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
        <span className="text-lg font-semibold text-black dark:text-white">
          Loading...
        </span>
      </div>
    </div>
  );
};

export default Loading;
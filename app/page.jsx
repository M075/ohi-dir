"use client";
import Hero from "@/assets/components/SearchHero";
import Hero2 from "@/assets/components/Hero2";
import React from "react";
import RecentProducts from "@/assets/components/RecentProducts";
import Loading from "./loading";

const Home = () => {
  return (
    <div data-oid="dy:z9rt">
      <Hero2 data-oid="d02dj6j" />
      <Hero data-oid="93li2j0" />
      <RecentProducts data-oid="t_d7ljo" />
      {console.log(process.env.MONGODB_URI)}
    </div>
  );
};

export default Home;

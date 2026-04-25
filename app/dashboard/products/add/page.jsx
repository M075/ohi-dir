// 'use client'
import React from "react";
import AddProductForm from "@/assets/components/AddProductForm";
import DashboardShell from "@/assets/components/DashboardShell";

const AddProductPage = () => {
  const breadcrumbsData = [
    { label: "Dashboard", link: "#" },
    { label: "Products", link: "/dashboard/products" },
    { label: "Edit Products", link: "/dashboard/products" },
  ];

  return (
    <DashboardShell>
          <AddProductForm />
       </DashboardShell>
  );
};
export default AddProductPage;

// 'use client'
import React from "react";
import EditProductForm from "@/assets/components/EditProductForm";
import DashboardShell from "@/assets/components/DashboardShell";

const EditProductPage = () => {
  const breadcrumbsData = [
    { label: "Dashboard", link: "#" },
    { label: "Products", link: "/dashboard/products" },
    { label: "Edit Product", link: "/dashboard/products" },
  ];

  return (
    <DashboardShell>

          <EditProductForm />
        </DashboardShell>
  );
};
export default EditProductPage;

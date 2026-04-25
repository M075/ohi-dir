import React from "react";
import ProfileDetail from "@/assets/components/ProfileDetail";
import DashboardShell from "@/assets/components/DashboardShell";

const ProfilePage = () => {
  const breadcrumbsData = [
    { label: "Dashboard", link: "/dashboard" },
    { label: "Profile", link: "/dashboard/profile" },
    { label: "Edit Profile", link: "/dashboard/profile" },
  ];

  return (
          <DashboardShell>
            <ProfileDetail />
          </DashboardShell>
  );
};

export default ProfilePage;

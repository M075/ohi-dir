import React from "react";
import { IoPhonePortraitOutline, IoShirt, IoDiamondOutline, IoHeartOutline, IoLaptopOutline, IoHomeOutline, IoRestaurantOutline, IoCubeOutline, IoBodyOutline, IoBookOutline, IoGameControllerOutline, IoSchoolOutline, IoPawOutline, IoCarOutline, IoLeafOutline, IoCartOutline } from "react-icons/io5";
import { FaBabyCarriage, FaLaptop } from "react-icons/fa6";
import { GiLipstick, GiHighHeel } from "react-icons/gi";
import { LiaCouchSolid } from "react-icons/lia";
import { MdSportsBasketball } from "react-icons/md";

export const PRODUCT_CATEGORIES = [
  { value: "Fashion & Apparel", label: "Fashion & Apparel", shortLabel: "Fashion", icon: <GiHighHeel size={20} /> },
  { value: "Footwear & Accessories", label: "Footwear & Accessories", shortLabel: "Footwear", icon: <IoShirt size={20} /> },
  { value: "Jewelry & Watches", label: "Jewelry & Watches", shortLabel: "Jewelry", icon: <IoDiamondOutline size={20} /> },
  { value: "Beauty & Personal Care", label: "Beauty & Personal Care", shortLabel: "Beauty", icon: <GiLipstick size={20} /> },
  { value: "Health & Wellness", label: "Health & Wellness", shortLabel: "Health", icon: <IoHeartOutline size={20} /> },
  { value: "Devices & Electronics", label: "Devices & Electronics", shortLabel: "Electronics", icon: <IoPhonePortraitOutline size={20} /> },
  { value: "Computers & Accessories", label: "Computers & Accessories", shortLabel: "Computers", icon: <FaLaptop size={20} /> },
  { value: "Home & Living", label: "Home & Living", shortLabel: "Home", icon: <IoHomeOutline size={20} /> },
  { value: "Kitchen & Dining", label: "Kitchen & Dining", shortLabel: "Kitchen", icon: <IoRestaurantOutline size={20} /> },
  { value: "Furniture & Decor", label: "Furniture & Decor", shortLabel: "Furniture", icon: <LiaCouchSolid size={20} /> },
  { value: "Sports & Outdoors", label: "Sports & Outdoors", shortLabel: "Sports", icon: <MdSportsBasketball size={20} /> },
  { value: "Fitness & Training", label: "Fitness & Training", shortLabel: "Fitness", icon: <IoBodyOutline size={20} /> },
  { value: "Books & Stationery", label: "Books & Stationery", shortLabel: "Books", icon: <IoBookOutline size={20} /> },
  { value: "Toys & Games", label: "Toys & Games", shortLabel: "Toys", icon: <IoGameControllerOutline size={20} /> },
  { value: "Infants & Toddlers", label: "Infants & Toddlers", shortLabel: "Infants", icon: <FaBabyCarriage size={20} /> },
  { value: "Kids & Teens", label: "Kids & Teens", shortLabel: "Kids", icon: <IoSchoolOutline size={20} /> },
  { value: "Pets & Supplies", label: "Pets & Supplies", shortLabel: "Pets", icon: <IoPawOutline size={20} /> },
  { value: "Automotive & Tools", label: "Automotive & Tools", shortLabel: "Automotive", icon: <IoCarOutline size={20} /> },
  { value: "Garden & Outdoor Living", label: "Garden & Outdoor Living", shortLabel: "Garden", icon: <IoLeafOutline size={20} /> },
  { value: "Groceries & Essentials", label: "Groceries & Essentials", shortLabel: "Groceries", icon: <IoCartOutline size={20} /> }
];

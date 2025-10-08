import React from "react";
import DynamicLogo from "../../DynamicLogo";

const LogoIcon = () => {
  return (
    <DynamicLogo 
      type="sidebar" 
      width={100} 
      height={100} 
      fallbackSrc="/images/Logo.svg"
    />
  );
};

export default LogoIcon;

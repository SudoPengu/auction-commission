import React from 'react';
interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}
const Logo: React.FC<LogoProps> = ({
  size = 'medium'
}) => {
  // Determine size class
  const sizeClass = {
    small: 'h-6',
    medium: 'h-8',
    large: 'h-12'
  }[size];
  return <div className="flex items-center">
      <div className={`brand-gradient rounded-lg ${sizeClass} aspect-square flex items-center justify-center text-white font-bold shadow-sm`}>
        BS
      </div>
      <span className="ml-2 font-bold text-foreground">BlueSky Inc</span>
    </div>;
};
export default Logo;
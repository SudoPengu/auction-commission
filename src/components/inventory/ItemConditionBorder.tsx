
import React from 'react';

interface ItemConditionBorderProps {
  condition: 'brand_new' | 'like_new' | 'used_good' | 'used_fair' | 'damaged';
  children: React.ReactNode;
}

export const ItemConditionBorder: React.FC<ItemConditionBorderProps> = ({ 
  condition, 
  children 
}) => {
  const getBorderColor = () => {
    switch (condition) {
      case 'brand_new':
        return 'border-l-green-500 border-l-4';
      case 'like_new':
        return 'border-l-yellow-500 border-l-4';
      case 'used_good':
        return 'border-l-orange-500 border-l-4';
      case 'used_fair':
        return 'border-l-red-500 border-l-4';
      case 'damaged':
        return 'border-l-gray-900 border-l-4';
      default:
        return 'border-l-gray-300 border-l-4';
    }
  };

  const getConditionLabel = () => {
    switch (condition) {
      case 'brand_new':
        return '🟢 Brand New';
      case 'like_new':
        return '🟡 Like New';
      case 'used_good':
        return '🟠 Used - Good';
      case 'used_fair':
        return '🔴 Used - Fair';
      case 'damaged':
        return '⚫ Damaged';
      default:
        return condition;
    }
  };

  return (
    <div className={`relative ${getBorderColor()}`}>
      {children}
      <div className="absolute top-2 right-2">
        <span className="text-xs bg-background/90 px-1 py-0.5 rounded">
          {getConditionLabel()}
        </span>
      </div>
    </div>
  );
};

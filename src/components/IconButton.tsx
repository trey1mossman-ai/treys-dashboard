import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  label?: string;
  glow?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  label, 
  className, 
  glow = true,
  variant = 'ghost',
  size = 'icon',
  ...props 
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        glow && "hover-glow",
        className
      )}
      aria-label={label}
      {...props}
    >
      {icon}
    </Button>
  );
};
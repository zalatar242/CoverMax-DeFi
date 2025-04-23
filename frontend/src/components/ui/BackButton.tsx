import React from 'react';
import { Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, NavigateFunction, To } from 'react-router-dom';

interface BackButtonProps {
  text?: string;
  to?: string | number;
}

const BackButton: React.FC<BackButtonProps> = ({ text = "Back to Dashboard", to = -1 }) => {
  const navigate: NavigateFunction = useNavigate();

  const handleClick = (): void => {
    if (typeof to === 'number') {
      navigate(to); // Use delta overload
    } else {
      navigate(to as To); // Use path overload
    }
  };

  return (
    <Button
      startIcon={<ArrowBack />}
      onClick={handleClick}
      sx={{
        mb: 3,
        color: 'text.primary',
        '&:hover': {
          backgroundColor: 'transparent',
          color: 'primary.main'
        }
      }}
    >
      {text}
    </Button>
  );
};

export default BackButton;

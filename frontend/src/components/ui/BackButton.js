import React from 'react';
import { Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const BackButton = ({ text = "Back to Dashboard", to = -1 }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof to === 'number') {
      navigate(to);
    } else {
      navigate(to);
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

BackButton.propTypes = {
  text: PropTypes.string,
  to: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default BackButton;

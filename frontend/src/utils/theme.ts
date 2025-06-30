import { createTheme } from '@mui/material/styles';

export const colors = {
  primary: '#9097ff',
  primaryDark: '#7A82FF',
  secondary: '#6772E5',
  background: '#F6F9FC',
  text: '#3D4168',
  textLight: '#6B7C93',
  card: '#FFFFFF',
  border: '#E6E9F0'
};

const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
      contrastText: '#FFFFFF', // This ensures white text on primary colored backgrounds
    },
    secondary: {
      main: colors.secondary,
      contrastText: '#FFFFFF',
    },
    text: {
      primary: colors.text,
      secondary: colors.textLight,
    },
    background: {
      default: colors.background,
      paper: colors.card,
    },
    divider: colors.border,
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          fontSize: '1rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.Mui-disabled': {
            backgroundColor: `${colors.primary}80`, // semi-transparent primary color
            color: '#FFFFFF80', // semi-transparent white
          },
        },
        containedPrimary: {
          color: '#FFFFFF', // Ensure white text for primary contained buttons
          '&:hover': {
            backgroundColor: colors.primaryDark,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme;

export const cardStyles = {
  background: colors.card,
  borderRadius: 12,
  boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
  border: `1px solid ${colors.border}`
};

export const buttonStyles = {
  primary: {
    bgcolor: colors.primary,
    color: '#FFFFFF',
    '&:hover': {
      bgcolor: colors.primaryDark,
    },
    '&.Mui-disabled': {
      bgcolor: `${colors.primary}80`,
      color: '#FFFFFF80',
    }
  },
  outlined: {
    color: colors.text,
    borderColor: colors.border,
    '&:hover': { borderColor: colors.text }
  }
};

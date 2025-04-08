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

export const cardStyles = {
  background: colors.card,
  borderRadius: 3,
  boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
  border: `1px solid ${colors.border}`
};

export const buttonStyles = {
  primary: {
    bgcolor: colors.primary,
    '&:hover': { bgcolor: colors.primaryDark }
  },
  outlined: {
    color: colors.text,
    borderColor: colors.border,
    '&:hover': { borderColor: colors.text }
  }
};

import { createTheme } from '@mui/material/styles'

// Light/dark follow the OS (prefers-color-scheme) via CSS variables.
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#4f46e5' },
        secondary: { main: '#475569' },
        background: { default: '#f8fafc', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#818cf8' },
        secondary: { main: '#94a3b8' },
        background: { default: '#0f172a', paper: '#1e293b' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': { minHeight: '100%' },
        body: { WebkitTapHighlightColor: 'transparent' },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiIconButton: {
      styleOverrides: {
        // Comfortable touch targets on phones.
        root: ({ theme }) => ({ [theme.breakpoints.down('sm')]: { minWidth: 44, minHeight: 44 } }),
      },
    },
  },
})

export default theme

const { colors, boxShadow } = require('tailwindcss/defaultTheme');

module.exports = {
  purge: [
    './src/**/*.tsx',
  ],
  theme: {
    colors: {
      ...colors,
      primary: colors.orange,
    },
    boxShadow: (theme) => ({
      ...boxShadow,
      outline: `0 0 0 3px ${theme('colors.orange.300')}`,
    }),
  },
  variants: {
    backgroundColor: ['responsive', 'hover', 'focus', 'disabled', 'active'],
    cursor: ['responsive', 'disabled'],
    opacity: ['responsive', 'hover', 'focus', 'disabled'],
    margin: ['responsive', 'first'],
    borderWidth: ['responsive', 'first', 'hover', 'focus'],
  },
};

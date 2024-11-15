import { extendTheme, theme, type StyleFunctionProps } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";

const colors = {
  blue: {
    400: "#8ab4f8",
    500: "#3182F6",
    600: "#2b6cb0",
  },
};

const createGlobalStyles = (props: Record<string, unknown>) => ({
  body: {
    color: mode("gray.900", "gray.100")(props),
    bg: mode("chakra-ui-body-bg", "#1a1a1a")(props),
  },
});

const createDrawerStyles = (
  props: StyleFunctionProps | Record<string, unknown>,
) => ({
  dialog: {
    bg: mode("chakra-ui-body-bg", "#141214")(props),
  },
});

const SwitchStyles = {
  baseStyle: (props: StyleFunctionProps) => ({
    track: {
      bg: mode("gray.200", "gray.700")(props),
      _checked: {
        bg: mode("blue.500", "blue.600")(props),
      },
    },
  }),
};

const fonts = {
  heading: `'Open-Sans', ${theme.fonts.heading}, sans-serif`,
  body: `'Open-Sans', ${theme.fonts.body}, sans-serif`,
};

const customTheme = extendTheme({
  config: {
    initialColorMode: "system",
  },
  styles: {
    global: createGlobalStyles,
  },
  components: {
    Drawer: {
      baseStyle: createDrawerStyles,
    },
    Switch: SwitchStyles,
  },
  fonts,
  colors,
});

export default customTheme;

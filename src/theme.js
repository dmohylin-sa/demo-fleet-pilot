// Modern Ant Design v5 theme - STRUCTURAL TOKENS ONLY.
// No brand colors are set here, so Ant Design's default palette applies
// (primary #1677FF, default semantic colors, neutral grays). To rebrand a demo,
// add a `colorPrimary` (+ optional colorInfo/colorLink) to `token` below - every
// component and the JS components that read `theme.useToken()` will follow it.
// (The few hex accents in styles.css then become the only manual swap points.)

export const antdTheme = {
  token: {
    // --- shape ---
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    // --- sizing ---
    controlHeight: 38,
    // --- type ---
    fontSize: 14,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // softer neutral hairlines (neutral, not brand)
    colorBorderSecondary: '#ECEDF0',
    wireframe: false,
  },
  components: {
    Layout: {
      // Neutral near-black shell - brand-agnostic, not a brand color.
      headerBg: '#16171A',
      headerHeight: 60,
      bodyBg: '#F4F5F7',
      siderBg: '#FFFFFF',
    },
    Menu: {
      itemBorderRadius: 10,
      itemHeight: 44,
      itemMarginInline: 10,
      itemMarginBlock: 4,
      iconSize: 16,
      // selected/hover colors intentionally left to AntD default (primary tint)
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 22,
      headerFontSize: 15,
      headerHeight: 52,
    },
    Button: {
      borderRadius: 10,
      controlHeight: 38,
      fontWeight: 600,
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Table: {
      headerBg: '#FAFAFB',
      headerColor: '#6B7079',
      borderColor: '#EFF0F2',
      cellPaddingBlock: 15,
      headerSplitColor: 'transparent',
      // rowHoverBg left to AntD default (primary tint)
    },
    Statistic: { contentFontSize: 28 },
    Input: { borderRadius: 10, controlHeight: 38 },
    Select: { borderRadius: 10, controlHeight: 38 },
    Segmented: { borderRadius: 10 },
  },
};

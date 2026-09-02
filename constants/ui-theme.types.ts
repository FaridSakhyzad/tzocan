export type ThemeName = 'light' | 'dark' | 'paperLight' | 'paperDark' | 'contrastWhite' | 'contrastBlack';

export type UiTheme = {
  name: ThemeName;
  statusBarStyle: 'light' | 'dark';
  navigation: {
    dark: boolean;
    colors: {
      primary: string;
      background: string;
      card: string;
      text: string;
      border: string;
      notification: string;
    };
  };
  overlay: {
    strong: string;
    medium: string;
  };
  surface: {
    transparent: string;
    elevated: string;
    elevatedSoft: string;
    elevatedMuted: string;
    card: string;
    cardSoft: string;
    cardAlt: string;
    cardStrong: string;
    field: string;
    fieldStrong: string;
    fieldSelected: string;
    successSoft: string;
    button: {
      primary: string;
      subtle: string;
      subtleStrong: string;
      subtleMedium: string;
      subtleWeak: string;
      subtleWeaker: string;
      danger: string;
    };
  };
  border: {
    field: string;
    subtle: string;
    faint: string;
    muted: string;
    transparent: string;
    success: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    helper: string;
    placeholder: string;
    accentSoft: string;
    onLight: string;
    warning: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
    pillSm: number;
    pillMd: number;
    panelTop: number;
    panelBottom: number;
  };
  spacing: {
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    screenX: number;
    screenHeaderTop: number;
    screenHeaderBottom: number;
    screenBottom: number;
    cardX: number;
    cardY: number;
    sectionGap: number;
    modalX: number;
  };
  typography: {
    titleSm: {
      fontSize: number;
      lineHeight: number;
    };
    titleLg: {
      fontSize: number;
      lineHeight: number;
    };
    screenTitle: {
      fontSize: number;
      lineHeight: number;
    };
    screenSubtitle: {
      fontSize: number;
      lineHeight: number;
    };
    body: {
      fontSize: number;
      lineHeight: number;
    };
    helper: {
      fontSize: number;
      lineHeight: number;
    };
    control: {
      fontSize: number;
    };
  };
  image: {
    modalBackgroundScale: number;
    modalBackgroundSource: number;
  };
};

import { appTheme, darkColors, lightColors, utilityThemes } from '../src/theme/colors';

describe('NewsDaily color system', () => {
  it('maps legacy theme roles to the shared app shell', () => {
    expect(lightColors.background).toBe(appTheme.light.appBackground);
    expect(lightColors.primary).toBe(appTheme.light.appPrimary);
    expect(darkColors.background).toBe(appTheme.dark.appBackground);
    expect(darkColors.primary).toBe(appTheme.dark.appPrimary);
  });

  it('keeps one bottom bar treatment for every main tab', () => {
    expect(appTheme.light.appBottomBar).toBe('#342D28');
    expect(appTheme.light.appBottomActive).toBe('#F08A73');
    expect(appTheme.light.appBottomActiveText).toBe('#F4A18E');
    expect(appTheme.light.appBottomInactive).toBe('#BDB3AA');
    expect(appTheme.dark.appBottomBar).toBe('#241F1C');
  });

  it('uses the requested warm editorial palette without violet containers', () => {
    expect(appTheme.light.appBackground).toBe('#F7F3ED');
    expect(appTheme.light.appHeader).toBe('#342D28');
    expect(appTheme.light.appPrimary).toBe('#C65F4D');
    expect(appTheme.light.appPrimaryContainer).toBe('#F7DED3');
    expect(appTheme.light.appSecondary).toBe('#708978');
    expect(appTheme.light.appBlueContainer).toBe('#E6ECEE');
    expect(appTheme.light.appBlueIcon).toBe('#4F6870');
    expect(appTheme.light.appSageIcon).toBe('#557360');
    expect(appTheme.light.appSurface).toBe('#FFFDF9');
    expect(appTheme.light.appBorder).toBe('#E4DCD2');
    expect(appTheme.light.appVipBorder).toBe('#E5D59F');
    expect(appTheme.light.appErrorContainer).toBe('#FAE8E6');
  });

  it('isolates utility accents from the editorial app theme', () => {
    expect(utilityThemes.calendar.accent).toBe('#7058A5');
    expect(utilityThemes.weather.accent).toBe('#287DA1');
    expect(utilityThemes.calendar.accent).not.toBe(appTheme.light.appPrimary);
  });
});

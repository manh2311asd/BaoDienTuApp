declare module 'solarlunar' {
  export interface LunarDate {
    lYear: number;
    lMonth: number;
    lDay: number;
    animal?: string;
    yearCn?: string;
    monthCn?: string;
    dayCn?: string;
    cYear?: number;
    cMonth?: number;
    cDay?: number;
    gzYear?: string;
    gzMonth?: string;
    gzDay?: string;
    isLeap?: boolean;
    nWeek?: number;
    ncWeek?: string;
    isTerm?: boolean;
    term?: string;
  }

  const solarLunar: {
    solar2lunar(year: number, month: number, day: number): LunarDate;
  };

  export default solarLunar;
}

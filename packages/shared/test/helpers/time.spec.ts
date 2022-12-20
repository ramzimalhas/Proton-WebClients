import { readableTime } from '@proton/shared/lib/helpers/time';
import { enUSLocale } from '@proton/shared/lib/i18n/dateFnLocales';

fdescribe('readableTime()', () => {
    const unixTime = 1666438769; // Sat Oct 22 2022 13:39:29 GMT+0200 (Central European Summer Time)

    let originalDateNow: any;
    let mockedTime: number;

    function setMockedTime(time: number) {
        mockedTime = time;
    }

    beforeEach(() => {
        originalDateNow = Date.now;
        setMockedTime(originalDateNow());
        Date.now = () => mockedTime;
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    it('should return formatted date if it is not todays date', () => {
        expect(readableTime(unixTime)).toEqual('Oct 22, 2022');
    });

    it('should return time if the day is today', () => {
        setMockedTime(unixTime * 1000);

        let result = readableTime(unixTime, {
            locale: enUSLocale,
        });

        expect(result).toMatch(/AM|PM/); // esentially checking that it's X:XX AM or X:XX PM. By using regex, I bypass the problem of the timezones
    });

    it('should apply custom time format for the same day', () => {
        setMockedTime(unixTime * 1000);

        expect(
            readableTime(unixTime, {
                locale: enUSLocale,
                sameDayFormat: 'PP',
            })
        ).toEqual('Oct 22, 2022');
    });

    it('should apply custom time format if it is different day', () => {
        expect(
            readableTime(unixTime, {
                format: 'p',
            })
        ).toMatch(/AM|PM/); // esentially checking that it's X:XX AM or X:XX PM. By using regex, I bypass the problem of the timezones
    });

    it('should use format parameter if sameDayFormat is false', () => {
        setMockedTime(unixTime * 1000);

        let result = readableTime(unixTime, {
            locale: enUSLocale,
            sameDayFormat: false,
        });

        expect(result).toEqual('Oct 22, 2022');
    });
});

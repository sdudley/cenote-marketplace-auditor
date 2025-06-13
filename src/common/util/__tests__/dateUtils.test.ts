import { isoDateMath } from '../dateUtils';

describe('isoDateMath', () => {
    it('should add days to a date', () => {
        expect(isoDateMath('2024-03-15', 1)).toBe('2024-03-16');
        expect(isoDateMath('2024-03-15', 5)).toBe('2024-03-20');
        expect(isoDateMath('2024-03-15', 0)).toBe('2024-03-15');
    });

    it('should subtract days from a date', () => {
        expect(isoDateMath('2024-03-15', -1)).toBe('2024-03-14');
        expect(isoDateMath('2024-03-15', -5)).toBe('2024-03-10');
    });

    it('should handle month boundaries', () => {
        expect(isoDateMath('2024-03-31', 1)).toBe('2024-04-01');
        expect(isoDateMath('2024-03-01', -1)).toBe('2024-02-29'); // 2024 is a leap year
    });

    it('should handle year boundaries', () => {
        expect(isoDateMath('2024-12-31', 1)).toBe('2025-01-01');
        expect(isoDateMath('2024-01-01', -1)).toBe('2023-12-31');
    });

    it('should handle leap years', () => {
        expect(isoDateMath('2024-02-28', 1)).toBe('2024-02-29');
        expect(isoDateMath('2024-02-29', 1)).toBe('2024-03-01');
        expect(isoDateMath('2023-02-28', 1)).toBe('2023-03-01'); // 2023 is not a leap year
    });
});
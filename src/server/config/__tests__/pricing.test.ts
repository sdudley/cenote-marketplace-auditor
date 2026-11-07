import { getPricingConfig } from '../pricing.js';

describe('getPricingConfig', () => {
    it('defaults to non-RoA', () => {
        expect(getPricingConfig({})).toEqual({ isRoA: false });
    });

    it('only treats IS_ROA=true as RoA', () => {
        expect(getPricingConfig({ IS_ROA: 'true' }).isRoA).toBe(true);
        expect(getPricingConfig({ IS_ROA: 'false' }).isRoA).toBe(false);
        expect(getPricingConfig({ IS_ROA: '1' }).isRoA).toBe(false);
    });
});

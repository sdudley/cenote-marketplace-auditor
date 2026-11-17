import { SlackService, SlackTransactionData } from '../SlackService.js';
import { ConfigKey } from '#common/types/configItem.js';
import { SlackChannelType } from '#common/types/slackChannel.js';

function sale(vendorAmount: number, entitlementId = `E-${vendorAmount}`): SlackTransactionData {
    return {
        saleDate: '2026-11-07',
        saleType: 'Renewal',
        addonName: 'Test App',
        licenseType: 'COMMERCIAL',
        hosting: 'Cloud',
        tier: '1 User',
        company: 'Acme',
        maintenanceStartDate: '2026-11-07',
        maintenanceEndDate: '2026-12-07',
        entitlementId,
        vendorAmount,
    };
}

describe('SlackService.postNewTransactionsToSlack - skip $0 sales', () => {
    function setup(skipZeroSales: boolean | undefined) {
        const configDao = {
            get: jest.fn(async (key: string) => (key === ConfigKey.SlackSkipZeroSales ? skipZeroSales : undefined)),
        } as any;
        const service = new SlackService(configDao);
        const postMessage = jest.spyOn(service, 'postMessage').mockResolvedValue();
        return { service, postMessage };
    }

    const postedText = (postMessage: jest.SpyInstance) => postMessage.mock.calls.map(c => c[1]).join('\n');

    it('posts every sale, including $0, when the option is off', async () => {
        const { service, postMessage } = setup(false);
        await service.postNewTransactionsToSlack([sale(0), sale(100)]);

        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(postMessage.mock.calls[0][0]).toBe(SlackChannelType.Sales);
        expect(postedText(postMessage)).toContain('2 New Sales');
    });

    it('treats an unset option as off', async () => {
        const { service, postMessage } = setup(undefined);
        await service.postNewTransactionsToSlack([sale(0)]);
        expect(postMessage).toHaveBeenCalledTimes(1);
    });

    it('drops $0 sales and reports the count and total of what remains when on', async () => {
        const { service, postMessage } = setup(true);
        await service.postNewTransactionsToSlack([sale(0), sale(100), sale(0), sale(50)]);

        expect(postMessage).toHaveBeenCalledTimes(1);
        const text = postedText(postMessage);
        expect(text).toContain('2 New Sales');
        expect(text).toContain('$150.00');
        const blocks = JSON.stringify(postMessage.mock.calls[0][2]);
        expect(blocks).toContain('E-100');
        expect(blocks).toContain('E-50');
        expect(blocks).not.toContain('E-0"');
    });

    it('still posts negative amounts (refunds) when on', async () => {
        const { service, postMessage } = setup(true);
        await service.postNewTransactionsToSlack([sale(-25, 'E-REFUND'), sale(0)]);

        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(postMessage.mock.calls[0][2])).toContain('E-REFUND');
        expect(postedText(postMessage)).toContain('1 New Sale');
    });

    it('posts nothing at all when every sale is $0', async () => {
        const { service, postMessage } = setup(true);
        await service.postNewTransactionsToSlack([sale(0), sale(0)]);
        expect(postMessage).not.toHaveBeenCalled();
    });
});

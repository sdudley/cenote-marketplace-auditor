import { SlackService, SlackLicenseData } from '../SlackService.js';
import { ConfigKey } from '#common/types/configItem.js';
import { SlackChannelType } from '#common/types/slackChannel.js';

function evaluation(entitlementId: string, cloudSiteHostname: string | undefined): SlackLicenseData {
    return {
        lastUpdated: '2026-11-09',
        entitlementId,
        addonName: 'Test App',
        hosting: 'Cloud',
        company: 'Acme',
        cloudSiteHostname,
        maintenanceStartDate: '2026-11-08',
        maintenanceEndDate: '2026-12-08',
        oldMaintenanceEndDate: undefined,
        extended: false,
        evaluationOpportunitySize: undefined,
    };
}

describe('SlackService.postNewLicensesToSlack - site filter', () => {
    function setup(opts: { channel?: string; filter?: string }) {
        const values: Record<string, string | undefined> = {
            [ConfigKey.SlackChannelEvaluations]: 'channel' in opts ? opts.channel : 'evals',
            [ConfigKey.SlackEvaluationsSiteFilter]: opts.filter,
        };
        const configDao = { get: jest.fn(async (key: string) => values[key]) } as any;
        const service = new SlackService(configDao);
        const postMessage = jest.spyOn(service, 'postMessage').mockResolvedValue();
        return { service, postMessage, configDao };
    }

    const blocksText = (postMessage: jest.SpyInstance) => JSON.stringify(postMessage.mock.calls.map(c => c[2]));

    it('posts all evaluations when no filter is set', async () => {
        const { service, postMessage } = setup({});
        await service.postNewLicensesToSlack([evaluation('E-1', 'a.atlassian.net'), evaluation('E-2', 'bugbounty-x.atlassian.net')]);

        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(postMessage.mock.calls[0][0]).toBe(SlackChannelType.Evaluations);
        expect(postMessage.mock.calls[0][1]).toContain('2 New Evaluations');
    });

    it('drops evaluations that do not match, and counts only what remains', async () => {
        const { service, postMessage } = setup({ filter: '^(?!.*(bugbounty|bugcrowd))' });
        await service.postNewLicensesToSlack([
            evaluation('E-KEEP', 'acme.atlassian.net'),
            evaluation('E-BB', 'bugbounty-test-microck.atlassian.net'),
            evaluation('E-BC', 'bugcrowd-zh-b.atlassian.net'),
        ]);

        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(postMessage.mock.calls[0][1]).toContain('1 New Evaluation');
        const text = blocksText(postMessage);
        expect(text).toContain('E-KEEP');
        expect(text).not.toContain('E-BB');
        expect(text).not.toContain('E-BC');
    });

    it('posts nothing when every evaluation is filtered out', async () => {
        const { service, postMessage } = setup({ filter: '^(?!.*bugbounty)' });
        await service.postNewLicensesToSlack([evaluation('E-BB', 'bugbounty-a.atlassian.net')]);
        expect(postMessage).not.toHaveBeenCalled();
    });

    it('posts everything (and logs) when the regex is invalid', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { service, postMessage } = setup({ filter: '(unclosed' });
        await service.postNewLicensesToSlack([evaluation('E-BB', 'bugbounty-a.atlassian.net')]);

        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalledTimes(1);
        consoleError.mockRestore();
    });

    it('does no filter work and logs nothing when the evaluations channel is not configured', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { service, postMessage, configDao } = setup({ channel: '', filter: '(unclosed' });
        await service.postNewLicensesToSlack([evaluation('E-1', 'a.atlassian.net')]);

        expect(postMessage).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
        expect(configDao.get).not.toHaveBeenCalledWith(ConfigKey.SlackEvaluationsSiteFilter);
        consoleError.mockRestore();
    });
});

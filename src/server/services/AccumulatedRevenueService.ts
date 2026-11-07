import { inject, injectable } from "inversify";
import { TYPES } from "#server/config/types.js";
import { TransactionDao } from "#server/database/dao/TransactionDao.js";
import { buildRevenueTimeline, revenueBeforeDate, RevenueTimelineEntry } from "#server/util/revenueTimeline.js";

/** How long the loaded timeline is reused before it is rebuilt from the database. */
const TIMELINE_TTL_MS = 60_000;

/**
 * Accumulated Marketplace revenue across all apps, derived from the stored transactions.
 *
 * Validation asks for this once per transaction (and per previous purchase), so the per-day totals are loaded with a
 * single aggregate query and cached briefly rather than queried each time.
 *
 * Note that the result is only as complete as the imported transaction history: if transactions before the first
 * imported sale date exist on Atlassian's side, accumulated revenue is understated.
 */
@injectable()
export class AccumulatedRevenueService {
    private timeline: RevenueTimelineEntry[] | undefined;
    private loadedAt = 0;
    private loading: Promise<RevenueTimelineEntry[]> | undefined;

    constructor(@inject(TYPES.TransactionDao) private transactionDao: TransactionDao) {}

    /** Revenue accumulated strictly before `date` (YYYY-MM-DD). */
    public async getAccumulatedRevenueBefore(date: string): Promise<number> {
        return revenueBeforeDate(await this.getTimeline(), date);
    }

    /** Drops the cached timeline so the next lookup reloads it (e.g. after importing transactions). */
    public invalidate(): void {
        this.timeline = undefined;
        this.loadedAt = 0;
    }

    private async getTimeline(): Promise<RevenueTimelineEntry[]> {
        if (this.timeline && Date.now() - this.loadedAt < TIMELINE_TTL_MS) {
            return this.timeline;
        }

        // Share one in-flight load between concurrent callers

        this.loading ??= this.transactionDao.getRevenueBySaleDate()
            .then(daily => {
                this.timeline = buildRevenueTimeline(daily);
                this.loadedAt = Date.now();
                return this.timeline;
            })
            .finally(() => {
                this.loading = undefined;
            });

        return this.loading;
    }
}

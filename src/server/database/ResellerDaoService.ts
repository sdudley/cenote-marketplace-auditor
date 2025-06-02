import { DataSource, Repository } from 'typeorm';
import { Reseller } from '@common/entities/Reseller';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';

@injectable()
export class ResellerDaoService {
    private resellerRepo: Repository<Reseller>;
    private resellers: Reseller[] | null = null;

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource
    ) {
        this.resellerRepo = this.dataSource.getRepository(Reseller);
    }

    /**
     * Load all resellers into memory if not already loaded
     */
    private async loadResellers(): Promise<void> {
        if (this.resellers === null) {
            this.resellers = await this.resellerRepo.find();
        }
    }

    /**
     * Find a reseller that matches the given name, using the matchMode
     * specified in each reseller record to determine how to match.
     * Matching is case-insensitive.
     */
    async findMatchingReseller(name: string|undefined): Promise<Reseller | null> {

        if (!name) {
            return null;
        }

        await this.loadResellers();
        const searchName = name.toLowerCase();

        // First try exact matches
        const exactMatch = this.resellers!.find(r =>
            r.matchMode === 'exact' &&
            r.name.toLowerCase() === searchName
        );
        if (exactMatch) {
            return exactMatch;
        }

        // Then try substring matches
        const substringMatch = this.resellers!.find(r =>
            r.matchMode === 'substring' &&
            searchName.includes(r.name.toLowerCase())
        );
        return substringMatch || null;
    }

    /**
     * Save a reseller. If an adjustment already exists for this transaction,
     * it will be updated.
     */
    async saveReseller(reseller: Reseller): Promise<Reseller | null> {
        const savedReseller = await this.resellerRepo.save(reseller);
        // Refresh the cache
        this.resellers = null;
        return savedReseller;
    }
}
import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { MarketplaceService } from '../services/MarketplaceService';
import { AddonService } from '../services/AddonService';
import { TransactionService } from '../services/TransactionService';
import { LicenseService } from '../services/LicenseService';
import { PricingService } from '../services/PricingService';
import { ValidationService } from '../validation/ValidationService';
import { PriceCalculatorService } from '../validation/PriceCalculatorService';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import TransactionDaoService from '../services/TransactionDaoService';
import { LicenseDaoService } from '../services/LicenseDaoService';
import TransactionReconcileDaoService from '../services/TransactionReconcileDaoService';
import { TYPES } from './types';
import { TransactionAdjustmentDaoService } from '../services/TransactionAdjustmentDaoService';
import { ResellerDaoService } from '../services/ResellerDaoService';
import { PreviousTransactionService } from '../services/PreviousTransactionService';

export function configureContainer(dataSource: DataSource): Container {
    const container = new Container();

    // Bind DataSource
    container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);

    // Bind Services
    container.bind<MarketplaceService>(TYPES.MarketplaceService).to(MarketplaceService).inSingletonScope();
    container.bind<AddonService>(TYPES.AddonService).to(AddonService).inSingletonScope();
    container.bind<TransactionService>(TYPES.TransactionService).to(TransactionService).inSingletonScope();
    container.bind<LicenseService>(TYPES.LicenseService).to(LicenseService).inSingletonScope();
    container.bind<PricingService>(TYPES.PricingService).to(PricingService).inSingletonScope();
    container.bind<ValidationService>(TYPES.ValidationService).to(ValidationService).inSingletonScope();
    container.bind<PriceCalculatorService>(TYPES.PriceCalculatorService).to(PriceCalculatorService).inSingletonScope();
    container.bind<IgnoredFieldService>(TYPES.IgnoredFieldService).to(IgnoredFieldService).inSingletonScope();
    container.bind<TransactionDaoService>(TYPES.TransactionDaoService).to(TransactionDaoService).inSingletonScope();
    container.bind<TransactionReconcileDaoService>(TYPES.TransactionReconcileDaoService).to(TransactionReconcileDaoService).inSingletonScope();
    container.bind<LicenseDaoService>(TYPES.LicenseDaoService).to(LicenseDaoService).inSingletonScope();
    container.bind<TransactionAdjustmentDaoService>(TYPES.TransactionAdjustmentDaoService).to(TransactionAdjustmentDaoService).inSingletonScope();
    container.bind<ResellerDaoService>(TYPES.ResellerDaoService).to(ResellerDaoService).inSingletonScope();
    container.bind<PreviousTransactionService>(TYPES.PreviousTransactionService).to(PreviousTransactionService).inSingletonScope();

    return container;
}
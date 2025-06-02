import { DataSource, Repository } from "typeorm";
import { IgnoredField, RecordType } from "@common/entities/IgnoredField";
import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";

@injectable()
export class IgnoredFieldService {
    private ignoredFieldRepository: Repository<IgnoredField>;

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.ignoredFieldRepository = dataSource.getRepository(IgnoredField);
    }

    async addIgnoredField(fieldName: string, recordType: RecordType): Promise<void> {
        const existingField = await this.ignoredFieldRepository.findOne({
            where: { fieldName, recordType }
        });

        if (existingField) {
            throw new Error(`Field ${fieldName} is already ignored for ${recordType} records`);
        }

        const ignoredField = new IgnoredField();
        ignoredField.fieldName = fieldName;
        ignoredField.recordType = recordType;

        await this.ignoredFieldRepository.save(ignoredField);
    }

    async getIgnoredFields(recordType: RecordType): Promise<string[]> {
        const fields = await this.ignoredFieldRepository.find({
            where: { recordType }
        });
        return fields.map(field => field.fieldName);
    }
}
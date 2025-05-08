import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

export type RecordType = "transaction" | "license";

@Entity()
export class IgnoredField {
    @PrimaryGeneratedColumn('uuid')
    id!: number;

    @Column()
    fieldName!: string;

    @Column({
        type: "enum",
        enum: ["transaction", "license"],
        default: "transaction"
    })
    recordType!: RecordType;
}
import {
  Table,
  Column,
  Model,
  HasMany,
  PrimaryKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { User } from './User';
import {
  CompanyProperties,
  CompanyCreateProperties,
} from 'src/company/company.type';

@Table({ tableName: 'companies' })
export class Company extends Model<CompanyProperties, CompanyCreateProperties> {
  @AutoIncrement
  @PrimaryKey
  @Column
  declare id: number;

  @Column
  declare name: string;

  @HasMany(() => User)
  declare users: User[];
}

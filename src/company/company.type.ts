export interface CompanyCreateProperties {
  name: string;
}

export interface CompanyProperties extends CompanyCreateProperties {
  id: number;
}

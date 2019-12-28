import { Repository as DataMapper } from 'typeorm';
import { Diagnosis } from '../../../enterprise/entities/diagnosis';
import { DiagnosisRepository } from '../../../application/repositories/diagnosis-repository';

export class DiagnosisRepositoryImpl implements DiagnosisRepository {
  constructor(private dataMapper: DataMapper<Diagnosis>) {}

  async find(ids: string[]) {
    const result = await this.dataMapper
      .createQueryBuilder('diagnosis')
      .whereInIds(ids)
      .getMany();

    if (!result.length) throw new Error('Entry not found');
    return result;
  }

  async create(diagnosis: Diagnosis) {
    const result = await this.dataMapper.save(diagnosis);
    return result;
  }

  async delete(id: string) {
    await this.dataMapper.delete(id);
    return id;
  }
}

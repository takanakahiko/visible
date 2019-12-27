import { DiagnosisRepository } from '../repositories/diagnosis-repository';
import { Diagnosis } from '../../enterprise/entities/diagnosis';

export class CreateDiagnosis {
  constructor(private diagnosisRepository: DiagnosisRepository) {}

  run(diagnosis: Diagnosis) {
    return this.diagnosisRepository.create(diagnosis);
  }
}

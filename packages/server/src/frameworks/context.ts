import { injectable, inject } from 'inversify';
import { DiagnosisController } from '../adapters/controllers/diagnosis-controller';
import { ReportsController } from '../adapters/controllers/reports-controller';
import { TYPES } from '../types';
import { DiagnosisLoader } from './database/loaders/diagnosis-loader';

@injectable()
export class Context {
  @inject(DiagnosisController)
  diagnosisContorller: DiagnosisController;

  @inject(ReportsController)
  reportsController: ReportsController;

  @inject(TYPES.DiagnosisLoader)
  diagnosisLoader: DiagnosisLoader;
}

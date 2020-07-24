import * as Core from '@visi/core';
import { produce } from 'immer';
import { inject, injectable } from 'inversify';
import path from 'path';
import { from } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';

import { Diagnosis, Status } from '../../domain/models';
import { Logger } from '../../domain/services';
import { TYPES } from '../../types';
import {
  DiagnosisRepository,
  PointerRepository,
  ReportRepository,
  RuleRepository,
  SourceRepository,
} from '../repositories';
import { Translator } from '../translator';
import {
  ProcessDiagnosisRequest,
  ProcessDiagnosisResponse,
  ProcessDiagnosisUseCase,
} from '../use-cases';

@injectable()
export class ProcessDiagnosisInteractor implements ProcessDiagnosisUseCase {
  constructor(
    @inject(TYPES.Logger)
    private readonly logger: Logger,

    @inject(TYPES.DiagnosisRepository)
    private readonly diagnosisRepository: DiagnosisRepository,

    @inject(TYPES.RuleRepository)
    private readonly ruleRepository: RuleRepository,

    @inject(TYPES.ReportRepository)
    private readonly reportsRepository: ReportRepository,

    @inject(TYPES.PointerRepository)
    private readonly pointersRepository: PointerRepository,

    @inject(TYPES.SourceRepository)
    private readonly sourceRepository: SourceRepository,

    @inject(Translator)
    private readonly translator: Translator,
  ) {}

  private async handleProgress(
    progress: Core.Progress,
    base: Diagnosis,
    visible: Core.Visible,
  ) {
    this.logger.info(
      `Diagnosing in progress ${progress.doneCount}/${progress.totalCount}`,
    );

    // Update
    const report = await this.translator.createReport(
      progress.report,
      base.id,
      visible.getSources(),
    );

    const diagnosis = produce(base, (draft) => {
      draft.updatedAt = new Date();
      draft.status = Status.PROCESSING;
      draft.doneCount = progress.doneCount;
      draft.totalCount = progress.totalCount;
      draft.reports.push(report);
    });

    // Save
    await this.ruleRepository.save(report.rule);
    await this.diagnosisRepository.save(diagnosis);
    await this.reportsRepository.save(report);
    for (const pointer of report.pointers ?? []) {
      if (pointer.source) {
        await this.sourceRepository.save(pointer.source);
      }
      await this.pointersRepository.save(pointer);
    }
    await this.diagnosisRepository.publish(diagnosis);
    return diagnosis;
  }

  private async handleComplete(base: Diagnosis) {
    const diagnosis = produce(base, (draft) => {
      draft.status = Status.DONE;
      draft.updatedAt = new Date();
    });

    await this.diagnosisRepository.save(diagnosis);
    await this.diagnosisRepository.publish(diagnosis);
  }

  private async handleError(base: Diagnosis) {
    const diagnosis = produce(base, (draft) => {
      draft.status = Status.FAILED;
      draft.updatedAt = new Date();
    });

    await this.diagnosisRepository.save(diagnosis);
    await this.diagnosisRepository.publish(diagnosis);
  }

  async run({
    diagnosis,
  }: ProcessDiagnosisRequest): Promise<ProcessDiagnosisResponse> {
    this.logger.info(`Processing diagnosis`, diagnosis);

    const visible = await Core.Visible.init({
      plugins: ['@visi/plugin-standard'],
      settings: {
        screenshot: 'only-fail',
        screenshotDir: path.join(process.cwd(), 'tmp'),
      },
    });

    await visible.open(diagnosis.url);
    await visible
      .diagnose()
      .pipe(
        concatMap((progress) =>
          from(this.handleProgress(progress, diagnosis, visible)),
        ),
        tap((newDiagnosis) => (diagnosis = newDiagnosis)),
        catchError(async (error) => {
          await this.handleError(diagnosis);
          throw error;
        }),
      )
      .toPromise();

    await this.handleComplete(diagnosis);
    await visible.close();

    return;
  }
}

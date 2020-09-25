import { inject, injectable } from 'inversify';
import { defer } from 'rxjs';
import { concatMap, throttleTime } from 'rxjs/operators';

import { Diagnosis, Progress, Status } from '../../domain/models';
import { Analyzer, Logger } from '../../domain/services';
import { TYPES } from '../../types';
import { delay } from '../../utils/delay';
import { DiagnosisRepository } from '../repositories';
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

    @inject(TYPES.Analyzer)
    private readonly analyzer: Analyzer,
  ) {}

  async run({
    id,
  }: ProcessDiagnosisRequest): Promise<ProcessDiagnosisResponse> {
    this.logger.info(`Processing diagnosis`, id);
    let [diagnosis] = await this.diagnosisRepository.find([id]);
    diagnosis = await this.handleStart(diagnosis);

    return new Promise((resolve, reject) => {
      this.analyzer
        .validate({ url: diagnosis.url, diagnosisId: diagnosis.id })
        .pipe(
          throttleTime(3000, undefined, { leading: true, trailing: true }),
          concatMap((progress) =>
            defer(async () => {
              const newDiagnosis = await this.handleProgress(
                progress,
                diagnosis,
              );
              if (newDiagnosis == null) throw new Error();
              return (diagnosis = newDiagnosis);
            }),
          ),
        )
        .subscribe({
          complete: async () => {
            // Put delay to wait for client to receive the last data
            // and ready for the next stream
            await delay(1000);
            await this.handleComplete(diagnosis);
            resolve();
          },
          error: (error) => {
            this.handleError(diagnosis, error);
            reject();
          },
        });
    });
  }

  private async handleStart(base: Diagnosis) {
    this.logger.info(`Taking screenshot for ${base.url}`);

    const website = await this.analyzer.capture({ url: base.url });

    const diagnosis = base
      .setScreenshot(website.screenshot)
      .setURL(website.url)
      .setStatus(Status.STARTED);

    try {
      await this.diagnosisRepository.save(diagnosis);
      return diagnosis;
    } catch (error) {
      this.logger.error(error);
      return diagnosis.setStatus(Status.FAILED);
    }
  }

  private async handleProgress(progress: Progress, oldDiagnosis: Diagnosis) {
    this.logger.info(
      `Diagnosing in progress ${progress.doneCount}/${progress.totalCount}`,
    );

    // Update
    const diagnosis = oldDiagnosis
      .setTotalCount(progress.totalCount)
      .setDoneCount(progress.doneCount)
      .setStatus(Status.PROCESSING)
      .setSources(progress.sources)
      .setUpdatedAt(new Date());

    // Save
    try {
      await this.diagnosisRepository.save(diagnosis);
      return diagnosis;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async handleComplete(base: Diagnosis) {
    const diagnosis = base.setStatus(Status.DONE).setUpdatedAt(new Date());
    this.logger.info(`Diagnosis for ${base.id} has successfully completed`);

    try {
      await this.diagnosisRepository.save(diagnosis);
      return diagnosis;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async handleError(base: Diagnosis, error: Error) {
    this.logger.error(error);
    const diagnosis = base.setStatus(Status.FAILED).setUpdatedAt(new Date());
    await this.diagnosisRepository.save(diagnosis);
    this.logger.info(`Diagnosis for ${base.id} was ended with an error`);
  }
}

#!/usr/bin/env node
import yargs from 'yargs';
import { table } from 'table';
import { Spinner } from 'cli-spinner';
import chalk from 'chalk';
import { visible } from '@visi/core';

yargs.command(
  '*',
  'the default command',
  yargs =>
    yargs.option('url', {
      description: 'URL to diagnosis',
      type: 'string',
      required: true,
    }),

  async ({ url }) => {
    const spinner = new Spinner('Fetching diagnosis...')
      .setSpinnerString(18)
      .start();

    const reports = await visible({ url });

    const rows = [
      [chalk.bold('Kind'), chalk.bold('Type'), chalk.bold('HTML')],
      ...reports.map(report => {
        const type = {
          ok: chalk.green('ok'),
          warn: chalk.yellow('warn'),
          error: chalk.red('error'),
        }[report.type];

        return [type, report.id, report.html ? report.html : ''];
      }),
    ];

    const output = table(rows);
    spinner.stop();

    // eslint-disable-next-line no-console
    console.log('\n' + output);
  },
).argv;

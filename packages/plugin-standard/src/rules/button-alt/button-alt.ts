import { Rule, Report, ReportLevel, Context, ReportContent } from '@visi/core';
import { createXPath } from '../../utils/create-xpath';

export class ButtonAltRule implements Rule {
  meta = {
    name: 'button-alt',
    description: 'Checks button has textContent yor title attribute',
    fixable: true,
  };

  constructor(private context: Context) {}

  async audit() {
    const elements = Array.from(document.getElementsByTagName('button'));
    const reports: Report[] = [];

    for (const element of elements) {
      const report = await this.createNoAltReport(element);
      reports.push(report);
    }

    return reports;
  }

  async fix(content: ReportContent) {
    return content;
  }

  private async createNoAltReport(element: Element): Promise<Report> {
    const { t } = this.context;
    const textContent = element.textContent;
    const title = element.getAttribute('title');
    const outerHTML = element.outerHTML;

    if (!textContent && !title) {
      return {
        type: 'button-alt.no-alt',
        rule: this.meta.name,
        level: ReportLevel.ERROR,
        message: t(
          'button-alt.no-alt',
          'button element must have title attribute or text content',
        ),
        content: {
          html: outerHTML,
          xpath: createXPath(element),
        },
      };
    }

    return {
      type: 'button-alt.ok',
      rule: this.meta.name,
      level: ReportLevel.OK,
      content: {
        html: outerHTML,
        xpath: createXPath(element),
      },
    };
  }
}

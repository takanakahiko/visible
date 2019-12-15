import { Rule } from '../../domain/rule';
import { Report } from '../../domain/report';

export const buttonAlt: Rule = async ({ page, i18n }) => {
  const elements = await page.$$('button');
  const reports: Report[] = [];

  for (const element of elements) {
    const hasTextContent = await element.evaluate(e => !!e.textContent);
    const hasTitle = await element.evaluate(e => !!e.getAttribute('title'));
    const html = await element.evaluate(e => e.outerHTML);

    if (!hasTextContent && !hasTitle) {
      reports.push({
        id: 'button-alt',
        type: 'error',
        html,
        message: i18n.t(
          'button-alt.no-alt',
          'button element must have title attribute or text content',
          { ns: 'core' },
        ),
      });

      continue;
    }

    reports.push({
      id: 'button-alt',
      type: 'ok',
      html,
    });
  }

  return reports;
};

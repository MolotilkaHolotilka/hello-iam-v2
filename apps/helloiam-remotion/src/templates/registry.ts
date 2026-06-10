import type {TemplateComponent} from './types';
import * as template0 from './css-import-test-1781079356009/template';
import * as template1 from './i-am-dolma-deep-dive/template';
import * as template2 from './i-am-khachkar-deep-dive/template';
import * as template3 from './i-am-lavash-deep-dive/template';
import * as template4 from './i-am-matsun-deep-dive/template';
import * as template5 from './pipeline-demo/template';

type TemplateModule = Record<string, unknown> & {
  default?: TemplateComponent;
  Template?: TemplateComponent;
};

const pickTemplate = (
  module: TemplateModule,
  templateId: string,
  exportName?: string,
): TemplateComponent => {
  const namedExport = exportName ? module[exportName] : undefined;
  const component = namedExport ?? module.Template ?? module.default;

  if (typeof component !== 'function') {
    throw new Error(`Template "${templateId}" does not export a component`);
  }

  return component as TemplateComponent;
};

export const templateRegistry: Record<string, TemplateComponent> = {
  "css-import-test-1781079356009": pickTemplate(template0, "css-import-test-1781079356009", "Template"),
  "i-am-dolma-deep-dive": pickTemplate(template1, "i-am-dolma-deep-dive", "Template"),
  "i-am-khachkar-deep-dive": pickTemplate(template2, "i-am-khachkar-deep-dive", "Template"),
  "i-am-lavash-deep-dive": pickTemplate(template3, "i-am-lavash-deep-dive", "Template"),
  "i-am-matsun-deep-dive": pickTemplate(template4, "i-am-matsun-deep-dive", "Template"),
  "pipeline-demo": pickTemplate(template5, "pipeline-demo", "Template"),
};

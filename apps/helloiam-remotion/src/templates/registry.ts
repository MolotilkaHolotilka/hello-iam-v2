import type {TemplateComponent} from './types';
import * as template0 from './armenian-food-carousel/template';
import * as template1 from './deep-dive-theme-blue/template';
import * as template2 from './deep-dive-theme-dark/template';
import * as template3 from './deep-dive-theme-gray/template';
import * as template4 from './green-plate-intro/template';
import * as template5 from './i-am-7-cards/template';
import * as template6 from './i-am-culture-intro/template';
import * as template7 from './i-am-dolma-deep-dive/template';
import * as template8 from './i-am-food-intro/template';
import * as template9 from './i-am-khachkar-deep-dive/template';
import * as template10 from './i-am-lavash-deep-dive/template';
import * as template11 from './i-am-matsun-deep-dive/template';
import * as template12 from './i-am-streets-intro/template';
import * as template13 from './i-am-wine-deep-dive/template';

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
  "armenian-food-carousel": pickTemplate(template0, "armenian-food-carousel", "Template"),
  "deep-dive-theme-blue": pickTemplate(template1, "deep-dive-theme-blue", "Template"),
  "deep-dive-theme-dark": pickTemplate(template2, "deep-dive-theme-dark", "Template"),
  "deep-dive-theme-gray": pickTemplate(template3, "deep-dive-theme-gray", "Template"),
  "green-plate-intro": pickTemplate(template4, "green-plate-intro", "Template"),
  "i-am-7-cards": pickTemplate(template5, "i-am-7-cards", "Template"),
  "i-am-culture-intro": pickTemplate(template6, "i-am-culture-intro", "Template"),
  "i-am-dolma-deep-dive": pickTemplate(template7, "i-am-dolma-deep-dive", "Template"),
  "i-am-food-intro": pickTemplate(template8, "i-am-food-intro", "Template"),
  "i-am-khachkar-deep-dive": pickTemplate(template9, "i-am-khachkar-deep-dive", "Template"),
  "i-am-lavash-deep-dive": pickTemplate(template10, "i-am-lavash-deep-dive", "Template"),
  "i-am-matsun-deep-dive": pickTemplate(template11, "i-am-matsun-deep-dive", "Template"),
  "i-am-streets-intro": pickTemplate(template12, "i-am-streets-intro", "Template"),
  "i-am-wine-deep-dive": pickTemplate(template13, "i-am-wine-deep-dive", "Template"),
};

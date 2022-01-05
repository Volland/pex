import { FieldV1, FieldV2 } from '@sphereon/pex-models';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import jp, { PathComponent } from 'jsonpath';

import { Status } from '../../ConstraintUtils';
import {
  IInternalPresentationDefinition,
  InternalPresentationDefinitionV2,
  InternalVerifiableCredential,
} from '../../types/Internal.types';
import PEMessages from '../../types/Messages';
import { JsonPathUtils } from '../../utils';
import { EvaluationClient } from '../evaluationClient';
import { HandlerCheckResult } from '../handlerCheckResult';

import { AbstractEvaluationHandler } from './abstractEvaluationHandler';

export class InputDescriptorFilterEvaluationHandler extends AbstractEvaluationHandler {
  constructor(client: EvaluationClient) {
    super(client);
  }

  public getName(): string {
    return 'FilterEvaluation';
  }

  public handle(pd: IInternalPresentationDefinition, vcs: InternalVerifiableCredential[]): void {
    const fields: { path: PathComponent[]; value: FieldV1 | FieldV2 }[] = jp.nodes(pd, '$..fields[*]');
    vcs.forEach((vc: InternalVerifiableCredential, vcIndex: number) => {
      this.createNoFieldResults(pd, vcIndex);
      fields.forEach((field) => {
        let inputField = [];
        if (field.value.path) {
          inputField = JsonPathUtils.extractInputField(vc, field.value.path);
        }
        if (!inputField.length) {
          const payload = { valid: false };
          this.createResponse(field, vcIndex, payload, PEMessages.INPUT_CANDIDATE_DOESNT_CONTAIN_PROPERTY);
        } else if (!this.evaluateFilter(inputField[0], field.value)) {
          const payload = { result: { ...inputField[0] }, valid: false };
          this.createResponse(field, vcIndex, payload, PEMessages.INPUT_CANDIDATE_FAILED_FILTER_EVALUATION);
        } else {
          const payload = { result: { ...inputField[0] }, valid: true };
          this.getResults().push({
            ...this.createResultObject(jp.stringify(field.path.slice(0, 3)), vcIndex, payload),
          });
        }
      });
    });
    this.updatePresentationSubmission(pd);
  }

  private createNoFieldResults(pd: IInternalPresentationDefinition, vcIndex: number) {
    // PresentationDefinitionV2 is the common denominator
    const noFields = (pd as InternalPresentationDefinitionV2).input_descriptors
      .map((inDesc, index) => {
        return { index, inDesc };
      })
      .filter((el) => el.inDesc.constraints?.fields === undefined || el.inDesc.constraints?.fields?.length === 0);
    noFields.forEach((noField) => {
      const payload = { result: [], ['valid']: true };
      this.getResults().push({
        ...this.createResultObject(`$.input_descriptors[${noField.index}]`, vcIndex, payload),
      });
    });
  }

  private createResponse(
    field: { path: PathComponent[]; value: FieldV1 | FieldV2 },
    vcIndex: number,
    payload: { result?: { path: PathComponent[]; value: unknown }; valid: boolean },
    message: string
  ): void {
    this.getResults().push({
      ...this.createResultObject(jp.stringify(field.path.slice(0, 3)), vcIndex, payload),
      ['status']: Status.ERROR,
      ['message']: message,
    });
  }

  private createResultObject(path: string, vcIndex: number, payload: unknown): HandlerCheckResult {
    return {
      input_descriptor_path: path,
      verifiable_credential_path: `$[${vcIndex}]`,
      evaluator: this.getName(),
      status: Status.INFO,
      message: PEMessages.INPUT_CANDIDATE_IS_ELIGIBLE_FOR_PRESENTATION_SUBMISSION,
      payload,
    };
  }

  private evaluateFilter(result: { path: string[]; value: unknown }, field: FieldV1 | FieldV2): boolean {
    const ajv = new Ajv();
    addFormats(ajv);
    if (field.filter) {
      return ajv.validate(field.filter, result.value);
    }
    return true;
  }
}

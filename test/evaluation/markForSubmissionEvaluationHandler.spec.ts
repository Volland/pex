import fs from 'fs';

import { InternalVerifiableCredential, VerifiablePresentation } from '../../lib';
import { EvaluationClient, HandlerCheckResult } from '../../lib';
import { MarkForSubmissionEvaluationHandler } from '../../lib/evaluation/handlers';
import { InternalPresentationDefinitionV1 } from '../../lib/types/SSI.types';
import { SSITypesBuilder } from '../../lib/types/SSITypesBuilder';

const results: HandlerCheckResult[] = [
  {
    input_descriptor_path: '$.input_descriptors[0]',
    verifiable_credential_path: '$[0]',
    evaluator: 'UriEvaluation',
    status: 'info',
    message:
      'presentation_definition URI for the schema of the candidate input is equal to one of the input_descriptors object uri values.',
  },
  {
    input_descriptor_path: '$.input_descriptors[0]',
    verifiable_credential_path: '$[0]',
    evaluator: 'FilterEvaluation',
    status: 'info',
    message: 'Input candidate valid for presentation submission',
    payload: { result: { value: 'eu', path: ['$', 'details', 'citizenship'] }, valid: true },
  },
  {
    input_descriptor_path: '$.input_descriptors[0]',
    verifiable_credential_path: '$[0]',
    evaluator: 'PredicateRelatedField',
    status: 'info',
    message: 'Input candidate valid for presentation submission',
    payload: { value: true, path: ['$', 'age'] },
  },
];

const results_with_error: HandlerCheckResult[] = [
  {
    input_descriptor_path: '$.input_descriptors[0]',
    verifiable_credential_path: '$[0]',
    evaluator: 'UriEvaluation',
    status: 'info',
    message:
      'presentation_definition URI for the schema of the candidate input is equal to one of the input_descriptors object uri values.',
  },
  {
    input_descriptor_path: '$.input_descriptors[0]',
    verifiable_credential_path: '$[0]',
    evaluator: 'FilterEvaluation',
    status: 'info',
    message: 'Input candidate valid for presentation submission',
    payload: { result: { value: 'eu', path: ['$', 'details', 'citizenship'] }, valid: true },
  },
  {
    input_descriptor_path: '$.input_descriptors[0]',
    verifiable_credential_path: '$[0]',
    evaluator: 'PredicateRelatedField',
    status: 'error',
    message: 'Input candidate invalid for presentation submission',
    payload: { value: false, path: ['$', 'age'] },
  },
];

function getFile(
  path: string
): InternalPresentationDefinitionV1 | VerifiablePresentation | InternalVerifiableCredential {
  const file = JSON.parse(fs.readFileSync(path, 'utf-8'));
  if (Object.keys(file).includes('presentation_definition')) {
    return file.presentation_definition as InternalPresentationDefinitionV1;
  } else if (Object.keys(file).includes('presentation_submission')) {
    return file as VerifiablePresentation;
  } else {
    return file as InternalVerifiableCredential;
  }
}

describe('markForSubmissionEvaluationHandler tests', () => {
  it(`Mark input candidates for presentation submission`, () => {
    const presentation: VerifiablePresentation = getFile(
      './test/dif_pe_examples/vp/vp_general.json'
    ) as VerifiablePresentation;
    const presentationDefinition: InternalPresentationDefinitionV1 = getFile(
      './test/resources/pd_input_descriptor_filter.json'
    ) as InternalPresentationDefinitionV1;
    presentationDefinition.input_descriptors = [presentationDefinition.input_descriptors[0]];
    const evaluationClient: EvaluationClient = new EvaluationClient();
    evaluationClient.results.push(...results);
    const evaluationHandler = new MarkForSubmissionEvaluationHandler(evaluationClient);
    evaluationHandler.handle(
      presentationDefinition,
      SSITypesBuilder.mapExternalVerifiableCredentialsToInternal(presentation.verifiableCredential)
    );
    const length = evaluationHandler.getResults().length;
    expect(evaluationHandler.getResults()[length - 1]).toEqual({
      evaluator: 'MarkForSubmissionEvaluation',
      input_descriptor_path: '$.input_descriptors[0]',
      message: 'The input candidate is eligible for submission',
      payload: { group: ['A'] },
      status: 'info',
      verifiable_credential_path: '$[0]',
    });
  });

  it(`Mark input candidates for presentation submission with errors`, () => {
    const presentation: VerifiablePresentation = getFile(
      './test/dif_pe_examples/vp/vp_general.json'
    ) as VerifiablePresentation;
    const presentationDefinition: InternalPresentationDefinitionV1 = getFile(
      './test/resources/pd_input_descriptor_filter.json'
    ) as InternalPresentationDefinitionV1;
    presentationDefinition.input_descriptors = [presentationDefinition.input_descriptors[0]];
    const evaluationClient: EvaluationClient = new EvaluationClient();
    evaluationClient.results.push(...results_with_error);
    const evaluationHandler = new MarkForSubmissionEvaluationHandler(evaluationClient);
    evaluationHandler.handle(
      presentationDefinition,
      SSITypesBuilder.mapExternalVerifiableCredentialsToInternal(presentation.verifiableCredential)
    );
    const length = evaluationHandler.getResults().length;
    expect(evaluationHandler.getResults()[length - 1]).toEqual({
      evaluator: 'MarkForSubmissionEvaluation',
      input_descriptor_path: '$.input_descriptors[0]',
      message: 'The input candidate is not eligible for submission',
      payload: { evaluator: 'PredicateRelatedField', path: ['$', 'age'], value: false },
      status: 'error',
      verifiable_credential_path: '$[0]',
    });
  });
});

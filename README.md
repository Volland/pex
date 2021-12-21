<h1 align="center">
  <br>
  <a href="https://www.sphereon.com"><img src="https://sphereon.com/content/themes/sphereon/assets/img/logo.svg" alt="Sphereon" width="400"></a>
  <br>PE-JS   DIF Presentation Exchange Type/JavaScript Library 
  <br>
</h1>

[![CI](https://github.com/Sphereon-Opensource/pe-js/actions/workflows/main.yml/badge.svg)](https://github.com/Sphereon-Opensource/pe-js/actions/workflows/main.yml) [![codecov](https://codecov.io/gh/Sphereon-Opensource/pe-js/branch/develop/graph/badge.svg?token=9P1JGUYA35)](https://codecov.io/gh/Sphereon-Opensource/pe-js) [![NPM Version](https://img.shields.io/npm/v/@sphereon/pe-js.svg)](https://npm.im/@sphereon/pe-js)

## Active Development

_IMPORTANT: This software still is in early development stage. As such you should expect breaking changes in APIs, we
expect to keep that to a minimum though._

## Background

The PE-JS Library is a general use presentation exchange library that implements the functionality described in
the [DIF Presentation Exchange v1.0.0 specification](https://identity.foundation/presentation-exchange/). It is written
in Typescript and can be compiled to any target JavaScript version.

Sphereon's PE Library is useful for both verifier systems and holders (e.g. wallets) and can be used in client side
browsers and mobile applications as well as on server side technology such as REST APIs (e.g. built with NodeJS). It
allows anyone to add DIF Presentation Exchange logic to their existing wallets, agents and/or verifiers, without making
any further assumptions about the technologies used in their products.

The presentation exchange operates generally as follows; The verifier creates a Presentation Definition asking for
credentials from the holder. The definition for the credentials is sent to the holder, who returns a presentation as a
response. Now the verifier will verify the presentation by checking the signature and other accompanying proofs.

The presentation exchange will ensure that the model used by the verifier, can be interpreted by the holder. It then
ensures that the correct parts from the holders credentials are used to create the presentation. The PE contains all the
logic to interpret the models, therefore removing the need for the verifier and holder to align their specific models.

The data objects (models) used in PE-JS are generated from Sphereon's DIF PE OpenAPI Spec component. The code for the
component can be seen at [PE-OpenAPI github repository](https://github.com/Sphereon-Opensource/pe-openapi). This allows
the generation of the objects in many languages and frameworks consistently by configuring the maven plugin.

### The PE Library supports the following actions:

* Creating a presentation definition / request
* Validating a presentation definition / conforming to the specification
* Creating a Presentation
* Creating a Verifiable Presentation using a callback function
* Validating a presentation (submission) when received
* Input evaluations: Verification of presentation submissions conforming to the presentation definition
* Utilities: to build and use different models compliant with
  the [DIF Presentation Exchange v2.0.0 specification](https://identity.foundation/presentation-exchange/).

Stateful storage, signature support or credential management should be implemented in separate libraries/ modules that
make use of the underlying DIF Presentation Exchange implementation. By keeping these separate, the library will stay
platform agnostic and lean with regards to dependencies.

## For PE-JS Users

The library can be installed direction from npmjs via:

```shell
# install via yarn
  yarn add @sphereon/pe-js

# install via npm
  npm install @sphereon/pe-js
```

The core functionality of the DIF Presentation Exchange can be outlined as follows:

* Input Evaluation
* Credential Query
* Presentation and Verifiable Presentation creation
* Utilities

### Input Evaluation

Input evaluation is the primary mechanism by which a verifier determines whether a presentation submission from a holder
matches the requested presentation definition from the request.

```typescript
import { pejs } from '@sphereon/pe-js';

const pe = new pejs();

const presentationDefinitionV1 = {
  "id": "32f54163-7166-48f1-93d8-ff217bdb0653",
  "input_descriptors": [
    {
      "id": "wa_driver_license",
      "name": "Washington State Business License",
      "purpose": "We can only allow licensed Washington State business representatives into the WA Business Conference",
      "schema": [{
        "uri": "https://licenses.example.com/business-license.json"
      }]
    }
  ]
};

const presentationDefinitionV2 = {
  "id": "32f54163-7166-48f1-93d8-ff217bdb0653",
  "input_descriptors": [
    {
      "id": "wa_driver_license",
      "name": "Washington State Business License",
      "purpose": "We can only allow licensed Washington State business representatives into the WA Business Conference"
    }
  ]
};

const verifiablePresentation = {
  '@context': [
    "https://www.w3.org/2018/credentials/v1",
    "https://identity.foundation/presentation-exchange/submission/v1"
  ],
  type: [
    "VerifiablePresentation",
    "PresentationSubmission"
  ],
  presentation_submission: { ... },
  verifiableCredential: [...],
  proof: { ... }
}

const { value, warnings, errors } = pe.evaluate(presentationDefinition, verifiablePresentation);
```

### Credential Query

A credential query allows holders to filter their set of credentials for matches to a given presentation definition.

```typescript
import { pejs } from '@sphereon/pe-js';

const pe = new pejs();

// Definition from verifier request
const presentationDefinition = {
  ...
};

// Example for loading credentials
const credentials = await secureStore.getCredentials();

// Find matching credentials
const srMatches = pe.selectFrom(presentationDefinition, credentials, holderDid);

// An example that selects the first 'count' credentials from
// the matches. in a real scenario, the user has to select which 
// credentials to use. PE-JS did the first filtering, 
// but there still could be multiple credentials satisfying a presentation definition
const selectedCredentials = srMatches.map(
  ({ matches, count }) => matches.slice(0, count)
).flat();


```

### Presentation creation (non verifiable)

To create a Presentation without Proof (for Proofs, see Verifiable Presentation below) you have to pass in the
Presentation Definition, selected Verifiable Credentials and an optional holder (DID). The result will be a Verifiable
Presentation, without proofs, so actually a Presentation. It also contains the presentation submission data that the
verifier can use.

It is left up to you to sign the Presentation and adding the proof and make it a truly Verifiable Presentation. There
are different libraries that allow you to do this. You can also use the callback integration mentioned in the next
chapter for this.

```typescript
import { pejs, Presentation } from '@sphereon/pe-js';

const pe = new pejs();

// Construct presentation from selected credentials
const presentation: Presentation = pe.presentationFrom(presentationDefinition, selectedCredentials, holderDID);
/** presentation object:
 *
 *   {
 *     "@context": [
 *       "https://www.w3.org/2018/credentials/v1",
 *       "https://identity.foundation/presentation-exchange/submission/v1"
 *     ],
 *     "type": [
 *       "VerifiablePresentation",
 *       "PresentationSubmission"
 *     ],
 *     presentation_submission: presentationSubmission,
 *     verifiableCredential: selectedCredentials
 *   };
 */
// Presentation would need to be signed and sent to verifier
```

### Verifiable Presentation with callback

**NOTE:** PE-JS does not support the creation of signatures by itself. That has to do with the fact that we didn't want
to rely on all kinds of signature suites and libraries. PE-JS has minimal dependencies currently, so that it can be used
in all kinds of scenarios.

How did we solve this? We have created a callback mechanism, allowing you to create a callback function that gets all
input allowing you to use your library of choice to create the signature. The callback needs to accept
a `PresentationSignCallBackParams` object.

The method `verifiablePresentationFrom` accepts the presentation definition and selected Verifiable Credentials as the
first two arguments, just like the `presentationFrom` method. Next it accepts the callback function as argument and
a `PresentationSignOptions` object as last argument. The sign callback params, allow you to control the signature
process. You will have access in the callback to these params as well.

Before calling your callback function a few things happen. First of all, just like the `presentationFrom` method, it
will evaluate whether the supplied credentials conform to the supplied presentation definition. Then it creates a
presentation, just like `presentationFrom`. This presentation is provided for your convenience and can be used in your
callback for simple use cases. In more elaborate cases, like for instance with more complex signature suites and/or
selective disclosure, you will probably not use the Presentation directly and make use of other arguments passed into
the callback, like the `EvaluationResults`, `PresentationSubmission` and `Partial<Proof>`.

The `proofOptions` and `signatureOptions`, allow you to populate proof values directly. in which case
the `Partial<Proof>` will have all fields filled to just add it as a proof to the presentation in your callback. This
does mean you would have to create the Presentation first and sign that, which means you probably have no use for the
callback. If you do not provide these values, the `Partial<Proof>`, will still be populated without the proofValue and
jws, based upon your options.

#### Presentation Sign Options

The options accepted by the `verifiablePresentationFrom` are:

````typescript
interface PresentationSignOptions {
  /**
   * The optional holder of the presentation
   */
  holder?: string;

  /**
   * Proof options
   */
  proofOptions?: ProofOptions;

  /**
   * The signature options
   */
  signatureOptions?: SignatureOptions;
}

interface ProofOptions {
  /**
   * The signature type. For instance RsaSignature2018
   */
  type?: ProofType | string;

  /**
   * Type supports selective disclosure?
   */
  typeSupportsSelectiveDisclosure?: boolean;

  /**
   * A challenge protecting against replay attacks
   */
  challenge?: string;

  /**
   * A domain protecting against replay attacks
   */
  domain?: string;

  /**
   * The purpose of this proof, for instance assertionMethod or authentication, see https://www.w3.org/TR/vc-data-model/#proofs-signatures-0
   */
  proofPurpose?: ProofPurpose | string;

  /**
   * The ISO8601 date-time string for creation. You can update the Proof value later in the callback. If not supplied the current date/time will be used
   */
  created?: string;

  /**
   * Similar to challenge. A nonce to protect against replay attacks, used in some ZKP proofs
   */
  nonce?: string;
}


interface SignatureOptions {
  /**
   * The private key
   */
  privateKey?: string;

  /**
   * Key encoding
   */
  keyEncoding?: KeyEncoding;

  /**
   * The verification method value
   */
  verificationMethod?: string;

  /**
   * Can be used if you want to provide the Json-ld proof value directly without relying on the callback function generating it
   */
  proofValue?: string; // One of any number of valid representations of proof values

  /**
   * Can be used if you want to provide the JSW proof value directly without relying on the callback function generating it
   */
  jws?: string; // JWS based proof
}
````

These options are available in your callback function by accessing the `options` field in
the `PresentationSignCallBackParams`.

#### Callback params object

The callback params gets supplied as the single argument to your callback function. It contains the `Presentation`, a
partial 'Proof' typically missing the proofValue/jws signature. It also contains the initially supplied Verifiable
Credentials and Presentation Definition as well as your supplied options.

If contains the Presentation Submission object, which is also found in the presentation. You can use this to create your
own Presentation object if you want. Lastly it contains the evaluation results, which includes the mappings and logs
about the evaluation.

You can either choose to use the `Presentation` and partial `Proof` together with the `options`, or in more elaborate
use cases opt to use the `PresentationSubmission`, `EvaluationResults` and the `options` for instance.

````typescript
export interface PresentationSignCallBackParams {

  /**
   * The originally supplied presentation sign options
   */
  options: PresentationSignOptions;

  /**
   * The presentation definition
   */
  presentationDefinition: PresentationDefinition;

  /**
   * The selected credentials to include in the eventual VP as determined by PE-JS and/or user
   */
  selectedCredentials: VerifiableCredential[];

  /**
   * The presentation object created from the definition and verifiable credentials.
   * Can be used directly or in more complex situations can be discarded by using the definition, credentials, proof options, submission and evaluation results
   */
  presentation: Presentation;

  /**
   * A partial proof value the callback can use to complete. If proofValue or JWS was supplied the proof could be complete already
   */
  proof: Partial<Proof>;

  /**
   * The presentation submission data, which can also be found in the presentation itself
   */
  presentationSubmission: PresentationSubmission;

  /**
   * The evaluation results, which the callback function could use to create a VP using the proof(s) using the supplied credentials
   */
  evaluationResults: EvaluationResults;
}
````

#### Simple example of the callback function

A simple use case using your library of choice for non-selective disclosure using an ed25519 key and signature.

````typescript
import {
  pejs,
  Proof,
  ProofPurpose,
  ProofType,
  VerifiablePresentation,
  PresentationSignOptions,
  KeyEncoding
} from '@sphereon/pe-js';

const pe = new pejs();

const params: PresentationSignOptions = {
  holder: 'did:example:1234....',
  proofOptions: {
    type: ProofType.Ed25519Signature2018,
    proofPurpose: ProofPurpose.assertionMethod,
  },
  signatureOptions: {
    verificationMethod: 'did:example:"1234......#key',
    keyEncoding: KeyEncoding.Base58,
    privateKey: 'base58 (key encoding type) key here',
  }
}

const vp = pe.verifiablePresentationFrom(presentationDefinition, selectedCredentials, simpleSignedProofCallback, params);

function simpleSignedProofCallback(callBackParams: PresentationSignCallBackParams): VerifiablePresentation {
  // Prereq is properly filled out `proofOptions` and `signatureOptions`, together with a `proofValue` or `jws` value.
  // And thus a generated signature
  const { presentation, proof, options } = callBackParams; // The created partial proof and presentation, as well as original supplied options
  const { signatureOptions, proofOptions } = options; // extract the orignially supploed signature and proof Options
  const privateKeyBase58 = signatureOptions.privateKey; // Please check keyEncoding from signatureOptions first!

  /**
   * Proof looks like this:
   * {
   *    type: 'Ed25519Signature2018',
   *    created: '2021-12-01T20:10:45.000Z',
   *    proofPurpose: 'assertionMethod',
   *    verificationMethod: 'did:example:"1234......#key',
   *    .....
   * }
   */

    // Just an example. Obviously your lib will have a different method signature
  const vp = myVPSignLibrary(presentation, { ...proof, privateKeyBase58 });

  return vp;
}


````

### Utilities

In addition to the core functionality above, the underlying validation methods are exposed as low-level helper
functions.

```typescript
import { pejs } from '@sphereon/pe-js';

const pe = new pejs();

const presentationDefinition = {
  ...
};

const { warnings: pdWarnings, errors: pdErrors } = pe.validateDefinition(presentationDefinition);

const presentationSubmission = {
  ...
};

const { warnings: psWarnings, errors: psErrors } = pe.validateSubmission(presentationSubmission);
```

## API

### Evaluate

```typescript
evaluate(presentationDefinition, verifiablePresentation)
```

##### Description

Evaluates whether a presentation submission meets the requested presentation definition Since this method will be used
both **before** and **after** creating a VerifiablePresentation, we accept both _signed_ and _unsigned_ version of a
presentation here.

#### Parameters

| name | type | description|
|------|------|------------|
| `presentationDefinition` | `PresentationDefinition` | the presentation definition that initiated the request from the verifier |
| `presentation` | `Presentation` | the Presentation object containing the required credentials and a `presentation_submission` object mapping back to the presentation definition |

#### Return value

If evaluation is successful, `value` will be a non-null `PresentationSubmission` mapping the submitted credentials to
the requested inputs.

```typescript
interface EvaluationResults {
  value?: PresentationSubmission;
  warnings?: string[];
  errors?: Error[];
  verifiableCredential: VerifiableCredential[];
}
```

### SelectFrom

```typescript
selectFrom(presentationDefinition, credentials, holderDids)
```

##### Description

Gathers the matching credentials that fit a given presentation definition

#### Parameters

| name | type | description|
|------|------|------------|
| `presentationDefinition` | `PresentationDefinition` | the presentation definition that initiated the request from the verifier |
| `credentials` | `VerifiableCredential[]` | the array of verifiable credentials to select from |
| `holderDids` | `string[]` | the holder's dids. this can be found in VerifiablePresentation's holder property note that a wallet can have many holderDids retrieved from different places|

#### Return value

- If the selection was successful or partially successful, the `matches` array will consist
  of `SubmissionRequirementMatch` object(s), representing the matching credentials for each `SubmissionRequirement` in
  the `presentationDefinition` input parameter.
- If the selection was not successful, the `errors` array will consist of `Checked` object(s), representing what has
  failed in your selection process.

```typescript
import { Status } from './ConstraintUtils';

interface SelectResults {
  errors?: Checked[];
  matches?: SubmissionRequirementMatch[];
  /**
   * This is the parameter that pejs library user should look into to determine what to do next
   * Status can have three values:
   *  1. INFO: everything is fine, you can call `presentationFrom` after this method
   *  2. WARN: method was called with more credentials than required.
   *       To enhance credential holder's privacy it is recommended to select credentials which are absolutely required.
   *  3. Error: the credentials you've sent didn't satisfy the requirement defined presentationDefinition object
   */
  areRequiredCredentialsPresent: Status;
  /**
   * All matched/selectable credentials
   */
  verifiableCredential?: VerifiableCredential[];
  /**
   * Following are indexes of the verifiableCredentials passed to the selectFrom method that have been selected.
   */
  vcIndexes?: number[];
  warnings?: Checked[];
}

interface SubmissionRequirementMatch {
  name?: string;
  rule: Rules;
  min?: number;
  count?: number;
  max?: number;
  vc_path: string[];
  from?: string[];
  from_nested?: SubmissionRequirementMatch[]; // VerifiableCredential Address
}
```

### PresentationFrom

```typescript
presentationFrom(presentationDefinition, selectedCredentials, holderDID)
```

##### Description

Creates the corresponding Presentation Submission object to be included in the Verifiable Presentation response, which
maps the submitted credentials to the requested inputs in the `presentationDefinition` input parameter.

#### Parameters

| name | type | description|
|------|------|------------|
| `presentationDefinition` | `PresentationDefinition` | the presentation definition that initiated the request from the verifier |
| `selectedCredentials` | `VerifiableCredential[]` | the array of verifiable credentials that meet the submission requirements in the presentation definition |
| `holderDid` | `string` | the holder's DID. This can be found in VerifiablePresentation's holder property note that a wallet can have many holderDIDs retrieved from different places|

#### Return value

If the selected credentials successfully match the submission requirements in the presentation definition, the return
value will be a non-null `PresentationSubmission`

```typescript
interface PresentationSubmission {
  id?: string;
  definition_id: string;
  descriptor_map: Descriptor[]
}
```

### Validation

```typescript
validateDefinition(objToValidate)
```

```typescript
validateSubmission(objToValidate)
```

#### Description

A validation utility function for `PresentationDefinition` and `PresentationSubmission` objects.

#### Parameters

| name | type | description|
|------|------|------------|
| `objToValidate` | <code>PresentationDefinition &#124; PresentationSubmission</code> | the presentation definition or presentation definition to be validated |

#### Return value

The `validate` method returns a validated results array `NonEmptyArray<Checked>` , with structure:

```typescript
interface Checked {
  tag: string;
  status: Status;
  message?: string;
}
```

status can have following values `'info' | 'warn' | 'error'`

## Workflow Diagram

![Flow diagram](https://www.plantuml.com/plantuml/proxy?cache=no&src=https://raw.githubusercontent.com/Sphereon-Opensource/pe-js/develop/docs/simple-scenario.puml)

## For PE-JS developers

This project has been created using:

* `yarn` version 1.22.5
* `node` version 12.22.1

### Install

   ```shell
   yarn install
   ```

### Build

   ```shell
   yarn build
   ```

### Test

The test command runs:

* `eslint`
* `prettier`
* `unit`

You can also run only a single section of these tests, using for example `yarn test:unit`.

   ```shell
   yarn test
   ```

### Utility scripts

There are several other utility scripts that help with development.

* `yarn fix` - runs `eslint --fix` as well as `prettier` to fix code style
* `yarn cov` - generates code coverage report

# Glossary

Term | Definition |
---- | ---------- |
Credential | A set of one or more claims made by an issuer. |
Verifiable Credential |  Is a tamper-evident credential that has authorship that can be cryptographically verified. Verifiable credentials can be used to build verifiable presentations, which can also be cryptographically verified. The claims in a credential can be about different subjects. |
Presentation Definition | Presentation Definitions are objects that articulate what proofs a Verifier requires. |
Holder | Holders are entities that have one or more verifiable credentials in their possession. Holders are also the entities that submit proofs to Verifiers to satisfy the requirements described in a Presentation Definition.
Holder's Did | Unique ID URI string and PKI metadata document format for describing the cryptographic keys and other fundamental PKI values linked to a unique, user-controlled, self-sovereign identifier in holder's wallet|
Verifier | Verifiers are entities that define what proofs they require from a Holder (via a Presentation Definition) in order to proceed with an interaction. |
Issuer | A role an entity can perform by asserting claims about one or more subjects, creating a verifiable credential from these claims, and transmitting the verifiable credential to a holder. |
Presentation | Data derived from one or more verifiable credentials, issued by one or more issuers |
Verifiable Presentation | Is a tamper-evident presentation encoded in such a way that authorship of the data can be trusted after a process of cryptographic verification.

## Further work:

1. Implementation of presentation-exchange v2
2. In the [DIF documentation](https://identity.foundation/presentation-exchange/#input-evaluation) some entries are
   addressing `nested credentials` and `nested paths` these are currently not fully support yet.

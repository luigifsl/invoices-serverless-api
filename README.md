# Invoices API

This project is a demo of an invoices API. 

## Description

It provides endpoints to manage invoices and clients. Invoices can be downloaded as PDF. Users must be authenticated to manage their invoices and clients.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Deploying](#deploying)
- [Running the tests](#running-the-tests)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
- [API](#api)
- [Features](#features)

## Getting Started

The project is ready to be deployed on the AWS and be used.

### Prerequisites

You must have the following before working with this project:

- Node.js (v18)
- Serverless Framework
- AWS CLI
- AWS Credentials set

### Installation

A step by step series of examples that tell you how to get a development environment running.

1. Clone the repo
```sh
git clone https://github.com/luigifsl/invoices-serverless-api.git
```

2. Install dependencies
```sh
npm install
```

Or use `yarn` if you prefer.

## Deploying

You can deploy this project with the following commands:
```sh
npm run deploy:dev
```

```sh
npm run deploy:test
```

Each command deploys to a different `stage`. Notice that those commands just
wrap the `serverless deploy` command.

The commands above wrap the following `serverless` commands:

```sh
serverless deploy --aws-profile dev --stage dev
```

```sh
serverless deploy --aws-profile dev --stage test
```

You can customize the `package.json` scripts to match your own `--aws-profile`
and `--stage` or just use the `serverless` commands with your own options.

Commands to destroy the resources were also set:

```sh
npm run remove:dev
```

```sh
npm run remove:dev
```

They also wrap `serverless remove` commands.

## Running the Tests

Unit and Integration tests were written.

### Unit Tests

Invoice and Client services have unit tests. You can with with:
```sh
npm run test:unit
```
AWS resources were mocked.

Although the unit tests are simple, they test different code flows for the services.

### Integration Tests

Integration tests require the app to be deployed, so you must provide an endpoint
to test the application.

1. Deploy your application as shown above

2. Navigate to `src/__tests__/integration/functions/helper.ts`

3. Make `BASE_URL` equals to your AWS endpoint. Example:
```ts
export const BASE_URL = 'https://my-endpoint.execute-api.my-region-1.amazonaws.com/my-stage'
```
4. Run the integration tests:
```sh
npm run test:integration
```

Your client and invoice integration tests should run and call the endpoint defined
by your `BASE_URL`.

## API

The project contains an openapi spec. It's possible to render the api with
Swagger UI and call your application's endpoint after the deploy.

1. Deploy your application

2. Copy your AWS endpoint and paste it in `openapi/api-spec/yml`:
```yml
servers:
  - url: 'https://my-endpoint.execute-api.my-region-1.amazonaws.com/my-stage'
```

3. Run swagger
```sh
npm run swagger
```

It'll open swagger ui.

4. Make api calls to the application

Remember you must signup, login, and authorize the API with your token.

## Features

### Project structure

The project code base is mainly located within the `src` folder. This folder is divided in:

- `__tests__` - containing unit and integration tests, along with helper code
- `functions` - containing code base and configuration for the lambda functions
- `libs` - containing shared code base between the lambdas
- `models` - containing the models used across the codebase
- `services` - containing the service used by the lambdas

```
.
├── src
│   ├── __tests__               # Unit and Integration test code
│   │   └── integration
│   │      └── functions
│   │          ├── client.test.integration.ts
│   │          ├── invoice.test.integration.ts
│   │          └── helper.ts
│   │   └── unit
│   │      └── services
│   │          ├── client.test.ts
│   │          └── invoice.test.ts
│   ├── functions               # Lambda configuration and source code folder
│   │   └── clients
│   │      ├── handler.ts      
│   │      └── index.ts       
│   │   └── invoices
│   │      ├── handler.ts    
│   │      └── index.ts     
│   │   └── users
│   │      ├── handler.ts  
│   │      └── index.ts   
│   │   
│   │
│   │── libs                    # Lambda shared code
│   │   └── apiGateway.ts       # API Gateway specific helpers
│   │   └── handlerResolver.ts  # Sharable library for resolving lambda handlers
│   │   └── lambda.ts           # Lambda middleware
│   │   └── pdf.ts              # Code to generate pdf and store to S3 bucket
│   │   
│   │
│   │── models                  # Models
│   │   └── cognito.ts          # Get cognito details like user pool id and client id
│   │   └── database.ts         # Get the dynamodb client
│   │   └── index.ts            # Types and Interfaces
│   │   
│   │
│   │── services                # Services code
│   │   └── client.ts          
│   │   └── invoice.ts         
│   │   └── index.ts            
│   │
│   │── utils                   # wkhtmltox zip for lambda layer
│   │
│   └── openapi                 # Contains the api spec yml file
│
├── README.ms
├── jest.integration.config.ts
├── jest.setup.ts            
├── jest.unit.config.ts     
├── package-lock.json      
├── package.json          
├── serverless.ts        
├── tsconfig.json       
└── tsconfig.paths.json 
```

### 3rd party libraries

- [json-schema-to-ts](https://github.com/ThomasAribart/json-schema-to-ts) - uses JSON-Schema definitions used by API Gateway for HTTP request validation to statically generate TypeScript types in your lambda's handler code base
- [middy](https://github.com/middyjs/middy) - middleware engine for Node.Js lambda. This template uses [http-json-body-parser](https://github.com/middyjs/middy/tree/master/packages/http-json-body-parser) to convert API Gateway `event.body` property, originally passed as a stringified JSON, to its corresponding parsed object
- [@serverless/typescript](https://github.com/serverless/typescript) - provides up-to-date TypeScript definitions for your `serverless.ts` service file
- [wkhtmltopdf](https://wkhtmltopdf.org/) - provides the binary for the lambda layer to generate pdf from html

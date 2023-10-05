import type { AWS } from '@serverless/typescript';

import { login, signup } from '@functions/users';
import { getClient, getAllClients, createClient, deleteClient, updateClient } from '@functions/clients';
import { createInvoice, deleteInvoice, getAllInvoices, getInvoice, snsMessageLogger, updateInvoice, generateInvoicePdf } from '@functions/invoices';

const serverlessConfiguration: AWS = {
  service: 'aws-serverless-typescript-api',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline', 'serverless-dynamodb'],
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    region: 'us-east-1',
    stage: 'dev',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      INVOICES_TABLE: 'InvoicesTable',
      CLIENTS_TABLE: 'ClientsTable',
      STACK_NAME: '${self:service}-${opt:stage, self:provider.stage}',
      TOPIC_INVOICE_STATUS_CHANGED: { 'Ref': 'MySNSTopic' },
      REGION: '${opt:region, self:provider.region}',
      INVOICES_BUCKET_NAME: '${self:service}-${opt:stage, self:provider.stage}-invoices-pdf',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:Query',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'cognito-idp:AdminInitiateAuth',
              'cognito-idp:AdminCreateUser',
              'cognito-idp:AdminSetUserPassword',
              'cloudformation:DescribeStacks',
              'sns:Publish',
              's3:PutObject',
              's3:GetObject',
            ],
            Resource: [
              'arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.INVOICES_TABLE}',
              'arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.INVOICES_TABLE}/*',
              'arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.CLIENTS_TABLE}',
              'arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.CLIENTS_TABLE}/*',
              'arn:aws:cognito-idp:${opt:region, self:provider.region}:*:userpool/*',
              'arn:aws:cloudformation:${opt:region, self:provider.region}:*:stack/${self:service}-${opt:stage, self:provider.stage}/*',
              'arn:aws:cognito-idp:${opt:region, self:provider.region}:*:userpool/*',
              { 'Ref': 'MySNSTopic' },
              'arn:aws:s3:::${self:provider.environment.INVOICES_BUCKET_NAME}/*',
            ],
          }
        ]
      }
    }
  },
  // import the function via paths
  functions: {
    getAllInvoices,
    createInvoice,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    login,
    signup,
    snsMessageLogger,
    getClient,
    getAllClients,
    createClient,
    deleteClient,
    updateClient,
    generateInvoicePdf
  },
  layers: {
    wkhtmltoxLayer: {
      name: 'wkhtmltox',
      description: 'wkhtmltopdf layer',
      package: {
        artifact: 'utils/wkhtmltox-0.12.6-4.amazonlinux2_lambda.zip',
      },
    },
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', '@aws-sdk/util-dynamodb'],
      target: 'node18',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    'serverless-dynamodb': {
      port: 8000,
      docker: false,
      inMemory: true,
      migrate: true,
      stages: ['dev', 'test'],
    },
  },
  resources: {
    Resources: {
      InvoicesTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:provider.environment.INVOICES_TABLE}',
          AttributeDefinitions: [
            { AttributeName: 'invoiceId', AttributeType: 'S' },
            { AttributeName: 'status', AttributeType: 'S' },
            { AttributeName: 'createdBy', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'invoiceId', KeyType: 'HASH' },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'status-index',
              KeySchema: [
                { AttributeName: 'status', KeyType: 'HASH' },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
              },
            },
            {
              IndexName: 'createdBy-index',
              KeySchema: [
                { AttributeName: 'createdBy', KeyType: 'HASH' },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
              },
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      },
      ClientsTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:provider.environment.CLIENTS_TABLE}',
          AttributeDefinitions: [
            { AttributeName: 'clientId', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'clientId', KeyType: 'HASH' },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      },
      UserPool: {
        Type: 'AWS::Cognito::UserPool',
        Properties: {
          UserPoolName: 'invoices-user-pool',
          Schema: [
            {
              Name: 'email',
              Required: true,
              Mutable: true,
            },
          ],
          Policies: {
            PasswordPolicy: {
              MinimumLength: 6,
            },
          },
          AutoVerifiedAttributes: ['email'],
        }
      },
      UserClient: {
        Type: 'AWS::Cognito::UserPoolClient',
        Properties: {
          ClientName: 'invoices-user-client',
          UserPoolId: { Ref: 'UserPool' },
          GenerateSecret: false,
          AccessTokenValidity: 5,
          IdTokenValidity: 5,
          ExplicitAuthFlows: ['ADMIN_NO_SRP_AUTH'],
        }
      },
      MySNSTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          DisplayName: 'MySNSTopic',
          TopicName: 'MySNSTopic',
        },
      },
      InvoicesBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: '${self:provider.environment.INVOICES_BUCKET_NAME}',
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                MaxAge: 3000,
              }
            ]
          }
        }
      },
    },
    Outputs: {
      ClientId: {
        Description: 'Cognito User Client ID',
        Value: { Ref: 'UserClient' },
        Export: {
          Name: 'CognitoClientId',
        },
      },
      UserPoolId: {
        Description: 'Cognito User Pool ID',
        Value: { Ref: 'UserPool' },
        Export: {
          Name: 'CognitoUserPoolId',
        },
      },
    },
  }
};

module.exports = serverlessConfiguration;

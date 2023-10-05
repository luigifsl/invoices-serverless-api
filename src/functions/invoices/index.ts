import { handlerPath } from '@libs/handler-resolver';
import { createInvoiceSchema, updateInvoiceSchema } from 'src/models';

const httpEventCommon = {
  cors: true,
  path: 'invoices',
  authorizer: {
    name: 'PrivateAuthorizer',
    type: 'COGNITO_USER_POOLS',
    arn: {
      'Fn::GetAtt': ['UserPool', 'Arn']
    },
    claims: ['email', 'sub']
  }
}

export const getAllInvoices = {
  handler: `${handlerPath(__dirname)}/handler.getAllInvoices`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'get',
      }
    }
  ]
}

export const createInvoice = {
  handler: `${handlerPath(__dirname)}/handler.createInvoice`,
  events: [
    {
      http: {
        method: 'post',
        ...httpEventCommon,
        request: {
          schemas: {
            'application/json': createInvoiceSchema
          }
        }
      }
    }
  ]
}

export const generateInvoicePdf = {
  handler: `${handlerPath(__dirname)}/handler.generateInvoicePdf`,
  layers: [
    {
      Ref: 'WkhtmltoxLayerLambdaLayer'
    }
  ],
  environment: {
    FONTCONFIG_PATH: '/opt/fonts',
  },
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'get',
        path: 'pdf/invoices/{id}',
      }
    }
  ]
}

export const getInvoice = {
  handler: `${handlerPath(__dirname)}/handler.getInvoice`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'get',
        path: 'invoices/{id}',
      }
    }
  ]
}

export const updateInvoice = {
  handler: `${handlerPath(__dirname)}/handler.updateInvoice`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'put',
        path: 'invoices/{id}',
        request: {
          schemas: {
            'application/json': updateInvoiceSchema
          }
        }
      }
    }
  ]
}

export const deleteInvoice = {
  handler: `${handlerPath(__dirname)}/handler.deleteInvoice`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'delete',
        path: 'invoices/{id}',
      }
    }
  ]
}

export const snsMessageLogger = {
  handler: `${handlerPath(__dirname)}/handler.snsMessageLogger`,
  events: [
    {
      sns: {
        arn: {
          Ref: 'MySNSTopic'
        },
        topicName: 'MySNSTopic',
      }
    }
  ]
}

import { handlerPath } from '@libs/handler-resolver';
import { createClientSchema, updateClientSchema } from 'src/models';

const httpEventCommon = {
  cors: true,
  path: 'clients',
  authorizer: {
    name: 'PrivateAuthorizer',
    type: 'COGNITO_USER_POOLS',
    arn: {
      'Fn::GetAtt': ['UserPool', 'Arn']
    },
    claims: ['email', 'sub']
  }
}

export const getAllClients = {
  handler: `${handlerPath(__dirname)}/handler.getAllClients`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'get',
      }
    }
  ]
}

export const createClient = {
  handler: `${handlerPath(__dirname)}/handler.createClient`,
  events: [
    {
      http: {
        method: 'post',
        ...httpEventCommon,
        request: {
          schemas: {
            'application/json': createClientSchema
          }
        }
      }
    }
  ]
}

export const getClient = {
  handler: `${handlerPath(__dirname)}/handler.getClient`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'get',
        path: 'clients/{id}',
      }
    }
  ]
}

export const updateClient = {
  handler: `${handlerPath(__dirname)}/handler.updateClient`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'put',
        path: 'clients/{id}',
        request: {
          schemas: {
            'application/json': updateClientSchema
          }
        }
      }
    }
  ]
}

export const deleteClient = {
  handler: `${handlerPath(__dirname)}/handler.deleteClient`,
  events: [
    {
      http: {
        ...httpEventCommon,
        method: 'delete',
        path: 'clients/{id}',
      }
    }
  ]
}

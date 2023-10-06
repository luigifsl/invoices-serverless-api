import { handlerPath } from '@libs/handler-resolver';
import { userSchema } from 'src/models';

export const signup = {
  handler: `${handlerPath(__dirname)}/handler.signup`,
  events: [
    {
      http: {
        method: 'post',
        path: 'users/signup',
        cors: true,
        request: {
          schemas: {
            'application/json': userSchema
          }
        }
      }
    }
  ]
}

export const login = {
  handler: `${handlerPath(__dirname)}/handler.login`,
  events: [
    {
      http: {
        method: 'post',
        path: 'users/login',
        cors: true,
        request: {
          schemas: {
            'application/json': userSchema
          }
        }
      }
    }
  ]
}

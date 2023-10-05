import { handlerPath } from '@libs/handler-resolver';

export const signup = {
  handler: `${handlerPath(__dirname)}/handler.signup`,
  events: [
    {
      http: {
        method: 'post',
        path: 'users/signup',
        cors: true,
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
      }
    }
  ]
}

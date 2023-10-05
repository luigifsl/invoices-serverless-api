import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from "@libs/lambda";
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import { User } from "src/models";
import { getCognitoDetails } from "src/models/cognito";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION })

export const signup = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { email, password } = event.body as unknown as User

  if (!email || !password) {
    return formatJSONResponse({
      status: 400,
      message: 'Email and password are required'
    })
  }

  const cognitoDetails = await getCognitoDetails()

  try {
    const adminCreateUserCommand = new AdminCreateUserCommand({
      UserPoolId: cognitoDetails.userPoolId,
      Username: email,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        },
      ],
      MessageAction: 'SUPPRESS'
    })

    const adminCreateUserResponse = await client.send(adminCreateUserCommand)

    if (adminCreateUserResponse.User == null) {
      return formatJSONResponse({
        status: 500,
        message: `User couldn't be created: ${email}`
      })
    }

    const adminSetUserPasswordCommand = new AdminSetUserPasswordCommand({
      Password: password,
      UserPoolId: cognitoDetails.userPoolId,
      Username: email,
      Permanent: true
    })

    // const adminSetUserPasswordResponse = await client.send(adminSetUserPasswordCommand)
    await client.send(adminSetUserPasswordCommand)

    return formatJSONResponse({
      status: 200,
      message: `User created: ${email}`
    })
  } catch (error) {
    console.log(error)
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

export const login = middyfy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { email, password } = event.body as unknown as User

  if (!email || !password || email.length === 0 || password.length < 6) {
    return formatJSONResponse({
      status: 400,
      message: 'Invalid input'
    })
  }

  try {
    const cognitoDetails = await getCognitoDetails()

    const command = new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: cognitoDetails.userPoolId,
      ClientId: cognitoDetails.userClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    })

    const response = await client.send(command)

    return formatJSONResponse({
      status: 200,
      message: `User authenticated: ${email}`,
      token: response.AuthenticationResult?.IdToken
    })
  } catch (error) {
    console.log(error)
    return formatJSONResponse({
      status: 500,
      message: error
    })
  }
})

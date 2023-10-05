import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const dynamoDBClient = (): DynamoDBClient => {
  if (process.env.IS_OFFLINE) {
    return new DynamoDBClient({
      region: process.env.REGION,
      endpoint: 'http://localhost:8000',
    })
  }

  return new DynamoDBClient({ region: process.env.REGION })
}

export default dynamoDBClient

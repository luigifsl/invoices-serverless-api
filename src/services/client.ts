
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand, UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Client, ClientFilter } from '../models'

export default class ClientService {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly tableName: string,
  ) { }

  async getAllClients({ filter }: { filter: ClientFilter }): Promise<Client[]> {
    const expressionAttributeValues: any = {};

    const filterExpressions: string[] = [];

    if (filter?.name) {
      filterExpressions.push('name = :name');
      expressionAttributeValues[':name'] = { S: filter.name };
    }

    if (filter?.email) {
      filterExpressions.push('email = :email');
      expressionAttributeValues[':email'] = { S: filter.email };
    }

    const filterExpression = filterExpressions.length > 0
      ? filterExpressions.join(' AND ')
      : undefined;

    const command = new QueryCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    try {
      const response = await this.dynamoClient.send(command);

      if (response.Items == null) {
        throw new Error('Error getting clients');
      }

      return response.Items as unknown[] as Client[];
    } catch (error) {
      throw error;
    }
  }

  async createClient(client: Client): Promise<Client> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(client),
    });

    try {
      await this.dynamoClient.send(command);

      return client;
    } catch (error) {
      throw error;
    }
  }

  async getClient(id: string): Promise<Client> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: {
        clientId: { S: id },
      },
    });

    try {
      const response = await this.dynamoClient.send(command);

      // if item does not exist
      if (!response.Item) {
        return null
      }

      const unmarshalled = unmarshall(response.Item) as unknown as Client;

      return unmarshalled
    } catch (error) {
      throw error;
    }
  }

  async updateClient({ id, client }: { id: string, client: Partial<Client> }): Promise<Client> {
    const expressionAttributeValues: any = {};
    const updateExpression: string[] = [];
    const expressionAttributeNames: any = {};

    if (client.name) {
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = { S: client.name };
      updateExpression.push('#name = :name');
    }

    if (client.email) {
      expressionAttributeValues[':email'] = { S: client.email };
      updateExpression.push('email = :email');
    }

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: {
        clientId: { S: id },
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    let response: UpdateItemCommandOutput
    try {
      response = await this.dynamoClient.send(command);
    } catch (error) {
      throw error;
    }

    const unmarshalled = unmarshall(response.Attributes) as unknown as Client;

    return unmarshalled
  }

  async deleteClient(id: string): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        clientId: { S: id },
      },
    });

    try {
      await this.dynamoClient.send(command);
    } catch (error) {
      throw error;
    }
  }
}

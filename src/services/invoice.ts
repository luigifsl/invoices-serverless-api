import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand, UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Invoice, InvoiceFilter } from '../models'

export default class InvoiceService {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly tableName: string,
  ) { }

  async getAllInvoices({ userId, filter }: { userId: string, filter: InvoiceFilter }): Promise<Invoice[]> {
    const expressionAttributeValues: any = {
      ':createdBy': { S: userId }
    };
    const expressionAttributeNames: any = {};

    const filterExpressions: string[] = [];

    if (filter?.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = { S: filter.status };
      expressionAttributeNames['#status'] = 'status';
    }

    if (filter?.clientId) {
      filterExpressions.push('clientId = :clientId');
      expressionAttributeValues[':clientId'] = { S: filter.clientId };
    }

    const filterExpression = filterExpressions.length > 0
      ? filterExpressions.join(' AND ')
      : undefined;

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'createdBy-index',
      KeyConditionExpression: 'createdBy = :createdBy',
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    });

    try {
      const response = await this.dynamoClient.send(command);

      if (response.Items == null) {
        throw new Error('Error getting invoices');
      }

      const unmarshalled: Invoice[] = response.Items.map(item => unmarshall(item) as unknown as Invoice);

      return unmarshalled;
    } catch (error) {
      throw error;
    }
  }

  async createInvoice(invoice: Invoice): Promise<Invoice> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(invoice),
    });

    try {
      await this.dynamoClient.send(command);

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  async getInvoice(id: string, userId: string): Promise<Invoice> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: {
        invoiceId: { S: id },
      },
    });

    try {
      const response = await this.dynamoClient.send(command);

      // if item does not exist or does not belong to user return null
      if (!response.Item || response.Item.createdBy.S !== userId) {
        return null
      }

      const unmarshalled = unmarshall(response.Item) as unknown as Invoice;

      return unmarshalled
    } catch (error) {
      throw error;
    }
  }

  async updateInvoice({ id, userId, invoice }: { id: string, userId: string, invoice: Partial<Invoice> }): Promise<Invoice> {
    const expressionAttributeValues: any = {
      ':createdBy': { S: userId },
    };

    let shouldNotifyStatusChanged = false;
    const updateExpression: string[] = [];

    const expressionAttributeNames: any = {};

    if (invoice.status) {
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = { S: invoice.status };
      updateExpression.push('#status = :status');
      shouldNotifyStatusChanged = true;
    }

    if (invoice.invoiceNumber) {
      expressionAttributeValues[':invoiceNumber'] = { S: invoice.invoiceNumber };
      updateExpression.push('invoiceNumber = :invoiceNumber');
    }

    if (invoice.dueDate) {
      expressionAttributeValues[':dueDate'] = { S: invoice.dueDate };
      updateExpression.push('dueDate = :dueDate');
    }

    if (invoice.items) {
      expressionAttributeValues[':dueDate'] = { S: invoice.dueDate };
      updateExpression.push('dueDate = :dueDate');
    }


    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: {
        invoiceId: { S: id },
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'createdBy = :createdBy',
    });

    let response: UpdateItemCommandOutput
    try {
      response = await this.dynamoClient.send(command);
    } catch (error) {
      throw error;
    }

    if (shouldNotifyStatusChanged) {
      const snsClient = new SNSClient({ region: process.env.REGION });
      const topicArn = process.env.TOPIC_INVOICE_STATUS_CHANGED;

      const snsCommand = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({
          invoiceId: id,
          status: invoice.status,
        })
      })

      try {
        await snsClient.send(snsCommand);
      } catch (error) {
        console.log('Error publishing to SNS: ', error);
      }
    }

    const unmarshalled = unmarshall(response.Attributes) as unknown as Invoice;

    return unmarshalled
  }

  async deleteInvoice({ id, userId }: { id: string, userId: string }): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        invoiceId: { S: id },
      },
      ExpressionAttributeValues: {
        ':createdBy': { S: userId },
      },
      ConditionExpression: 'createdBy = :createdBy',
    });

    try {
      await this.dynamoClient.send(command);
    } catch (error) {
      throw error;
    }
  }
}

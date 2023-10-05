import { AttributeValue, DynamoDBClient, GetItemOutput, QueryCommand, UpdateItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import InvoiceService from '../../../services/invoice';
import { Invoice, InvoiceFilter } from '../../../models';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);

describe('InvoiceService', () => {
  afterEach(() => {
    dynamoMock.reset();
    snsMock.reset();
  });

  describe('getAllInvoices', () => {
    it('should fetch all invoices for the given user ID without any filter', async () => {
      const mockItems: Invoice[] = [
        {
          invoiceId: '1',
          invoiceNumber: 'INV-001',
          dueDate: '2023-10-15T10:11:12Z',
          status: 'Paid',
          clientId: 'client1',
          createdAt: '2023-10-12T10:10:12Z',
          createdBy: 'user1',
          items: [
            {
              description: 'Item 1',
              quantity: 1,
              price: 100,
            },
            {
              description: 'Item 2',
              quantity: 3,
              price: 10,
            }
          ]
        },
        {
          invoiceId: '2',
          createdBy: 'user1',
          clientId: 'client2',
          dueDate: '2023-10-15T10:11:12Z',
          status: 'Paid',
          createdAt: '2023-10-12T10:10:12Z',
          invoiceNumber: 'INV-002',
          items: [
            {
              description: 'Item 1',
              quantity: 1,
              price: 100,
            },
            {
              description: 'Item 2',
              quantity: 3,
              price: 10,
            }
          ]
        }
      ];
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: mockItems });

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      const invoices = await invoiceService.getAllInvoices({ userId: 'user1', filter: {} });

      expect(invoices).toEqual(mockItems);
      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    it('should fetch invoices with the given status', async () => {
      const mockItems: Invoice[] = [
        {
          invoiceId: '1',
          invoiceNumber: 'INV-001',
          dueDate: '2023-10-15T10:11:12Z',
          status: 'Paid',
          clientId: 'client1',
          createdAt: '2023-10-12T10:10:12Z',
          createdBy: 'user1',
          items: [
            {
              description: 'Item 1',
              quantity: 1,
              price: 100,
            },
            {
              description: 'Item 2',
              quantity: 3,
              price: 10,
            }
          ]
        },
        {
          invoiceId: '2',
          createdBy: 'user1',
          clientId: 'client2',
          dueDate: '2023-10-15T10:11:12Z',
          status: 'Paid',
          createdAt: '2023-10-12T10:10:12Z',
          invoiceNumber: 'INV-002',
          items: [
            {
              description: 'Item 1',
              quantity: 1,
              price: 100,
            },
            {
              description: 'Item 2',
              quantity: 3,
              price: 10,
            }
          ]
        }
      ];
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: mockItems });

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      const filter: InvoiceFilter = { status: 'Paid' };
      const invoices = await invoiceService.getAllInvoices({ userId: 'user1', filter });

      expect(invoices).toEqual(mockItems);
      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    it('should fetch invoices for the given client ID', async () => {
      const mockItems = { invoiceId: '1', createdBy: 'user1' };
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: mockItems });

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      const filter: InvoiceFilter = { clientId: 'client1' };
      const invoices = await invoiceService.getAllInvoices({ userId: 'user1', filter });

      expect(invoices).toEqual(mockItems);
      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    it('should throw an error when no invoices are found', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: null });

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      await expect(invoiceService.getAllInvoices({ userId: 'user1', filter: {} })).rejects.toThrow('Error getting invoices');
    });

    it('should handle errors from DynamoDB', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('DynamoDB error'));

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      await expect(invoiceService.getAllInvoices({ userId: 'user1', filter: {} })).rejects.toThrow('DynamoDB error');
    });
  })
  describe('createInvoice', () => {
    it('should create an invoice', async () => {
      const invoice: Invoice = {
        invoiceId: '1',
        createdBy: 'user1',
        clientId: 'client1',
        dueDate: '2023-10-15T10:11:12Z',
        status: 'Paid',
        createdAt: '2023-10-12T10:10:12Z',
        invoiceNumber: 'INV-001',
        items: [
          {
            description: 'Item 1',
            quantity: 1,
            price: 100,
          },
          {
            description: 'Item 2',
            quantity: 3,
            price: 10,
          }
        ]
      };

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({} as any);

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      const result = await invoiceService.createInvoice(invoice);

      expect(result).toEqual(invoice);
    })
    it('should throw an error when invoice creation fails', async () => {
      const invoice: Invoice = {
        invoiceId: '1',
        createdBy: 'user1',
        clientId: 'client1',
        dueDate: '2023-10-15T10:11:12Z',
        status: 'Paid',
        createdAt: '2023-10-12T10:10:12Z',
        invoiceNumber: 'INV-001',
        items: [
          {
            description: 'Item 1',
            quantity: 1,
            price: 100,
          },
          {
            description: 'Item 2',
            quantity: 3,
            price: 10,
          }
        ]
      }

      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('DynamoDB error'));

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');
      await expect(invoiceService.createInvoice(invoice)).rejects.toThrow('DynamoDB error');
    })
  })
  describe('getInvoice', () => {
    it('should get an invoice', async () => {
      const invoice: Record<string, AttributeValue> = {
        invoiceId: { S: '1' },
        createdBy: { S: 'user1' },
        clientId: { S: 'client1' },
        dueDate: { S: '2023-10-15T10:11:12Z' },
        status: { S: 'Paid' },
        createdAt: { S: '2023-10-12T10:10:12Z' },
        invoiceNumber: { S: 'INV-001' },
      }

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Item: invoice } as Pick<GetItemOutput, 'Item'>);

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      const result = await invoiceService.getInvoice('1', 'user1');

      expect(result).toEqual(unmarshall(invoice) as unknown as Invoice);
    })
    it('should return null when invoice is not found', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Item: null } as any);

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      const result = await invoiceService.getInvoice('1', 'user1')

      expect(result).toBeNull();
    })
    it('should throw an error when DynamoDB is not working', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('DynamoDB error'));

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');
      await expect(invoiceService.getInvoice('1', 'user1')).rejects.toThrow('DynamoDB error');
    })
  })
  describe('updateInvoice', () => {
    it('should update an invoice successfully', async () => {
      const updateResponse: UpdateItemCommandOutput = {
        Attributes: {
          invoiceId: { S: 'test-id' },
          invoiceNumber: { S: 'test-id' },
          dueDate: { S: '2021-10-15T10:11:12Z' },
          status: { S: 'Paid' },
          clientId: { S: 'test-client' },
          createdBy: { S: 'test-user' },
          createdAt: { S: '2021-10-12T10:10:12Z' },
        },
        $metadata: { /* metadata */ }
      };

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue(updateResponse);

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      // lets just update invoiceNumber and dueDate
      const updatedInvoice = await invoiceService.updateInvoice({
        id: 'test-id',
        userId: 'test-user',
        invoice: {
          invoiceNumber: 'test-id',
          dueDate: '2021-10-15T10:11:12Z',
        }
      });

      expect(updatedInvoice).toEqual(unmarshall(updateResponse.Attributes) as unknown as Invoice);
    });

    it('should throw error when update fails', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('Update failed'));

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      await expect(invoiceService.updateInvoice({
        id: 'test-id',
        userId: 'test-user',
        invoice: {
          invoiceNumber: 'test-id',
          dueDate: '2021-10-15T10:11:12Z',
        }
      })).rejects.toThrow('Update failed');
    });

    it('should send an SNS notification if invoice status is changed', async () => {
      const updateResponse: UpdateItemCommandOutput = {
        Attributes: {
          status: { S: 'Paid' },
        },
        $metadata: { /* metadata */ }
      };

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue(updateResponse);
      SNSClient.prototype.send = jest.fn().mockResolvedValue({});

      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      // update status to trigger the notification
      await invoiceService.updateInvoice({
        id: 'test-id',
        userId: 'test-user',
        invoice: {
          dueDate: '2021-10-15T10:11:12Z',
          status: 'Paid',
        }
      });

      const snsCommand = {
        input: {
          Message: JSON.stringify({
            invoiceId: 'test-id',
            status: 'Paid'
          }),
          TopicArn: process.env.TOPIC_INVOICE_STATUS_CHANGED,
        },
      };

      expect(SNSClient.prototype.send).toHaveBeenCalledWith(
        expect.objectContaining(snsCommand)
      );
    });
  });
  describe('deleteInvoice', () => {
    it('should delete an invoice successfully', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({});
      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      await invoiceService.deleteInvoice({ id: 'test-id', userId: 'test-user' });

      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'Invoices',
            Key: {
              invoiceId: { S: 'test-id' },
            },
            ConditionExpression: 'createdBy = :createdBy',
            ExpressionAttributeValues: {
              ':createdBy': { S: 'test-user' },
            },
          }
        })
      );
    })
    it('should throw an error when invoice is not found', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('Invoice not found'));
      const invoiceService = new InvoiceService(new DynamoDBClient({}), 'Invoices');

      await expect(invoiceService.deleteInvoice({ id: 'test-id', userId: 'test-user' })).rejects.toThrow('Invoice not found');
    })
  })
});



import { AttributeValue, DynamoDBClient, GetItemOutput, QueryCommand, UpdateItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import ClientService from '../../../services/client';
import { Client, ClientFilter } from '../../../models';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);

describe('ClientService', () => {
  afterEach(() => {
    dynamoMock.reset();
    snsMock.reset();
  });

  describe('getAllClients', () => {
    it('should fetch all clients', async () => {
      const mockItems: Client[] = [
        {
          clientId: '1',
          name: 'client1',
          email: 'client1@mail.com',
          phoneNumber: '1234567899',
          address: 'client1 address',
        },
        {
          clientId: '2',
          name: 'client2',
          email: 'client2@mail.com',
          phoneNumber: '1234567890',
          address: 'client2 address',
        }
      ];
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: mockItems });

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      const clients = await clientService.getAllClients({ filter: {} });

      expect(clients).toEqual(mockItems);
      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    // Test for fetching clients with status filter
    it('should fetch clients with the given name', async () => {
      const mockItems: Client[] = [
        {
          clientId: '1',
          name: 'client1',
          email: 'client1@mail.com',
          phoneNumber: '1234567899',
          address: 'client1 address',
        },
      ];
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: mockItems });

      // Creating an instance of ClientService
      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      const filter: ClientFilter = { name: 'client1' };
      const clients = await clientService.getAllClients({ filter });

      expect(clients).toEqual(mockItems);
      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    it('should fetch clients for the given email', async () => {
      const mockItems: Client[] = [
        {
          clientId: '1',
          name: 'client1',
          email: 'client1@mail.com',
          phoneNumber: '1234567899',
          address: 'client1 address',
        },
      ];
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: mockItems });

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      const filter: ClientFilter = { email: 'client1@mail.com' };
      const clients = await clientService.getAllClients({ filter });

      expect(clients).toEqual(mockItems);
      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    it('should throw an error when no clients are found', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Items: null });

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      await expect(clientService.getAllClients({ filter: {} })).rejects.toThrow('Error getting clients');
    });

    it('should handle errors from DynamoDB', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('DynamoDB error'));

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      await expect(clientService.getAllClients({ filter: {} })).rejects.toThrow('DynamoDB error');
    });
  })
  describe('createClient', () => {
    it('should create an client', async () => {
      const client: Client = {
        clientId: '1',
        name: 'client1',
        email: 'client1@mail.com',
        phoneNumber: '1234567899',
        address: 'client1 address',
      };

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({} as any);

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      const result = await clientService.createClient(client);

      expect(result).toEqual(client);
    })
    it('should throw an error when client creation fails', async () => {
      const client = {
        clientId: '1',
        name: 'client1',
        email: 'client1@mail.com',
        phoneNumber: '1234567899',
        address: 'client1 address',
      }

      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('DynamoDB error'));

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');
      await expect(clientService.createClient(client)).rejects.toThrow('DynamoDB error');
    })
  })
  describe('getClient', () => {
    it('should get an client', async () => {
      const client: Record<string, AttributeValue> = {
        clientId: { S: '1' },
        name: { S: 'client1' },
        email: { S: 'client1@mail.com' },
        phoneNumber: { S: '1234567899' },
        address: { S: 'client1 address' },
      }

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Item: client } as Pick<GetItemOutput, 'Item'>);

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      const result = await clientService.getClient('1');

      expect(result).toEqual(unmarshall(client) as unknown as Client);
    })
    it('should return null when client is not found', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({ Item: null } as any);

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      const result = await clientService.getClient('1')

      expect(result).toBeNull();
    })
    it('should throw an error when DynamoDB is not working', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('DynamoDB error'));

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');
      await expect(clientService.getClient('1')).rejects.toThrow('DynamoDB error');
    })
  })
  describe('updateClient', () => {
    it('should update an client successfully', async () => {
      const updateResponse: UpdateItemCommandOutput = {
        Attributes: {
          clientId: { S: '1' },
          name: { S: 'client1' },
          email: { S: 'client1@mail.com' },
          phoneNumber: { S: '1234567899' },
          address: { S: 'client1 address' },
        },
        $metadata: { /* metadata */ }
      };

      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue(updateResponse);

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      // lets just update clientNumber and dueDate
      const updatedClient = await clientService.updateClient({
        id: 'test-id',
        client: {
          email: 'new@mail.com',
          name: 'new-name',
        }
      });

      expect(updatedClient).toEqual(unmarshall(updateResponse.Attributes) as unknown as Client);
    });

    it('should throw error when update fails', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('Update failed'));

      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      await expect(clientService.updateClient({
        id: 'test-id',
        client: {
          email: 'new@mail.com',
          name: 'new-name',
        }
      })).rejects.toThrow('Update failed');
    });
  });
  describe('deleteClient', () => {
    it('should delete an client successfully', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockResolvedValue({});
      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      await clientService.deleteClient('test-id');

      expect(DynamoDBClient.prototype.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'Clients',
            Key: {
              clientId: { S: 'test-id' },
            },
          }
        })
      );
    })
    it('should throw an error when client is not found', async () => {
      DynamoDBClient.prototype.send = jest.fn().mockRejectedValue(new Error('Client not found'));
      const clientService = new ClientService(new DynamoDBClient({}), 'Clients');

      await expect(clientService.deleteClient('test-id')).rejects.toThrow('Client not found');
    })
  })
});


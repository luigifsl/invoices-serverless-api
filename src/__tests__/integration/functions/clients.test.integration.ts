import axios from 'axios';
import { Client, ClientFilter } from '../../../models';
import { authenticateUser, BASE_URL } from './helper';

const CLIENTS_URL = `${BASE_URL}/clients`;

describe('Clients Integration Test', () => {
  let token: string;
  const testClient: Partial<Client> = {
    name: 'Test Client',
    email: 'client@mail.com',
    phoneNumber: '123456789',
    address: '123 Test St',
  };

  beforeAll(async () => {
    token = await authenticateUser();
  });

  describe('GetAllClients', () => {
    beforeAll(async () => {
      // create a couple of clients to be retrieved
      try {
        await axios.post(CLIENTS_URL, {
          name: 'Test Client 1',
          email: 'client1@mail.com',
          phoneNumber: '123456789',
          address: '123 Test St',
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
          await axios.post(CLIENTS_URL, {
            name: 'Test Client 2',
            email: 'client2@mail.com',
            phoneNumber: '123456788',
            address: '123 Foo St',
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          await axios.post(CLIENTS_URL, {
            name: 'Test Client 3',
            email: 'client3@mail.com',
            phoneNumber: '123456778',
            address: '123 Bar St',
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
      } catch (error) {
        throw new Error('Failed to create clients');
      }
    });

    it('should get a list of clients', async () => {
      const response = await axios.get(`${CLIENTS_URL}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      // this test is flaky, we must clean up the database after each test
      // a solution would be to use transactions and rollback after each test
      // to keep the database clean
      // but for the sake of this demo, let's always expect length greater than 3 (since we created 3 clients, but db may have more...)
      expect(response.data.clients.length).toBeGreaterThanOrEqual(3);
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.get(`${CLIENTS_URL}`);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('CreateClient', () => {
    it('should create a client', async () => {
      const response = await axios.post(CLIENTS_URL, testClient, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.client).toBeDefined();

      expect(response.data.client).toEqual(expect.objectContaining(testClient));
    });

    it('should fail to create a client with missing fields', async () => {
      try {
        await axios.post(CLIENTS_URL, { name: 'Test Client' }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Invalid request body');
      }
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.post(CLIENTS_URL, testClient);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('UpdateClient', () => {
    let clientId: string;

    beforeAll(async () => {
      // create a client to be updated
      try {
        const response = await axios.post(CLIENTS_URL, testClient, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        clientId = response.data.client.clientId;
      } catch (error) {
        throw new Error('Failed to update client');
      }
    });

    it('should update a client', async () => {
      const fieldsToUpdate: ClientFilter = {
        name: 'New Name',
        email: 'new@mail.com',
      }

      const updatedClient = {
        ...testClient,
        ...fieldsToUpdate,
      };

      const response = await axios.put(`${CLIENTS_URL}/${clientId}`, fieldsToUpdate, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.client).toBeDefined();
      expect(response.data.client).toEqual(expect.objectContaining(updatedClient));
    });

    it('should fail to update a client when sending non updatable fields', async () => {
      try {
        await axios.put(`${CLIENTS_URL}/${clientId}`, { phoneNumber: '999999999' }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Invalid request body');
      }
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.put(`${CLIENTS_URL}/${clientId}`, testClient);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });


  describe('GetClient', () => {
    let clientId: string;

    beforeAll(async () => {
      // create a client to be retrieved
      try {
        const response = await axios.post(CLIENTS_URL, testClient, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        clientId = response.data.client.clientId;
      } catch (error) {
        throw new Error('Failed to get client');
      }
    });

    it('should get an client', async () => {
      const response = await axios.get(`${CLIENTS_URL}/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.client).toBeDefined();
      expect(response.data.client).toEqual(expect.objectContaining({ ...testClient, clientId }));
    });

    it('should fail if client does not exist ', async () => {
      const response = await axios.get(`${CLIENTS_URL}/not-existing-client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.status).toBe(404);
      expect(response.data.message).toBe('Client not found');
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.get(`${CLIENTS_URL}/${clientId}`);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('DeleteClient', () => {
    let clientId: string;

    beforeAll(async () => {
      // create an client to be deleted
      try {
        const response = await axios.post(CLIENTS_URL, testClient, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        clientId = response.data.client.clientId;
      } catch (error) {
        throw new Error('Failed to delete client');
      }
    });

    it('should delete an client', async () => {
      const response = await axios.delete(`${CLIENTS_URL}/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBeDefined();
      expect(response.data.message).toBe('Client deleted');
    });

    it('should fail if client does not exist ', async () => {
      const response = await axios.delete(`${CLIENTS_URL}/not-existing-client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.status).toBe(404);
      expect(response.data.message).toBe('Client not found');
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.delete(`${CLIENTS_URL}/${clientId}`);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });
})


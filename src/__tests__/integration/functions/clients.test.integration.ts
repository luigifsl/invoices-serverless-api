import axios from 'axios';
import { Client, ClientFilter } from '../../../models';

const BASE_URL = 'https://<your-endpoint>/test'

const CLIENTS_URL = `${BASE_URL}/clients`;
const SIGNUP_URL = `${BASE_URL}/users/signup`;
const LOGIN_URL = `${BASE_URL}/users/login`;

const user = {
  email: 'test@test.com',
  password: 'test123',
}

const signUp = async (email: string, password: string) => {
  const response = await axios.post(SIGNUP_URL, { email, password });
  return response.data;
};


const login = async (email: string, password: string) => {
  const response = await axios.post(LOGIN_URL, { email, password });
  return response.data;
};

const authenticateUser = async () => {
  let responseLogin = await login(user.email, user.password);

  if (responseLogin.status === 500 && responseLogin.message.name === 'UserNotFoundException') {
    const responseSignup = await signUp(user.email, user.password);

    if (responseSignup.status !== 200 && responseSignup.message !== `User created: ${user.email}`) {
      throw new Error('Signup failed');
    }

    responseLogin = await login(user.email, user.password);

    if (responseLogin.status !== 200) {
      throw new Error('Login failed');
    }
  }

  return responseLogin.token;
}


describe('Clients Integration Test', () => {
  let token: string;
  const testClient: Partial<Client> = {
    name: 'Test Client',
    email: 'client@mail.com',
    phoneNumber: '123456789',
    address: '123 Test St',
  };

  beforeEach(async () => {
    token = await authenticateUser();
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


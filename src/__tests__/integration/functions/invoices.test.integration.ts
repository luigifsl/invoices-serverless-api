import axios from 'axios';

const BASE_URL = 'https://<your-endpoint>/test'

const INVOICES_URL = `${BASE_URL}/invoices`;
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


describe('Invoices Integration Test', () => {
  let token: string;
  const testInvoice = {
    invoiceNumber: 'INV123',
    dueDate: '2023-10-10T00:00:00.000Z',
    clientId: 'CLIENT123',
    status: 'Pending',
  };

  beforeEach(async () => {
    token = await authenticateUser();
  });

  describe('CreateInvoice', () => {
    it('should create an invoice', async () => {
      const response = await axios.post(INVOICES_URL, testInvoice, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.invoice).toBeDefined();

      expect(response.data.invoice).toEqual(expect.objectContaining(testInvoice));
    });

    it('should fail to create an invoice with missing fields', async () => {
      try {
        await axios.post(INVOICES_URL, { dueDate: '2023-10-10' }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Invalid request body');
      }

    });

    it('should fail to create an invoice with invalid date', async () => {
      try {
        await axios.post(INVOICES_URL, { ...testInvoice, dueDate: 'invalid-date' }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Due date must be a date');
      }
    });

    it('should fail for unauthenticated requests if authentication is required', async () => {
      try {
        await axios.post(INVOICES_URL, testInvoice);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('UpdateInvoice', () => {
    let invoiceId: string;

    beforeAll(async () => {
      // create an invoice to be updated
      try {
        const response = await axios.post(INVOICES_URL, testInvoice, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        invoiceId = response.data.invoice.invoiceId;
      } catch (error) {
        throw new Error('Failed to update invoice');
      }
    });

    it('should update an invoice', async () => {
      const fieldsToUpdate = {
        invoiceNumber: 'INV456',
        dueDate: '2023-10-11T00:00:00.000Z',
        status: 'Paid',
      }

      const updatedInvoice = {
        ...testInvoice,
        ...fieldsToUpdate,
      };

      const response = await axios.put(`${INVOICES_URL}/${invoiceId}`, fieldsToUpdate, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.invoice).toBeDefined();
      expect(response.data.invoice).toEqual(expect.objectContaining(updatedInvoice));
    });

    it('should fail to update an invoice when sending non updatable fields', async () => {
      try {
        await axios.put(`${INVOICES_URL}/${invoiceId}`, { createdBy: 'will-fail' }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Invalid request body');
      }
    });

    it('should fail to update an invoice with invalid date', async () => {
      const fieldsToUpdate = {
        invoiceNumber: 'INV456',
        dueDate: 'invalid-date',
        status: 'Paid',
      }
      try {
        await axios.put(`${INVOICES_URL}/${invoiceId}`, fieldsToUpdate, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        expect(error.response.data.status).toBe(400);
        expect(error.response.data.message).toBe('Due date must be a date');
      }
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.put(`${INVOICES_URL}/${invoiceId}`, testInvoice);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });


  describe('GetInvoice', () => {
    let invoiceId: string;

    beforeAll(async () => {
      // create an invoice to be retrieved
      try {
        const response = await axios.post(INVOICES_URL, testInvoice, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        invoiceId = response.data.invoice.invoiceId;
      } catch (error) {
        throw new Error('Failed to get invoice');
      }
    });

    it('should get an invoice', async () => {
      const response = await axios.get(`${INVOICES_URL}/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.invoice).toBeDefined();
      expect(response.data.invoice).toEqual(expect.objectContaining({ ...testInvoice, invoiceId }));
    });

    it('should fail when trying to see invoice from another user', async () => {
      await signUp('secondUser@email.com', 'test123');
      const responseLogin = await login('secondUser@email.com', 'test123');
      const newToken = responseLogin.token;

      // make new secondUser create an invoice
      const secondUserInvoice = await axios.post(INVOICES_URL, testInvoice, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      })

      const secondUserInvoiceId = secondUserInvoice.data.invoice.invoiceId;

      // try to get the secondUser's invoice with the first user token
      const response = await axios.get(`${INVOICES_URL}/${secondUserInvoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.status).toBe(404);
      expect(response.data.message).toBe('Invoice not found');
    });

    it('should fail if invoice does not exist ', async () => {
      const response = await axios.get(`${INVOICES_URL}/not-existing-invoice`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.status).toBe(404);
      expect(response.data.message).toBe('Invoice not found');
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.get(`${INVOICES_URL}/${invoiceId}`);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('DeleteInvoice', () => {
    let invoiceId: string;

    beforeAll(async () => {
      // create an invoice to be deleted
      try {
        const response = await axios.post(INVOICES_URL, testInvoice, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        invoiceId = response.data.invoice.invoiceId;
      } catch (error) {
        throw new Error('Failed to delete invoice');
      }
    });

    it('should delete an invoice', async () => {
      const response = await axios.delete(`${INVOICES_URL}/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBeDefined();
      expect(response.data.message).toBe('Invoice deleted');
    });

    it('should fail when trying to delete invoice from another user', async () => {
      await signUp('secondUser@email.com', 'test123');
      const responseLogin = await login('secondUser@email.com', 'test123');
      const newToken = responseLogin.token;

      // make new secondUser create an invoice
      const secondUserInvoice = await axios.post(INVOICES_URL, testInvoice, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      })

      const secondUserInvoiceId = secondUserInvoice.data.invoice.invoiceId;

      // try to get the secondUser's invoice with the first user token
      let response = await axios.delete(`${INVOICES_URL}/${secondUserInvoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.status).toBe(404);
      expect(response.data.message).toBe('Invoice not found');

      // delete the secondUser's invoice
      response = await axios.delete(`${INVOICES_URL}/${secondUserInvoiceId}`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBeDefined();
      expect(response.data.message).toBe('Invoice deleted');
    });

    it('should fail if invoice does not exist ', async () => {
      const response = await axios.delete(`${INVOICES_URL}/not-existing-invoice`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.status).toBe(404);
      expect(response.data.message).toBe('Invoice not found');
    });

    it('should fail for unauthenticated requests', async () => {
      try {
        await axios.delete(`${INVOICES_URL}/${invoiceId}`);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });
})


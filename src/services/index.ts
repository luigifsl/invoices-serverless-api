import dynamoDBClient from '../models/database';
import ClientService from './client';
import InvoiceService from './invoice';

const client = dynamoDBClient();

export const invoiceService = new InvoiceService(client, process.env.INVOICES_TABLE);

export const clientService = new ClientService(client, process.env.CLIENTS_TABLE);


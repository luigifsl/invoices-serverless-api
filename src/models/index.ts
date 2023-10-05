export interface Client {
  clientId: string;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  createdAt: string;
  deletedAt?: string;
}

export interface InvoiceItem {
  description: string
  price: number
  quantity: number
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  status: string;
  clientId: string;
  createdBy: string;
  createdAt: string;
  items: InvoiceItem[]
}

export interface InvoiceWithClientInfo extends Invoice {
  client: Client;
}

export interface User {
  email: string;
  password: string;
}

export interface InvoiceFilter {
  status?: string;
  clientId?: string;
}

export interface ClientFilter {
  name?: string;
  email?: string;
}

export interface SNSEvent {
  Records: SNSRecord[];
}

interface SNSRecord {
  EventVersion: string;
  EventSubscriptionArn: string;
  EventSource: string;
  Sns: SNSMessage;
}

interface SNSMessage {
  SignatureVersion: string;
  Timestamp: string;
  Signature: string;
  SigningCertUrl: string;
  MessageId: string;
  Message: string;
  MessageAttributes: { invoiceId: string, status: string };
  Type: string;
  UnsubscribeUrl: string;
  TopicArn: string;
  Subject: string;
}


export const createInvoiceSchema = {
  type: 'object',
  required: ['invoiceNumber', 'dueDate', 'clientId', 'status'],
  properties: {
    invoiceNumber: { type: 'string' },
    dueDate: { type: 'string' },
    clientId: { type: 'string' },
    status: { type: 'string' },
  },
}

export const updateInvoiceSchema = {
  type: 'object',
  required: ['invoiceNumber', 'dueDate', 'status'],
  properties: {
    invoiceNumber: { type: 'string' },
    dueDate: { type: 'string', format: 'date' },
    status: { type: 'string' },
  },
}

export const createClientSchema = {
  type: 'object',
  required: ['name', 'email', 'address', 'phoneNumber'],
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
    address: { type: 'string' },
    phoneNumber: { type: 'string' },
  },
}

export const updateClientSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
  },
}

export const userSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
  },
}
